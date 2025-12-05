import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import {
  addToRetryQueue,
  isPermanentError,
  isRetryableError,
  resetSubscriptionFailures,
  incrementSubscriptionFailures,
  cancelPendingRetries,
  RETRY_CONFIG,
} from './notification-retry-service';

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

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
  data?: Record<string, unknown>;
  // Additional data for enhanced features
  booking_url?: string;
  badgeCount?: number;
  notification_id?: string;
  subscription_id?: string;
}

export interface SendOptions {
  targetUserIds?: string[];
  saveToHistory?: boolean;
  enableRetry?: boolean; // Enable retry queue for failed deliveries
  notificationQueueId?: string; // Link to notification queue for retry reference
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
  consecutive_failures?: number;
  last_delivery_status?: 'success' | 'failed' | 'pending';
}

class PushNotificationService {
  /**
   * Send push notification to specified users
   * Includes delivery tracking and optional retry queue integration
   */
  async sendNotification(
    payload: PushPayload,
    options: SendOptions = {}
  ): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    retried: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let sent = 0;
    let failed = 0;
    let retried = 0;
    const enableRetry = options.enableRetry ?? true; // Enable retry by default

    try {
      console.log('📤 [Push Service] Sending push notification:', {
        title: payload.title,
        targetUserIds: options.targetUserIds?.length || 'all',
        enableRetry
      });

      // Check VAPID keys
      if (!vapidPublicKey || !vapidPrivateKey) {
        const error = 'VAPID keys not configured';
        console.error('❌ [Push Service]', error);
        errors.push(error);
        return { success: false, sent: 0, failed: 0, retried: 0, errors };
      }

      // Get target subscriptions
      const subscriptions = await this.getActivePushSubscriptions(options.targetUserIds);

      if (subscriptions.length === 0) {
        console.warn('⚠️ [Push Service] No active subscriptions found');
        return { success: false, sent: 0, failed: 0, retried: 0, errors: ['No active subscriptions found'] };
      }

      console.log(`📱 [Push Service] Found ${subscriptions.length} active subscriptions`);

      // Build actions - include Book Now if booking_url is available
      const defaultActions = payload.booking_url
        ? [
            { action: 'book', title: '🗓 הזמן עכשיו' },
            { action: 'view', title: 'צפה בפרטים' },
            { action: 'dismiss', title: 'סגור' }
          ]
        : [
            { action: 'view', title: 'צפה בתור' },
            { action: 'dismiss', title: 'סגור' }
          ];

      // Prepare payload with proper structure for sw.js
      const notificationPayload = {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.png',
          badge: payload.badge || '/icons/icon-72x72.png',
          image: payload.image,
          tag: payload.tag || 'appointment-notification',
          requireInteraction: payload.requireInteraction !== false,
          actions: payload.actions || defaultActions,
          data: {
            ...payload.data,
            url: payload.url || '/',
            booking_url: payload.booking_url,
            notification_id: payload.notification_id,
            subscription_id: payload.subscription_id,
            timestamp: Date.now()
          }
        },
        badgeCount: payload.badgeCount ?? 1
      };

      const notificationPayloadStr = JSON.stringify(notificationPayload);

      // Send to each subscription with delivery tracking
      const sendPromises = subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          await webpush.sendNotification(pushSubscription, notificationPayloadStr);
          sent++;
          console.log(`✅ [Push Service] Push sent to ${sub.username} (${sub.device_type})`);

          // Update delivery status - success
          await resetSubscriptionFailures(sub.id);

        } catch (error: unknown) {
          const pushError = error as { statusCode?: number; message?: string };
          const errorMsg = `Failed to send to ${sub.username}: ${pushError.message || 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`❌ [Push Service] ${errorMsg}`);

          // Check error type
          const statusCode = pushError.statusCode || 0;

          if (isPermanentError(statusCode)) {
            // Subscription expired or gone - deactivate it
            console.log(`🗑️ [Push Service] Deactivating expired subscription for ${sub.username}`);
            await supabase
              .from('push_subscriptions')
              .update({
                is_active: false,
                last_delivery_status: 'failed',
                last_failure_reason: `Subscription gone (${statusCode})`,
              })
              .eq('id', sub.id);
            
            // Cancel any pending retries for this subscription
            await cancelPendingRetries(sub.id);
            failed++;
          } else if (enableRetry && isRetryableError(statusCode)) {
            // Add to retry queue for retryable errors
            console.log(`🔄 [Push Service] Adding to retry queue: ${sub.username}`);
            const retryResult = await addToRetryQueue(
              sub.id,
              sub.user_id || '',
              notificationPayload,
              pushError.message || 'Unknown error',
              options.notificationQueueId
            );
            
            if (retryResult.success) {
              retried++;
            } else {
              failed++;
              // Update failure tracking
              await incrementSubscriptionFailures(sub.id, pushError.message || 'Unknown error');
            }
          } else {
            // Non-retryable error
            failed++;
            await incrementSubscriptionFailures(sub.id, pushError.message || 'Unknown error');
          }
        }
      });

      // Wait for all sends
      await Promise.allSettled(sendPromises);

      console.log(`📊 [Push Service] Results: ${sent} sent, ${failed} failed, ${retried} queued for retry`);

      return {
        success: sent > 0,
        sent,
        failed,
        retried,
        errors
      };
    } catch (error) {
      console.error('❌ [Push Service] Push notification service error:', error);
      return {
        success: false,
        sent,
        failed,
        retried,
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
   * Save push subscription (requires authentication)
   */
  async savePushSubscription(data: {
    userId: string;  // ✅ Required - no anonymous subscriptions
    username: string;
    email: string;  // ✅ Required - from authenticated user
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
    deviceType: 'ios' | 'android' | 'desktop';
    userAgent: string;
  }): Promise<{ subscriptionId: string }> {
    try {
      console.log(`💾 [Push Service] Saving subscription for user ${data.userId} (${data.username}, ${data.deviceType})`);

      const { data: existing } = await supabase
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
            last_used: new Date().toISOString(),
            // Reset failure tracking on re-subscribe
            consecutive_failures: 0,
            last_delivery_status: 'pending',
            last_failure_reason: null,
          })
          .eq('endpoint', data.subscription.endpoint);

        if (error) throw error;
        console.log('✅ [Push Service] Subscription updated for user', data.userId);
        return { subscriptionId: existing.id };
      } else {
        // Insert new subscription
        const { data: newSub, error } = await supabase
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
            last_used: new Date().toISOString(),
            consecutive_failures: 0,
            last_delivery_status: 'pending',
          })
          .select('id')
          .single();

        if (error) throw error;
        console.log('✅ [Push Service] New subscription created for user', data.userId);
        return { subscriptionId: newSub.id };
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
    retried: number;
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
    retried: number;
    errors: string[];
  }> {
    return this.sendToUser(userId, {
      title: '🔔 ברוך הבא!',
      body: `שלום ${username}, התראות Push פעילות!`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      url: '/',
      tag: 'welcome-test',
      requireInteraction: true,
      badgeCount: 1,
    });
  }

  /**
   * Get subscription health status for a user
   */
  async getSubscriptionHealth(userId: string): Promise<{
    total: number;
    healthy: number;
    degraded: number;
    failing: number;
  }> {
    try {
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('id, consecutive_failures, last_delivery_status')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!subscriptions || subscriptions.length === 0) {
        return { total: 0, healthy: 0, degraded: 0, failing: 0 };
      }

      let healthy = 0;
      let degraded = 0;
      let failing = 0;

      for (const sub of subscriptions) {
        const failures = sub.consecutive_failures || 0;
        if (failures === 0) {
          healthy++;
        } else if (failures < RETRY_CONFIG.maxConsecutiveFailures) {
          degraded++;
        } else {
          failing++;
        }
      }

      return {
        total: subscriptions.length,
        healthy,
        degraded,
        failing,
      };
    } catch (error) {
      console.error('❌ [Push Service] Error getting subscription health:', error);
      return { total: 0, healthy: 0, degraded: 0, failing: 0 };
    }
  }

  /**
   * Deactivate subscription by ID
   */
  async deactivateSubscription(subscriptionId: string): Promise<void> {
    try {
      await supabase
        .from('push_subscriptions')
        .update({
          is_active: false,
          last_delivery_status: 'failed',
          last_failure_reason: 'Manually deactivated',
        })
        .eq('id', subscriptionId);

      // Cancel any pending retries
      await cancelPendingRetries(subscriptionId);
      
      console.log(`🗑️ [Push Service] Subscription ${subscriptionId} deactivated`);
    } catch (error) {
      console.error('❌ [Push Service] Error deactivating subscription:', error);
      throw error;
    }
  }
}

export const pushService = new PushNotificationService();

