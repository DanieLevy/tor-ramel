import { NextRequest, NextResponse } from 'next/server';
import { pushService } from '@/lib/push-notification-service';
import { getCurrentUser } from '@/lib/auth/jwt';

export async function POST(_request: NextRequest) {
  try {
    // Get user from JWT token in cookies
    const user = await getCurrentUser();
    
    if (!user) {
      console.error('❌ [Test Push API] No authenticated user');
      return NextResponse.json({
        error: 'Authentication required',
        success: false
      }, { status: 401 });
    }

    console.log(`🧪 [Test Push API] Sending test notification to user: ${user.email}`);

    // Send test notification
    const result = await pushService.sendTestNotification(user.userId, user.email);

    if (result.success && result.sent > 0) {
      console.log(`✅ [Test Push API] Test notification sent successfully`);
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully',
        sent: result.sent,
        failed: result.failed
      });
    } else {
      console.error(`❌ [Test Push API] Failed to send test notification:`, result.errors);
      return NextResponse.json({
        success: false,
        error: 'Failed to send test notification',
        details: result.errors,
        sent: result.sent,
        failed: result.failed
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ [Test Push API] Error:', error);
    return NextResponse.json({
      error: 'Failed to send test notification',
      success: false,
      details: (error as Error).message
    }, { status: 500 });
  }
}

