import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Update all active subscriptions for this user
    const { error } = await supabase
      .from('notification_subscriptions')
      .update({ notification_method })
      .eq('user_id', user.userId)
      .eq('is_active', true);

    if (error) {
      console.error('❌ [Preferences API] Database error:', error);
      throw error;
    }

    console.log(`✅ [Preferences API] Notification preferences updated successfully`);

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully',
      notification_method
    });
  } catch (error) {
    console.error('❌ [Preferences API] Error:', error);
    return NextResponse.json({
      error: 'Failed to update notification preferences',
      success: false
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
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

    // Get the most recent active subscription to determine notification method
    const { data: subscription, error } = await supabase
      .from('notification_subscriptions')
      .select('notification_method')
      .eq('user_id', user.userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ [Preferences API GET] Database error:', error);
      throw error;
    }

    const notification_method = subscription?.notification_method || 'email';
    
    console.log(`✅ [Preferences API GET] Current preference: ${notification_method}`);

    return NextResponse.json({
      success: true,
      notification_method
    });
  } catch (error) {
    console.error('❌ [Preferences API GET] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch notification preferences',
      success: false
    }, { status: 500 });
  }
}
