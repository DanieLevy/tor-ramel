import { NextRequest, NextResponse } from 'next/server';
import { pushService } from '@/lib/push-notification-service';
import { verifyToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // Optional authentication - supports anonymous users
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    let userEmail: string | null = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = await verifyToken(token);
        if (payload) {
          userId = payload.userId;
          userEmail = payload.email;
        }
      } catch (error) {
        console.log('⚠️ [Push Subscribe API] Invalid token, continuing as anonymous');
      }
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

    // User data (anonymous or authenticated)
    const username = userName || 'משתמש אנונימי';

    console.log(`📱 [Push Subscribe API] Subscription request from ${username} (${deviceType})`);

    // Save subscription
    await pushService.savePushSubscription({
      userId,
      username,
      email: userEmail,
      subscription,
      deviceType,
      userAgent
    });

    // Send welcome notification (only for authenticated users)
    if (userId) {
      try {
        await pushService.sendTestNotification(userId, username);
      } catch (error) {
        console.error('❌ [Push Subscribe API] Failed to send welcome notification:', error);
        // Don't fail the subscription if welcome notification fails
      }
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

