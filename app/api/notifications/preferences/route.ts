import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: NextRequest) {
  try {
    // Authentication required
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ [Preferences API] No authorization header');
      return NextResponse.json({
        error: 'Authentication required',
        success: false
      }, { status: 401 });
    }

    let userId: string;
    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = await verifyToken(token);
      if (!payload) {
        throw new Error('Invalid token');
      }
      userId = payload.userId;
      console.log(`🔐 [Preferences API] Authenticated user: ${payload.email}`);
    } catch (error) {
      console.error('❌ [Preferences API] Invalid token');
      return NextResponse.json({
        error: 'Invalid authentication token',
        success: false
      }, { status: 401 });
    }

    const { notification_method } = await request.json();

    // Validate notification method
    if (!['email', 'push', 'both'].includes(notification_method)) {
      console.error('❌ [Preferences API] Invalid notification method:', notification_method);
      return NextResponse.json({
        error: 'Invalid notification method. Must be: email, push, or both',
        success: false
      }, { status: 400 });
    }

    console.log(`📝 [Preferences API] Updating notification method to: ${notification_method} for user: ${userId}`);

    // Update all active subscriptions for this user
    const { error } = await supabase
      .from('notification_subscriptions')
      .update({ notification_method })
      .eq('user_id', userId)
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

