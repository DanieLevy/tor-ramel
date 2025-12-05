import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { createClient } from '@supabase/supabase-js';

// Use consistent env var naming
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Default notification method for users without subscriptions
const DEFAULT_NOTIFICATION_METHOD = 'email';

export async function PUT(request: NextRequest) {
  try {
    // Get user from JWT token in cookies
    const user = await getCurrentUser();
    
    if (!user) {
      console.error('❌ [Preferences API] No authenticated user');
      return NextResponse.json({
        error: 'Authentication required',
        success: false
      }, { status: 401 });
    }

    console.log(`🔐 [Preferences API] Authenticated user: ${user.email} (${user.userId})`);

    const { notification_method } = await request.json();

    // Validate notification method
    if (!['email', 'push', 'both'].includes(notification_method)) {
      console.error('❌ [Preferences API] Invalid notification method:', notification_method);
      return NextResponse.json({
        error: 'Invalid notification method. Must be: email, push, or both',
        success: false
      }, { status: 400 });
    }

    console.log(`📝 [Preferences API] Updating notification method to: ${notification_method} for user: ${user.userId}`);

    // ALWAYS store the preference in user_preferences as the source of truth
    const { error: upsertError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.userId,
        default_notification_method: notification_method,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('❌ [Preferences API] Error saving to user_preferences:', upsertError);
      throw upsertError;
    }
    
    console.log(`✅ [Preferences API] Preference stored in user_preferences`);

    // Also update any existing active subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from('notification_subscriptions')
      .select('id')
      .eq('user_id', user.userId)
      .eq('is_active', true);

    if (fetchError) {
      console.warn('⚠️ [Preferences API] Error fetching subscriptions:', fetchError);
      // Continue - the main preference is saved
    }

    let updatedCount = 0;

    if (subscriptions && subscriptions.length > 0) {
      // Update all active subscriptions for this user
      const { error: updateError } = await supabase
        .from('notification_subscriptions')
        .update({ 
          notification_method,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.userId)
        .eq('is_active', true);

      if (updateError) {
        console.warn('⚠️ [Preferences API] Error updating subscriptions:', updateError);
        // Continue - the main preference is saved
      } else {
        updatedCount = subscriptions.length;
        console.log(`✅ [Preferences API] Updated ${updatedCount} subscription(s)`);
      }
    }

    return NextResponse.json({
      success: true,
      message: updatedCount > 0 
        ? `Notification preferences updated (${updatedCount} subscription(s) synced)`
        : 'Notification preferences saved',
      notification_method,
      subscriptions_updated: updatedCount
    });
  } catch (error) {
    console.error('❌ [Preferences API] Error:', error);
    return NextResponse.json({
      error: 'Failed to update notification preferences',
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

    let notification_method = DEFAULT_NOTIFICATION_METHOD;
    let has_subscriptions = false;

    // First, check user_preferences for the saved preference (source of truth)
    const { data: userPrefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('default_notification_method')
      .eq('user_id', user.userId)
      .limit(1);

    if (prefsError) {
      console.warn('⚠️ [Preferences API GET] Error fetching user_preferences:', prefsError);
    } else if (userPrefs && userPrefs.length > 0 && userPrefs[0].default_notification_method) {
      notification_method = userPrefs[0].default_notification_method;
      console.log(`📋 [Preferences API GET] Got preference from user_preferences: ${notification_method}`);
    }

    // Also check if user has active subscriptions (for UI feedback)
    const { data: subscriptions, error: subsError } = await supabase
      .from('notification_subscriptions')
      .select('id, notification_method')
      .eq('user_id', user.userId)
      .eq('is_active', true)
      .limit(1);

    if (subsError) {
      console.warn('⚠️ [Preferences API GET] Error fetching subscriptions:', subsError);
    } else if (subscriptions && subscriptions.length > 0) {
      has_subscriptions = true;
      // If no user_preferences record exists yet, use subscription's method
      if (!userPrefs || userPrefs.length === 0 || !userPrefs[0].default_notification_method) {
        notification_method = subscriptions[0].notification_method || DEFAULT_NOTIFICATION_METHOD;
        console.log(`📋 [Preferences API GET] Got preference from subscription: ${notification_method}`);
      }
    }
    
    console.log(`✅ [Preferences API GET] Returning: ${notification_method}, has_subscriptions: ${has_subscriptions}`);

    return NextResponse.json({
      success: true,
      notification_method,
      has_subscriptions
    });
  } catch (error) {
    console.error('❌ [Preferences API GET] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch notification preferences',
      success: false
    }, { status: 500 });
  }
}
