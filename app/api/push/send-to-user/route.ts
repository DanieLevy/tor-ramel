import { NextRequest, NextResponse } from 'next/server';
import { pushService } from '@/lib/push-notification-service';

export async function POST(request: NextRequest) {
  console.log('📱 [Send-To-User API] Received request');
  
  try {
    const body = await request.json();
    const { userId, title, body: messageBody, url, tag, requireInteraction } = body;

    if (!userId || !title || !messageBody) {
      console.error('❌ [Send-To-User API] Missing required fields');
      return NextResponse.json({
        error: 'Missing required fields: userId, title, body',
        success: false
      }, { status: 400 });
    }

    console.log(`📤 [Send-To-User API] Sending push to user ${userId}: ${title}`);

    const result = await pushService.sendToUser(userId, {
      title,
      body: messageBody,
      url: url || '/',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: tag || 'default',
      requireInteraction: requireInteraction || false
    });

    if (!result.success) {
      console.error('❌ [Send-To-User API] Failed to send:', result.errors);
      return NextResponse.json({
        success: false,
        error: 'Failed to send push notification',
        details: result.errors,
        sent: result.sent,
        failed: result.failed
      }, { status: 500 });
    }

    console.log(`✅ [Send-To-User API] Push sent successfully: ${result.sent} sent, ${result.failed} failed`);

    return NextResponse.json({
      success: true,
      message: 'Push notification sent successfully',
      sent: result.sent,
      failed: result.failed
    });
  } catch (error) {
    console.error('❌ [Send-To-User API] Unexpected error:', error);
    console.error('   Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('   Error message:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({
      error: 'Failed to send push notification',
      details: error instanceof Error ? error.message : String(error),
      success: false
    }, { status: 500 });
  }
}

