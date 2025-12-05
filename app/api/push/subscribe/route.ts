import { NextRequest, NextResponse } from 'next/server';
import { pushService } from '@/lib/push-notification-service';
import { verifyToken } from '@/lib/auth/jwt';
import { ensureUserPreferences } from '@/lib/user-preferences';

export async function POST(request: NextRequest) {
  try {
    // ✅ AUTHENTICATION REQUIRED - Support both Bearer token and cookies
    let userId: string;
    let userEmail: string;
    
    // Try Bearer token first
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      console.log('🔐 [Push Subscribe API] Using Bearer token authentication');
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = await verifyToken(token);
        if (!payload) {
          throw new Error('Invalid token');
        }
        userId = payload.userId;
        userEmail = payload.email;
        console.log(`✅ [Push Subscribe API] Authenticated via Bearer token: ${userEmail}`);
      } catch (error) {
        console.error('❌ [Push Subscribe API] Invalid Bearer token:', error);
        return NextResponse.json({
          error: 'Invalid authentication token',
          success: false,
          requiresAuth: true
        }, { status: 401 });
      }
    } else {
      // Fallback to cookie-based auth
      console.log('🔐 [Push Subscribe API] Using cookie authentication');
      const { getCurrentUser } = await import('@/lib/auth/jwt');
      const user = await getCurrentUser();
      
      if (!user) {
        console.error('❌ [Push Subscribe API] No authentication found - neither Bearer token nor cookies');
        return NextResponse.json({
          error: 'Authentication required for push notifications',
          success: false,
          requiresAuth: true
        }, { status: 401 });
      }
      
      userId = user.userId;
      userEmail = user.email;
      console.log(`✅ [Push Subscribe API] Authenticated via cookies: ${userEmail}`);
    }

    // Parse subscription data
    const body = await request.json();
    const { subscription, userName } = body;

    if (!subscription || !subscription.endpoint) {
      console.error('❌ [Push Subscribe API] Invalid subscription data');
      return NextResponse.json({ 
        error: 'Invalid subscription data',
        success: false
      }, { status: 400 });
    }

    // Detect device type
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /android/i.test(userAgent);
    
    let deviceType: 'ios' | 'android' | 'desktop' = 'desktop';
    if (isIOS) deviceType = 'ios';
    else if (isAndroid) deviceType = 'android';

    // User data from authenticated user
    const username = userName || userEmail || 'משתמש';

    console.log(`📱 [Push Subscribe API] Subscription request from ${username} (${deviceType})`);

    // Save subscription (user is authenticated)
    const { subscriptionId } = await pushService.savePushSubscription({
      userId,
      username,
      email: userEmail,
      subscription,
      deviceType,
      userAgent
    });

    // Ensure user preferences exist (non-blocking)
    ensureUserPreferences(userId).catch(err => 
      console.error('[Push Subscribe API] Failed to ensure user preferences:', err)
    );

    // Send welcome notification
    try {
      console.log(`📧 [Push Subscribe API] Sending welcome notification to ${username}`);
      const testResult = await pushService.sendTestNotification(userId, username);
      console.log(`✅ [Push Subscribe API] Welcome notification sent: ${testResult.sent} sent, ${testResult.failed} failed`);
    } catch (error) {
      console.error('❌ [Push Subscribe API] Failed to send welcome notification:', error);
      // Don't fail the subscription if welcome notification fails
    }

    console.log(`✅ [Push Subscribe API] Subscription saved successfully for ${username}`);

    return NextResponse.json({ 
      success: true,
      message: 'Subscription saved successfully',
      deviceType,
      userId
    });
  } catch (error) {
    console.error('❌ [Push Subscribe API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save subscription',
        success: false
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = await verifyToken(token);
        if (payload) {
          userId = payload.userId;
        }
      } catch (error) {
        console.log('⚠️ [Push Unsubscribe API] Invalid token');
      }
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      console.error('❌ [Push Unsubscribe API] No endpoint provided');
      return NextResponse.json({ 
        error: 'No endpoint provided',
        success: false
      }, { status: 400 });
    }

    console.log(`🗑️ [Push Unsubscribe API] Removing subscription`);

    await pushService.removePushSubscription(endpoint, userId);

    console.log(`✅ [Push Unsubscribe API] Subscription removed successfully`);

    return NextResponse.json({ 
      success: true,
      message: 'Subscription removed successfully'
    });
  } catch (error) {
    console.error('❌ [Push Unsubscribe API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to remove subscription',
        success: false
      },
      { status: 500 }
    );
  }
}

