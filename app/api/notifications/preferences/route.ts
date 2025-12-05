import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { createClient } from '@supabase/supabase-js';

// Use consistent env var naming
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Default preferences
// IMPORTANT: quiet_hours should be null by default - users must explicitly set them
// NOTE: preferred_delivery_start/end removed - notifications are immediate except during quiet hours
const DEFAULT_PREFERENCES = {
  default_notification_method: 'email',
  // Notification types
  hot_alerts_enabled: true,
  weekly_digest_enabled: true,
  expiry_reminders_enabled: true,
  inactivity_alerts_enabled: true,
  proactive_notifications_enabled: true,
  // Frequency control
  max_notifications_per_day: 10,
  notification_cooldown_minutes: 30,
  batch_notifications: false,
  batch_interval_hours: 4,
  // Quiet hours only - no preferred delivery window (notifications are immediate)
  quiet_hours_start: null as string | null,  // No default - user must explicitly set
  quiet_hours_end: null as string | null,    // No default - user must explicitly set
  notification_cooldown_hours: 4,
};

// Validation helpers
const isValidNotificationMethod = (method: string): boolean => {
  return ['email', 'push', 'both'].includes(method);
};

const isValidTimeString = (time: string): boolean => {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
};

const isValidInteger = (value: unknown, min: number, max: number): boolean => {
  if (typeof value !== 'number') return false;
  return Number.isInteger(value) && value >= min && value <= max;
};

const isValidBoolean = (value: unknown): boolean => {
  return typeof value === 'boolean';
};

interface UserPreferences {
  default_notification_method: string;
  hot_alerts_enabled: boolean;
  weekly_digest_enabled: boolean;
  expiry_reminders_enabled: boolean;
  inactivity_alerts_enabled: boolean;
  proactive_notifications_enabled: boolean;
  max_notifications_per_day: number;
  notification_cooldown_minutes: number;
  batch_notifications: boolean;
  batch_interval_hours: number;
  quiet_hours_start: string | null;  // null = not set (no quiet hours)
  quiet_hours_end: string | null;    // null = not set (no quiet hours)
  notification_cooldown_hours: number;
}

export async function PUT(request: NextRequest) {
  try {
    // Get user from JWT token in cookies
    const user = await getCurrentUser();
    
    if (!user) {
      console.error('❌ [Preferences API PUT] No authenticated user');
      return NextResponse.json({
        error: 'Authentication required',
        success: false
      }, { status: 401 });
    }

    console.log(`🔐 [Preferences API PUT] Authenticated user: ${user.email} (${user.userId})`);

    const body = await request.json();
    const errors: string[] = [];
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    // Validate and add each field if provided
    
    // Notification method
    if (body.notification_method !== undefined) {
      if (isValidNotificationMethod(body.notification_method)) {
        updateData.default_notification_method = body.notification_method;
      } else {
        errors.push('notification_method must be: email, push, or both');
      }
    }

    // Notification type toggles
    const booleanFields = [
      'hot_alerts_enabled',
      'weekly_digest_enabled',
      'expiry_reminders_enabled',
      'inactivity_alerts_enabled',
      'proactive_notifications_enabled',
      'batch_notifications'
    ];

    for (const field of booleanFields) {
      if (body[field] !== undefined) {
        if (isValidBoolean(body[field])) {
          updateData[field] = body[field];
        } else {
          errors.push(`${field} must be a boolean`);
        }
      }
    }

    // Integer fields with ranges
    const integerFields = [
      { name: 'max_notifications_per_day', min: 0, max: 100 },
      { name: 'notification_cooldown_minutes', min: 0, max: 1440 },
      { name: 'batch_interval_hours', min: 1, max: 24 },
      { name: 'notification_cooldown_hours', min: 0, max: 48 }
    ];

    for (const { name, min, max } of integerFields) {
      if (body[name] !== undefined) {
        if (isValidInteger(body[name], min, max)) {
          updateData[name] = body[name];
        } else {
          errors.push(`${name} must be an integer between ${min} and ${max}`);
        }
      }
    }

    // Time fields
    const timeFields = [
      'preferred_delivery_start',
      'preferred_delivery_end',
      'quiet_hours_start',
      'quiet_hours_end'
    ];

    for (const field of timeFields) {
      if (body[field] !== undefined) {
        if (body[field] === null || isValidTimeString(body[field])) {
          updateData[field] = body[field];
        } else {
          errors.push(`${field} must be in HH:MM format`);
        }
      }
    }

    // Return validation errors if any
    if (errors.length > 0) {
      console.error('❌ [Preferences API PUT] Validation errors:', errors);
      return NextResponse.json({
        error: 'Validation failed',
        errors,
        success: false
      }, { status: 400 });
    }

    // If no valid fields to update, return error
    if (Object.keys(updateData).length === 1) { // Only updated_at
      return NextResponse.json({
        error: 'No valid fields to update',
        success: false
      }, { status: 400 });
    }

    console.log(`📝 [Preferences API PUT] Updating preferences:`, Object.keys(updateData).filter(k => k !== 'updated_at'));

    // Upsert preferences - use user_id as the key
    const { error: upsertError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.userId,
        ...updateData
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('❌ [Preferences API PUT] Error saving preferences:', upsertError);
      throw upsertError;
    }

    console.log(`✅ [Preferences API PUT] Preferences saved successfully`);

    // If notification method was updated, sync to active subscriptions
    let subscriptionsUpdated = 0;
    if (updateData.default_notification_method) {
      const { data: subscriptions, error: subsFetchError } = await supabase
        .from('notification_subscriptions')
        .select('id')
        .eq('user_id', user.userId)
        .eq('is_active', true);

      if (!subsFetchError && subscriptions && subscriptions.length > 0) {
        const { error: subsUpdateError } = await supabase
          .from('notification_subscriptions')
          .update({ 
            notification_method: updateData.default_notification_method,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.userId)
          .eq('is_active', true);

        if (!subsUpdateError) {
          subscriptionsUpdated = subscriptions.length;
          console.log(`✅ [Preferences API PUT] Synced notification method to ${subscriptionsUpdated} subscription(s)`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      updated_fields: Object.keys(updateData).filter(k => k !== 'updated_at'),
      subscriptions_synced: subscriptionsUpdated
    });
  } catch (error) {
    console.error('❌ [Preferences API PUT] Error:', error);
    return NextResponse.json({
      error: 'Failed to update preferences',
      success: false
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get user from JWT token in cookies
    const user = await getCurrentUser();
    
    if (!user) {
      console.error('❌ [Preferences API GET] No authenticated user');
      return NextResponse.json({
        error: 'Authentication required',
        success: false
      }, { status: 401 });
    }

    console.log(`🔐 [Preferences API GET] Authenticated user: ${user.email} (${user.userId})`);

    // Fetch user preferences
    const { data: userPrefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.userId)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.warn('⚠️ [Preferences API GET] Error fetching user_preferences:', prefsError);
    }

    // Check if user has active subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('notification_subscriptions')
      .select('id, notification_method')
      .eq('user_id', user.userId)
      .eq('is_active', true)
      .limit(1);

    if (subsError) {
      console.warn('⚠️ [Preferences API GET] Error fetching subscriptions:', subsError);
    }

    const hasSubscriptions = subscriptions && subscriptions.length > 0;

    // Build response with defaults for missing values
    const preferences: UserPreferences = {
      default_notification_method: userPrefs?.default_notification_method || 
        (hasSubscriptions ? subscriptions[0].notification_method : DEFAULT_PREFERENCES.default_notification_method),
      // Notification types
      hot_alerts_enabled: userPrefs?.hot_alerts_enabled ?? DEFAULT_PREFERENCES.hot_alerts_enabled,
      weekly_digest_enabled: userPrefs?.weekly_digest_enabled ?? DEFAULT_PREFERENCES.weekly_digest_enabled,
      expiry_reminders_enabled: userPrefs?.expiry_reminders_enabled ?? DEFAULT_PREFERENCES.expiry_reminders_enabled,
      inactivity_alerts_enabled: userPrefs?.inactivity_alerts_enabled ?? DEFAULT_PREFERENCES.inactivity_alerts_enabled,
      proactive_notifications_enabled: userPrefs?.proactive_notifications_enabled ?? DEFAULT_PREFERENCES.proactive_notifications_enabled,
      // Frequency control
      max_notifications_per_day: userPrefs?.max_notifications_per_day ?? DEFAULT_PREFERENCES.max_notifications_per_day,
      notification_cooldown_minutes: userPrefs?.notification_cooldown_minutes ?? DEFAULT_PREFERENCES.notification_cooldown_minutes,
      batch_notifications: userPrefs?.batch_notifications ?? DEFAULT_PREFERENCES.batch_notifications,
      batch_interval_hours: userPrefs?.batch_interval_hours ?? DEFAULT_PREFERENCES.batch_interval_hours,
      // Quiet hours only (no preferred delivery window)
      quiet_hours_start: userPrefs?.quiet_hours_start ?? DEFAULT_PREFERENCES.quiet_hours_start,
      quiet_hours_end: userPrefs?.quiet_hours_end ?? DEFAULT_PREFERENCES.quiet_hours_end,
      notification_cooldown_hours: userPrefs?.notification_cooldown_hours ?? DEFAULT_PREFERENCES.notification_cooldown_hours,
    };

    console.log(`✅ [Preferences API GET] Returning preferences for ${user.email}`);

    return NextResponse.json({
      success: true,
      preferences,
      has_subscriptions: hasSubscriptions,
      // Legacy support - also return notification_method at top level
      notification_method: preferences.default_notification_method
    });
  } catch (error) {
    console.error('❌ [Preferences API GET] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch preferences',
      success: false
    }, { status: 500 });
  }
}
