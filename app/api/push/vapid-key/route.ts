import { NextRequest, NextResponse } from 'next/server';
import { pushService } from '@/lib/push-notification-service';

export async function GET(request: NextRequest) {
  console.log('🔑 [VAPID Key API] GET request received');
  
  try {
    console.log('📦 [VAPID Key API] Attempting to get public key from pushService...');
    const publicKey = pushService.getPublicKey();
    console.log('📊 [VAPID Key API] Public key result:', publicKey ? `${publicKey.substring(0, 20)}...` : 'NULL');

    if (!publicKey) {
      console.error('❌ [VAPID Key API] VAPID keys not configured - public key is null/undefined');
      console.error('🔍 [VAPID Key API] Check environment variables:');
      console.error('   NEXT_PUBLIC_VAPID_PUBLIC_KEY:', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'SET' : 'MISSING');
      console.error('   VAPID_PRIVATE_KEY:', process.env.VAPID_PRIVATE_KEY ? 'SET' : 'MISSING');
      return NextResponse.json({
        error: 'VAPID keys not configured',
        success: false
      }, { status: 500 });
    }

    console.log('✅ [VAPID Key API] Public key retrieved successfully, length:', publicKey.length);
    return NextResponse.json({
      success: true,
      publicKey
    });
  } catch (error) {
    console.error('❌ [VAPID Key API] Unexpected error:', error);
    console.error('   Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('   Error message:', error instanceof Error ? error.message : String(error));
    console.error('   Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({
      error: 'Failed to fetch VAPID key',
      details: error instanceof Error ? error.message : String(error),
      success: false
    }, { status: 500 });
  }
}

