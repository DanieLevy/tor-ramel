import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { createClient } from '@supabase/supabase-js';
import { pushService } from '@/lib/push-notification-service';
import nodemailer from 'nodemailer';

// Use consistent env var naming
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// Generate test email HTML
function generateTestEmailHtml(userName: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app';
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>התראת בדיקה - תור רם-אל</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      line-height: 1.6;
      color: #000000;
      background-color: #ffffff;
      direction: rtl;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e5e5e5;
    }
    .logo img {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 16px;
      color: #666666;
    }
    .success-box {
      background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
      border: 2px solid #22c55e;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      text-align: center;
    }
    .success-box h2 {
      color: #16a34a;
      font-size: 20px;
      margin-bottom: 8px;
    }
    .success-box p {
      color: #166534;
      font-size: 14px;
    }
    .button {
      display: block;
      width: 100%;
      padding: 16px 32px;
      text-align: center;
      text-decoration: none;
      font-size: 16px;
      font-weight: 500;
      border-radius: 8px;
      background-color: #000000;
      color: #ffffff !important;
      margin-top: 24px;
    }
    .footer {
      text-align: center;
      font-size: 14px;
      color: #999999;
      padding-top: 24px;
      border-top: 1px solid #e5e5e5;
      margin-top: 32px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <img src="${baseUrl}/icons/icon-128x128.png" alt="תור רם-אל" width="48" height="48">
      </div>
      <h1>🔔 התראת בדיקה</h1>
      <p class="subtitle">בדיקת מערכת ההתראות</p>
    </div>
    
    <div class="success-box">
      <h2>✅ התראת המייל פועלת!</h2>
      <p>שלום ${userName}! המייל הזה מאשר שהתראות המייל מוגדרות כראוי.</p>
    </div>
    
    <p style="text-align: center; color: #666; font-size: 14px;">
      נשלח בתאריך: ${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}
    </p>
    
    <a href="${baseUrl}/settings" class="button">חזרה להגדרות</a>
    
    <div class="footer">
      <p>© 2025 תור רם-אל</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Send test email
async function sendTestEmail(to: string, userName: string): Promise<boolean> {
  try {
    if (!process.env.EMAIL_SENDER || !process.env.EMAIL_APP_PASSWORD) {
      console.error('❌ [Test API] Email credentials not configured');
      return false;
    }
    
    const html = generateTestEmailHtml(userName);
    
    await transporter.sendMail({
      from: `"תור רם-אל" <${process.env.EMAIL_SENDER}>`,
      to,
      subject: '🔔 התראת בדיקה - תור רם-אל',
      html
    });
    
    console.log(`✅ [Test API] Test email sent to ${to}`);
    return true;
  } catch (error) {
    console.error(`❌ [Test API] Failed to send test email:`, error);
    return false;
  }
}

// Send test push notification
async function sendTestPush(userId: string, userName: string): Promise<{ sent: number; failed: number }> {
  try {
    const result = await pushService.sendNotification(
      {
        title: '🔔 התראת בדיקה',
        body: `שלום ${userName}! התראות Push פועלות בהצלחה ✅`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url: '/settings',
        tag: 'test-notification',
        requireInteraction: false,
        badgeCount: 0, // Don't set badge for test
      },
      { targetUserIds: [userId] }
    );
    
    console.log(`✅ [Test API] Test push result: ${result.sent} sent, ${result.failed} failed`);
    return { sent: result.sent, failed: result.failed };
  } catch (error) {
    console.error(`❌ [Test API] Failed to send test push:`, error);
    return { sent: 0, failed: 1 };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user from JWT token in cookies
    const user = await getCurrentUser();
    
    if (!user) {
      console.error('❌ [Test API] No authenticated user');
      return NextResponse.json({
        error: 'Authentication required',
        success: false
      }, { status: 401 });
    }

    console.log(`🔐 [Test API] Authenticated user: ${user.email} (${user.userId})`);

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const testType = body.type || 'both'; // 'email', 'push', or 'both'

    // Validate test type
    if (!['email', 'push', 'both'].includes(testType)) {
      return NextResponse.json({
        error: 'Invalid test type. Must be: email, push, or both',
        success: false
      }, { status: 400 });
    }

    console.log(`📧 [Test API] Sending test notification(s): ${testType}`);

    // Get user's name from database
    const { data: userData } = await supabase
      .from('users')
      .select('username, email')
      .eq('id', user.userId)
      .single();

    const userName = userData?.username || user.email?.split('@')[0] || 'משתמש';
    const userEmail = user.email;

    const results: {
      email?: { success: boolean; error?: string };
      push?: { success: boolean; sent?: number; failed?: number; error?: string };
    } = {};

    // Send email test
    if (testType === 'email' || testType === 'both') {
      try {
        const emailSuccess = await sendTestEmail(userEmail, userName);
        results.email = {
          success: emailSuccess,
          error: emailSuccess ? undefined : 'Failed to send email'
        };
      } catch (error) {
        results.email = {
          success: false,
          error: (error as Error).message
        };
      }
    }

    // Send push test
    if (testType === 'push' || testType === 'both') {
      try {
        const pushResult = await sendTestPush(user.userId, userName);
        results.push = {
          success: pushResult.sent > 0,
          sent: pushResult.sent,
          failed: pushResult.failed,
          error: pushResult.sent === 0 ? 'No active push subscriptions or delivery failed' : undefined
        };
      } catch (error) {
        results.push = {
          success: false,
          sent: 0,
          failed: 1,
          error: (error as Error).message
        };
      }
    }

    // Determine overall success
    const success = 
      (testType === 'email' && results.email?.success) ||
      (testType === 'push' && results.push?.success) ||
      (testType === 'both' && (results.email?.success || results.push?.success));

    console.log(`✅ [Test API] Test complete. Success: ${success}`, results);

    return NextResponse.json({
      success,
      test_type: testType,
      results,
      message: success 
        ? 'התראת בדיקה נשלחה בהצלחה!' 
        : 'שגיאה בשליחת התראת בדיקה'
    });
  } catch (error) {
    console.error('❌ [Test API] Error:', error);
    return NextResponse.json({
      error: 'Failed to send test notification',
      success: false
    }, { status: 500 });
  }
}

// GET endpoint to check test capability
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({
        error: 'Authentication required',
        success: false
      }, { status: 401 });
    }

    // Check email configuration
    const emailConfigured = !!(process.env.EMAIL_SENDER && process.env.EMAIL_APP_PASSWORD);

    // Check push configuration
    const pushConfigured = !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

    // Check if user has push subscriptions
    const { data: pushSubs } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.userId)
      .eq('is_active', true)
      .limit(1);

    const hasPushSubscription = pushSubs && pushSubs.length > 0;

    return NextResponse.json({
      success: true,
      capabilities: {
        email: {
          configured: emailConfigured,
          ready: emailConfigured
        },
        push: {
          configured: pushConfigured,
          has_subscription: hasPushSubscription,
          ready: pushConfigured && hasPushSubscription
        }
      }
    });
  } catch (error) {
    console.error('❌ [Test API GET] Error:', error);
    return NextResponse.json({
      error: 'Failed to check test capabilities',
      success: false
    }, { status: 500 });
  }
}
