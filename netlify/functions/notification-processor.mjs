import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
})

// Helper function to generate notification email HTML
function generateNotificationEmailHTML(data) {
  const { date, dayName, times, subscriptionId } = data
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'
  
  const approveUrl = `${baseUrl}/notification-action?action=approve&subscription=${subscriptionId}`
  const declineUrl = `${baseUrl}/notification-action?action=decline&subscription=${subscriptionId}&times=${encodeURIComponent(times.join(','))}&date=${date}`
  const unsubscribeUrl = `${baseUrl}/notification-action?action=unsubscribe&subscription=${subscriptionId}`
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>תורים פנויים - תור רם-אל</title>
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
      -moz-osx-font-smoothing: grayscale;
    }
    
    .container {
      max-width: 560px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 48px;
      padding-bottom: 32px;
      border-bottom: 1px solid #e5e5e5;
    }
    
    .logo {
      display: inline-block;
      width: 48px;
      height: 48px;
      background-color: #000000;
      border-radius: 12px;
      margin-bottom: 16px;
      position: relative;
    }
    
    .logo::after {
      content: "ת";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 24px;
      font-weight: 700;
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
    
    .date-badge {
      display: inline-block;
      padding: 12px 24px;
      background-color: #f5f5f5;
      border-radius: 8px;
      margin-bottom: 32px;
      border: 1px solid #e5e5e5;
    }
    
    .date-badge strong {
      display: block;
      font-size: 18px;
      color: #000000;
      margin-bottom: 4px;
    }
    
    .date-badge span {
      font-size: 14px;
      color: #666666;
    }
    
    .section {
      margin-bottom: 32px;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #000000;
      margin-bottom: 16px;
    }
    
    .times-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 24px;
    }
    
    .time-chip {
      display: inline-block;
      padding: 8px 16px;
      background-color: #ffffff;
      border: 2px solid #000000;
      border-radius: 24px;
      font-size: 16px;
      font-weight: 500;
      color: #000000;
    }
    
    .actions {
      margin: 40px 0;
      padding: 32px 0;
      border-top: 1px solid #e5e5e5;
      border-bottom: 1px solid #e5e5e5;
    }
    
    .button {
      display: block;
      width: 100%;
      padding: 16px 32px;
      margin-bottom: 12px;
      text-align: center;
      text-decoration: none;
      font-size: 16px;
      font-weight: 500;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    
    .button-primary {
      background-color: #000000;
      color: #ffffff;
      border: 2px solid #000000;
    }
    
    .button-secondary {
      background-color: #ffffff;
      color: #000000;
      border: 2px solid #000000;
    }
    
    .notice {
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 8px;
      font-size: 14px;
      color: #666666;
      margin-bottom: 32px;
    }
    
    .notice strong {
      color: #000000;
    }
    
    .footer {
      text-align: center;
      font-size: 14px;
      color: #999999;
      padding-top: 32px;
    }
    
    .footer a {
      color: #666666;
      text-decoration: none;
      margin: 0 8px;
    }
    
    .footer a:hover {
      text-decoration: underline;
    }
    
    .divider {
      height: 1px;
      background-color: #e5e5e5;
      margin: 24px 0;
    }
    
    @media only screen and (max-width: 600px) {
      .container {
        padding: 32px 16px;
      }
      
      h1 {
        font-size: 20px;
      }
      
      .button {
        font-size: 15px;
        padding: 14px 24px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo"></div>
      <h1>נמצאו תורים פנויים</h1>
      <p class="subtitle">מספרת רם-אל</p>
    </div>
    
    <center>
      <div class="date-badge">
        <strong>${dayName}</strong>
        <span>${date}</span>
      </div>
    </center>
    
    <div class="section">
      <h2 class="section-title">שעות זמינות</h2>
      <div class="times-container">
        ${times.map(time => `<span class="time-chip">${time}</span>`).join('')}
      </div>
    </div>
    
    <div class="actions">
      <a href="${approveUrl}" class="button button-primary">
        מצאתי תור מתאים
      </a>
      <a href="${declineUrl}" class="button button-secondary">
        אף תור לא מתאים
      </a>
    </div>
    
    <div class="notice">
      <strong>לתשומת לבך:</strong> בחירת "אף תור לא מתאים" תמנע התראות עתידיות על השעות הללו בלבד. תמשיך לקבל התראות על שעות חדשות שיתפנו.
    </div>
    
    <div class="footer">
      <a href="${unsubscribeUrl}">ביטול הרשמה</a>
      <span>•</span>
      <a href="${baseUrl}/subscribe">ניהול התראות</a>
      <span>•</span>
      <a href="${baseUrl}">כניסה למערכת</a>
      <div class="divider"></div>
      <p>© 2025 תור רם-אל</p>
    </div>
  </div>
</body>
</html>
  `
}

// Helper function to send notification email
async function sendNotificationEmail(data) {
  try {
    const { to, date, dayName, times, subscriptionId } = data
    
    // Generate email content
    const html = generateNotificationEmailHTML({
      date,
      dayName,
      times,
      subscriptionId
    })
    
    const text = `
נמצאו תורים פנויים - תור רם-אל

תאריך: ${dayName}, ${date}

שעות זמינות:
${times.join(', ')}

מה ברצונך לעשות?

מצאתי תור מתאים:
${process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'}/notification-action?action=approve&subscription=${subscriptionId}

אף תור לא מתאים:
${process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'}/notification-action?action=decline&subscription=${subscriptionId}&times=${encodeURIComponent(times.join(','))}&date=${date}

לתשומת לבך: בחירת "אף תור לא מתאים" תמנע התראות עתידיות על השעות הללו בלבד.

© 2025 תור רם-אל
    `
    
    // Send email
    const info = await transporter.sendMail({
      from: `"תור רם-אל" <${process.env.EMAIL_SENDER}>`,
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

// Process notification queue
export async function processNotificationQueue(limit = 10) {
  const startTime = Date.now()
  
  try {
    console.log('🔔 Processing notification queue...')

    // Get pending notifications from queue
    const { data: queueItems, error: queueError } = await supabase
      .from('notification_queue')
      .select(`
        *,
        subscription:notification_subscriptions!inner(
          id,
          user_id,
          subscription_date,
          date_range_start,
          date_range_end,
          is_active,
          users!inner(email)
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (queueError) {
      console.error('Error fetching queue:', queueError)
      throw new Error('Failed to fetch notification queue')
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('No pending notifications to process')
      return { processed: 0, failed: 0, total: 0 }
    }

    console.log(`Found ${queueItems.length} pending notifications`)

    let processed = 0
    let failed = 0
    const errors = []

    // Process each notification
    for (const item of queueItems) {
      try {
        const { subscription, appointment_date, available_times, new_times } = item
        const userEmail = subscription.users.email

        // Validate subscription is still active
        if (!subscription.is_active) {
          console.log(`Skipping inactive subscription ${subscription.id}`)
          await supabase
            .from('notification_queue')
            .update({ 
              status: 'skipped',
              processed_at: new Date().toISOString(),
              error_message: 'Subscription no longer active'
            })
            .eq('id', item.id)
          continue
        }

        // Mark as processing
        await supabase
          .from('notification_queue')
          .update({ 
            status: 'processing',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id)

        // Check if user has already been notified for these exact times today
        const { data: recentNotification } = await supabase
          .from('notified_appointments')
          .select('id')
          .eq('subscription_id', subscription.id)
          .eq('appointment_date', appointment_date)
          .eq('notified_times', new_times)
          .gte('notification_sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .single()

        if (recentNotification) {
          console.log(`Skipping duplicate notification for subscription ${subscription.id}`)
          await supabase
            .from('notification_queue')
            .update({ 
              status: 'skipped',
              error_message: 'Duplicate notification within 24 hours'
            })
            .eq('id', item.id)
          continue
        }

        // Calculate day name for the appointment date
        const dayName = new Intl.DateTimeFormat('he-IL', {
          timeZone: 'Asia/Jerusalem',
          weekday: 'long'
        }).format(new Date(appointment_date + 'T00:00:00'))

        // Send email with timeout
        const emailTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email timeout')), 8000)
        )
        
        const emailPromise = sendNotificationEmail({
          to: userEmail,
          date: appointment_date,
          dayName: dayName,
          times: new_times,
          subscriptionId: subscription.id
        })

        const emailSent = await Promise.race([emailPromise, emailTimeout])

        if (emailSent) {
          // Record successful notification
          const { error: notifyError } = await supabase
            .from('notified_appointments')
            .insert({
              subscription_id: subscription.id,
              appointment_date: appointment_date,
              notified_times: new_times,
              notification_sent_at: new Date().toISOString()
            })

          if (notifyError) {
            console.error('Error recording notification:', notifyError)
          }

          // Update queue item
          await supabase
            .from('notification_queue')
            .update({ 
              status: 'sent',
              processed_at: new Date().toISOString()
            })
            .eq('id', item.id)

          processed++
          console.log(`✅ Email sent to ${userEmail} for ${appointment_date}`)
        } else {
          throw new Error('Email sending failed')
        }

      } catch (error) {
        console.error(`Failed to process notification ${item.id}:`, error)
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push({
          queueId: item.id,
          error: errorMessage,
          email: item.subscription?.users?.email
        })
        
        // Mark as failed
        await supabase
          .from('notification_queue')
          .update({ 
            status: 'failed',
            processed_at: new Date().toISOString(),
            error_message: errorMessage
          })
          .eq('id', item.id)

        failed++
      }
    }

    const executionTime = Date.now() - startTime
    console.log(`✅ Processed ${processed} notifications, ${failed} failed in ${executionTime}ms`)

    return { 
      processed,
      failed,
      total: queueItems.length,
      errors: failed > 0 ? errors : undefined
    }

  } catch (error) {
    console.error('Error in notification processor:', error)
    throw error
  }
} 