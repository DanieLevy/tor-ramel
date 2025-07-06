import nodemailer from 'nodemailer'
import { generateNotificationEmail } from './email-templates'

// Create transporter
const transporter = nodemailer.createTransporter({
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
      from: `"תור רם-אל" <${process.env.EMAIL_SENDER}>`,
      to,
      subject: `🎉 נמצאו תורים פנויים - ${dayName} ${date}`,
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

export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  try {
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>קוד אימות - תור רם-אל</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      direction: rtl;
      margin: 0;
      padding: 0;
    }
    
    .email-wrapper {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    
    .content {
      padding: 40px 30px;
      text-align: center;
    }
    
    .otp-box {
      background-color: #f8f9fa;
      border: 2px dashed #667eea;
      border-radius: 8px;
      padding: 20px;
      margin: 30px 0;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 10px;
      color: #667eea;
    }
    
    .footer {
      padding: 20px;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>קוד אימות</h1>
    </div>
    
    <div class="content">
      <p>שלום,</p>
      <p>להלן קוד האימות שלך לכניסה לתור רם-אל:</p>
      
      <div class="otp-box">${otp}</div>
      
      <p>הקוד תקף ל-10 דקות בלבד.</p>
      <p>אם לא ביקשת קוד זה, אנא התעלם מהודעה זו.</p>
    </div>
    
    <div class="footer">
      <p>© 2025 תור רם-אל. כל הזכויות שמורות.</p>
    </div>
  </div>
</body>
</html>
    `
    
    const text = `
קוד אימות - תור רם-אל

שלום,

להלן קוד האימות שלך: ${otp}

הקוד תקף ל-10 דקות בלבד.
אם לא ביקשת קוד זה, אנא התעלם מהודעה זו.

© 2025 תור רם-אל. כל הזכויות שמורות.
    `
    
    const info = await transporter.sendMail({
      from: `"תור רם-אל" <${process.env.EMAIL_SENDER}>`,
      to: email,
      subject: 'קוד אימות - תור רם-אל',
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