import { NextRequest, NextResponse } from 'next/server';
import { pushService } from '@/lib/push-notification-service';
import { verifyToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // Authentication required
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ [Push Send API] No authorization header');
      return NextResponse.json({
        error: 'Authentication required',
        success: false
      }, { status: 401 });
    }

    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = await verifyToken(token);
      if (!payload) {
        throw new Error('Invalid token');
      }
      console.log(`🔐 [Push Send API] Authenticated user: ${payload.email}`);
    } catch (error) {
      console.error('❌ [Push Send API] Invalid token');
      return NextResponse.json({
        error: 'Invalid authentication token',
        success: false
      }, { status: 401 });
    }

    const {
      title,
      body,
      icon,
      image,
      url,
      targetUserIds,
      requireInteraction
    } = await request.json();

    // Validate
    if (!title || !body) {
      console.error('❌ [Push Send API] Title and body are required');
      return NextResponse.json({
        error: 'Title and body are required',
        success: false
      }, { status: 400 });
    }

    console.log(`📤 [Push Send API] Sending notification: "${title}"`);

    // Send notification
    const result = await pushService.sendNotification(
      {
        title,
        body,
        icon,
        image,
        url,
        requireInteraction: requireInteraction || false
      },
      {
        targetUserIds,
        saveToHistory: true
      }
    );

    console.log(`✅ [Push Send API] Notification sent: ${result.sent} sent, ${result.failed} failed`);

    return NextResponse.json({
      success: result.success,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
      message: result.success 
        ? `Notification sent to ${result.sent} devices`
        : 'Failed to send notification'
    });
  } catch (error) {
    console.error('❌ [Push Send API] Error:', error);
    return NextResponse.json({
      error: 'Failed to send push notification',
      success: false
    }, { status: 500 });
  }
}

