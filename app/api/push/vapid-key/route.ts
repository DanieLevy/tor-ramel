import { NextRequest, NextResponse } from 'next/server';
import { pushService } from '@/lib/push-notification-service';

export async function GET(request: NextRequest) {
  try {
    const publicKey = pushService.getPublicKey();

    if (!publicKey) {
      console.error('❌ [VAPID Key API] VAPID keys not configured');
      return NextResponse.json({
        error: 'VAPID keys not configured',
        success: false
      }, { status: 500 });
    }

    console.log('✅ [VAPID Key API] Public key retrieved successfully');
    return NextResponse.json({
      success: true,
      publicKey
    });
  } catch (error) {
    console.error('❌ [VAPID Key API] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch VAPID key',
      success: false
    }, { status: 500 });
  }
}

