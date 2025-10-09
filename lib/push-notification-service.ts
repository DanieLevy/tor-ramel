import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
    console.log('✅ VAPID keys configured successfully');
  } catch (error) {
    console.error('❌ Failed to configure VAPID keys:', error);
  }
} else {
  console.error('❌ VAPID keys missing - push notifications will not work');
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: any;
}

export interface SendOptions {
  targetUserIds?: string[];
  saveToHistory?: boolean;
}

export interface PushSubscription {
  id: string;
  user_id: string | null;
  username: string;
  email: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_type: string;
}

class PushNotificationService {
  /**
   * Send push notification to specified users
   */
  async sendNotification(
    payload: PushPayload,
    options: SendOptions = {}
  ): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let sent = 0;
    let failed = 0;

    try {
      console.log('📤 [Push Service] Sending push notification:', {
        title: payload.title,
        targetUserIds: options.targetUserIds?.length || 'all'
      });

      // Check VAPID keys
      if (!vapidPublicKey || !vapidPrivateKey) {
        const error = 'VAPID keys not configured';
        console.error('❌ [Push Service]', error);
        errors.push(error);
        return { success: false, sent: 0, failed: 0, errors };
      }

      // Get target subscriptions
      const subscriptions = await this.getActivePushSubscriptions(options.targetUserIds);

      if (subscriptions.length === 0) {
        console.warn('⚠️ [Push Service] No active subscriptions found');
        return { success: false, sent: 0, failed: 0, errors: ['No active subscriptions found'] };
      }

      console.log(`📱 [Push Service] Found ${subscriptions.length} active subscriptions`);

      // Prepare payload
      const notificationPayload = JSON.stringify({
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.png',
          badge: payload.badge || '/icons/icon-72x72.png',
          image: payload.image,
          tag: payload.tag || 'appointment-notification',
          requireInteraction: payload.requireInteraction || false,
          actions: payload.actions,
          data: {
            ...payload.data,
            url: payload.url || '/',
            timestamp: Date.now()
          }
        }
      });

      // Send to each subscription
      const sendPromises = subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          await webpush.sendNotification(pushSubscription, notificationPayload);
          sent++;
          console.log(`✅ [Push Service] Push sent to ${sub.username} (${sub.device_type})`);

          // Update last_used timestamp
          await supabase
            .from('push_subscriptions')
            .update({ last_used: new Date().toISOString() })
            .eq('id', sub.id);

        } catch (error: any) {
          failed++;
          const errorMsg = `Failed to send to ${sub.username}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`❌ [Push Service] ${errorMsg}`);

          // Handle subscription errors
          if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription expired or gone - remove it
            console.log(`🗑️ [Push Service] Removing expired subscription for ${sub.username}`);
            await this.removePushSubscription(sub.endpoint);
          }
        }
      });

      // Wait for all sends
      await Promise.allSettled(sendPromises);

      console.log(`📊 [Push Service] Results: ${sent} sent, ${failed} failed`);

      return {
        success: sent > 0,
        sent,
        failed,
        errors
      };
    } catch (error) {
      console.error('❌ [Push Service] Push notification service error:', error);
      return {
        success: false,
        sent,
        failed,
        errors: [...errors, (error as Error).message]
      };
    }
  }

  /**
   * Get active push subscriptions
   */
  async getActivePushSubscriptions(userIds?: string[]): Promise<PushSubscription[]> {
    try {
      let query = supabase
        .from('push_subscriptions')
        .select('*')
        .eq('is_active', true);

      if (userIds && userIds.length > 0) {
        query = query.in('user_id', userIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [Push Service] Error fetching subscriptions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ [Push Service] Get subscriptions error:', error);
      return [];
    }
  }

  /**
   * Save push subscription
   */
  async savePushSubscription(data: {
    userId: string | null;
    username: string;
    email: string | null;
    subscription: any;
    deviceType: 'ios' | 'android' | 'desktop';
    userAgent: string;
  }): Promise<void> {
    try {
      console.log(`💾 [Push Service] Saving subscription for ${data.username} (${data.deviceType})`);

      const { data: existing, error: checkError } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('endpoint', data.subscription.endpoint)
        .single();

      if (existing) {
        // Update existing subscription
        const { error } = await supabase
          .from('push_subscriptions')
          .update({
            user_id: data.userId,
            username: data.username,
            email: data.email,
            p256dh: data.subscription.keys.p256dh,
            auth: data.subscription.keys.auth,
            device_type: data.deviceType,
            user_agent: data.userAgent,
            is_active: true,
            last_used: new Date().toISOString()
          })
          .eq('endpoint', data.subscription.endpoint);

        if (error) throw error;
        console.log('✅ [Push Service] Subscription updated');
      } else {
        // Insert new subscription
        const { error } = await supabase
          .from('push_subscriptions')
          .insert({
            user_id: data.userId,
            username: data.username,
            email: data.email,
            endpoint: data.subscription.endpoint,
            p256dh: data.subscription.keys.p256dh,
            auth: data.subscription.keys.auth,
            device_type: data.deviceType,
            user_agent: data.userAgent,
            is_active: true,
            created_at: new Date().toISOString(),
            last_used: new Date().toISOString()
          });

        if (error) throw error;
        console.log('✅ [Push Service] New subscription created');
      }
    } catch (error) {
      console.error('❌ [Push Service] Save subscription error:', error);
      throw error;
    }
  }

  /**
   * Remove push subscription
   */
  async removePushSubscription(endpoint: string, userId?: string | null): Promise<void> {
    try {
      console.log(`🗑️ [Push Service] Removing subscription: ${endpoint.substring(0, 50)}...`);

      let query = supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);

      if (userId !== undefined) {
        if (userId === null) {
          query = query.is('user_id', null);
        } else {
          query = query.eq('user_id', userId);
        }
      }

      const { error } = await query;
      if (error) throw error;

      console.log('✅ [Push Service] Subscription removed');
    } catch (error) {
      console.error('❌ [Push Service] Remove subscription error:', error);
      throw error;
    }
  }

  /**
   * Get public VAPID key
   */
  getPublicKey(): string {
    // Clean key of formatting issues
    const cleanedKey = vapidPublicKey.trim().replace(/[\r\n\s]/g, '');
    return cleanedKey;
  }

  /**
   * Send push notification to specific user
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    return this.sendNotification(payload, { targetUserIds: [userId] });
  }

  /**
   * Send test notification
   */
  async sendTestNotification(userId: string, username: string): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    return this.sendToUser(userId, {
      title: '🔔 ברוך הבא!',
      body: `שלום ${username}, התראות Push פעילות!`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      url: '/',
      tag: 'welcome-test',
      requireInteraction: true
    });
  }
}

export const pushService = new PushNotificationService();

