import nodemailer from 'nodemailer'
import { generateNotificationEmail, generateSubscriptionConfirmationEmail } from './email-templates'

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
})

interface NotificationEmailData {
  to: string
  date: string
  dayName: string
  times: string[]
  subscriptionId: string
}

interface SubscriptionEmailData {
  to: string
  subscriptionId: string
  subscriptionDate?: string
  dateRangeStart?: string
  dateRangeEnd?: string
}

export async function sendNotificationEmail(data: NotificationEmailData): Promise<boolean> {
  try {
    const { to, date, dayName, times, subscriptionId } = data
    
    // Generate email content
    const { html, text } = generateNotificationEmail({
      date,
      dayName,
      times,
      subscriptionId
    })
    
    // Send email
    const info = await transporter.sendMail({
      from: `"Tor-Ramel" <${process.env.EMAIL_SENDER}>`,
      to,
      subject: `תורים פנויים - ${dayName} ${date}`,
      text,
      html
    })
    
    console.log('Email sent:', info.messageId)
    return true
  } catch (error) {
    console.error('Error sending notification email:', error)
    return false
  }
}

export async function sendSubscriptionConfirmationEmail(data: SubscriptionEmailData): Promise<boolean> {
  try {
    const { to, subscriptionId, subscriptionDate, dateRangeStart, dateRangeEnd } = data
    
    // Generate email content
    const { html, text } = generateSubscriptionConfirmationEmail({
      email: to,
      subscriptionId,
      subscriptionDate,
      dateRangeStart,
      dateRangeEnd
    })
    
    // Format subject based on date type
    let subject = 'אישור הרשמה להתראות - תור רם-אל'
    if (subscriptionDate) {
      const date = new Date(subscriptionDate + 'T00:00:00')
      subject = `אישור הרשמה - ${date.toLocaleDateString('he-IL')}`
    } else if (dateRangeStart && dateRangeEnd) {
      subject = `אישור הרשמה - ${dateRangeStart} עד ${dateRangeEnd}`
    }
    
    // Send email
    const info = await transporter.sendMail({
      from: `"Tor-Ramel" <${process.env.EMAIL_SENDER}>`,
      to,
      subject,
      text,
      html
    })
    
    console.log('Subscription confirmation email sent:', info.messageId)
    return true
  } catch (error) {
    console.error('Error sending subscription confirmation email:', error)
    return false
  }
}

export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  try {
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>קוד אימות - תור רם-אל</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      line-height: 1.6;
      color: #000000;
      background-color: #ffffff;
      direction: rtl;
      -webkit-font-smoothing: antialiased;
    }
    
    .container {
      max-width: 480px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .logo {
      display: inline-block;
      width: 56px;
      height: 56px;
      margin-bottom: 24px;
    }
    
    .logo img {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: block;
    }
    
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #000000;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    
    .subtitle {
      font-size: 16px;
      color: #666666;
    }
    
    .content {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .message {
      font-size: 16px;
      color: #333333;
      margin-bottom: 32px;
    }
    
    .otp-container {
      background-color: #f5f5f5;
      border: 2px dashed #000000;
      border-radius: 12px;
      padding: 24px;
      margin: 0 auto 32px;
      max-width: 280px;
    }
    
    .otp-code {
      font-size: 40px;
      font-weight: 700;
      letter-spacing: 12px;
      color: #000000;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    }
    
    .validity {
      font-size: 14px;
      color: #666666;
      margin-bottom: 24px;
    }
    
    .security-note {
      font-size: 14px;
      color: #999999;
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 8px;
    }
    
    .footer {
      text-align: center;
      font-size: 14px;
      color: #999999;
      padding-top: 32px;
      border-top: 1px solid #e5e5e5;
    }
    
    @media only screen and (max-width: 600px) {
      .container {
        padding: 32px 16px;
      }
      
      .otp-code {
        font-size: 32px;
        letter-spacing: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'}/icons/icon-128x128.png" alt="תור רם-אל" width="56" height="56" style="border-radius: 12px;">
      </div>
      <h1>קוד אימות</h1>
      <p class="subtitle">תור רם-אל</p>
    </div>
    
    <div class="content">
      <p class="message">הזן את הקוד הבא כדי להתחבר:</p>
      
      <div class="otp-container">
        <div class="otp-code">${otp}</div>
      </div>
      
      <p class="validity">הקוד תקף ל-10 דקות</p>
      
      <div class="security-note">
        אם לא ביקשת קוד זה, אנא התעלם מהודעה זו
      </div>
    </div>
    
    <div class="footer">
      <p>© 2025 תור רם-אל</p>
    </div>
  </div>
</body>
</html>
    `
    
    const text = `
קוד אימות - תור רם-אל

הקוד שלך: ${otp}

הקוד תקף ל-10 דקות בלבד.

אם לא ביקשת קוד זה, אנא התעלם מהודעה זו.

© 2025 תור רם-אל
    `
    
    const info = await transporter.sendMail({
      from: `"Tor-Ramel" <${process.env.EMAIL_SENDER}>`,
      to: email,
      subject: `קוד אימות - תור רם-אל`,
      text,
      html
    })
    
    console.log('OTP email sent:', info.messageId)
    return true
  } catch (error) {
    console.error('Error sending OTP email:', error)
    return false
  }
} 