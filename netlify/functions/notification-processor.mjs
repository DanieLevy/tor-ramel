import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import webpush from 'web-push'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Initialize web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@example.com'

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)
    console.log('✅ [Push] VAPID keys configured successfully')
  } catch (error) {
    console.error('❌ [Push] Failed to configure VAPID keys:', error)
  }
} else {
  console.warn('⚠️ [Push] VAPID keys missing - push notifications will not work')
}

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
  
  const approveUrl = `${baseUrl}/notification-action?action=approve&subscription=${subscriptionId}&times=${encodeURIComponent(times.join(','))}&date=${date}`
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
      margin-bottom: 16px;
    }
    
    .logo img {
      width: 48px;
      height: 48px;
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
    
    /* Updated times container for better mobile handling */
    .times-container {
      max-height: 200px;
      overflow-y: auto;
      margin-bottom: 24px;
      padding: 4px;
      background-color: #fafafa;
      border-radius: 8px;
      -webkit-overflow-scrolling: touch;
    }
    
    .times-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
      gap: 8px;
      padding: 8px;
    }
    
    .time-chip {
      display: block;
      padding: 8px 12px;
      background-color: #ffffff;
      border: 2px solid #000000;
      border-radius: 24px;
      font-size: 16px;
      font-weight: 500;
      color: #000000;
      text-align: center;
      white-space: nowrap;
    }
    
    /* Show all times message for very long lists */
    .times-count {
      font-size: 14px;
      color: #666666;
      text-align: center;
      margin-top: 8px;
      font-style: italic;
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
      
      /* Ensure times container works well on mobile */
      .times-container {
        max-height: 240px;
      }
      
      .times-grid {
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 6px;
        padding: 6px;
      }
      
      .time-chip {
        font-size: 15px;
        padding: 7px 10px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'}/icons/icon-128x128.png" alt="תור רם-אל" width="48" height="48" style="border-radius: 12px;">
      </div>
      <h1>נמצאו תורים פנויים 🎉</h1>
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
        <div class="times-grid">
          ${times.slice(0, 20).map(time => `<span class="time-chip">${time}</span>`).join('')}
        </div>
      </div>
      ${times.length > 20 ? `<p class="times-count">ועוד ${times.length - 20} שעות נוספות...</p>` : ''}
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

// Generate multi-date notification email
function generateMultiDateNotificationEmail(data) {
  const { appointments, subscriptionId } = data
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'
  
  // Encode all appointment data for the action URLs
  const appointmentData = appointments.map(apt => ({
    date: apt.date,
    times: apt.newTimes
  }))
  const encodedAppointments = encodeURIComponent(JSON.stringify(appointmentData))
  
  // Create URL with parameters for approve/decline actions
  const approveUrl = `${baseUrl}/notification-action?action=approve&subscription=${subscriptionId}&appointments=${encodedAppointments}`
  const declineUrl = `${baseUrl}/notification-action?action=decline&subscription=${subscriptionId}&appointments=${encodedAppointments}`
  const unsubscribeUrl = `${baseUrl}/notification-action?action=unsubscribe&subscription=${subscriptionId}`
  
  const html = `
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
      margin-bottom: 16px;
    }
    
    .logo img {
      width: 48px;
      height: 48px;
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
    
    .summary-badge {
      display: inline-block;
      padding: 12px 24px;
      background-color: #f5f5f5;
      border-radius: 8px;
      margin-bottom: 32px;
      border: 1px solid #e5e5e5;
    }
    
    .summary-badge strong {
      font-size: 20px;
      color: #000000;
      margin-left: 8px;
    }
    
    .summary-badge span {
      font-size: 16px;
      color: #666666;
    }
    
    .appointment-card {
      background-color: #fafafa;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    
    .appointment-date {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    
    .date-info strong {
      display: block;
      font-size: 18px;
      color: #000000;
      margin-bottom: 4px;
    }
    
    .date-info span {
      font-size: 14px;
      color: #666666;
    }
    
    .times-count {
      background-color: #000000;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
    }
    
    .times-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .time-chip {
      display: inline-block;
      padding: 6px 14px;
      background-color: #ffffff;
      border: 1px solid #000000;
      border-radius: 20px;
      font-size: 14px;
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
      
      .appointment-card {
        padding: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <img src="${baseUrl}/icons/icon-128x128.png" alt="תור רם-אל" width="48" height="48" style="border-radius: 12px;">
      </div>
      <h1>נמצאו תורים פנויים 🎉</h1>
      <p class="subtitle">מספרת רם-אל</p>
    </div>
    
    <center>
      <div class="summary-badge">
        <span>נמצאו תורים ב-</span>
        <strong>${appointments.length} ${appointments.length === 1 ? 'יום' : 'ימים'}</strong>
      </div>
    </center>
    
    <div style="margin-bottom: 32px;">
      ${appointments.map(apt => `
        <div class="appointment-card">
          <div class="appointment-date">
            <div class="date-info">
              <strong>${apt.dayName}</strong>
              <span>${apt.date}</span>
            </div>
            <div class="times-count">${apt.newTimes.length} שעות</div>
          </div>
          <div class="times-container">
            ${apt.newTimes.slice(0, 10).map(time => `<span class="time-chip">${time}</span>`).join('')}
            ${apt.newTimes.length > 10 ? `<span class="time-chip">+${apt.newTimes.length - 10}</span>` : ''}
          </div>
        </div>
      `).join('')}
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
      <strong>לתשומת לבך:</strong> בחירת "אף תור לא מתאים" תמנע התראות עתידיות על כל השעות המוצגות למעלה. תמשיך לקבל התראות על שעות חדשות שיתפנו.
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
  
  // Generate text version
  const appointmentsList = appointments.map(apt => 
    `${apt.dayName}, ${apt.date}:\n${apt.newTimes.join(', ')}`
  ).join('\n\n')
  
  const text = `
נמצאו תורים פנויים - תור רם-אל

נמצאו תורים ב-${appointments.length} ${appointments.length === 1 ? 'יום' : 'ימים'}:

${appointmentsList}

מה ברצונך לעשות?

מצאתי תור מתאים:
${approveUrl}

אף תור לא מתאים:
${declineUrl}

לתשומת לבך: בחירת "אף תור לא מתאים" תמנע התראות עתידיות על כל השעות המוצגות למעלה.

ביטול הרשמה: ${unsubscribeUrl}
ניהול התראות: ${baseUrl}/subscribe

© 2025 תור רם-אל
  `
  
  return { html, text }
}

// Helper function to send notification email
async function sendNotificationEmail(data) {
  try {
    const { to, appointments, subscriptionId } = data
    
    // Generate email content based on whether it's single or multi-date
    let html, text, subject
    
    if (appointments && appointments.length > 0) {
      // Multi-date notification
      const emailData = generateMultiDateNotificationEmail({
        appointments,
        subscriptionId
      })
      html = emailData.html
      text = emailData.text
      subject = `🎉 תורים פנויים - ${appointments.length} ${appointments.length === 1 ? 'יום' : 'ימים'}`
    } else if (data.date) {
      // Single date notification (backward compatibility)
      html = generateNotificationEmailHTML({
        date: data.date,
        dayName: data.dayName,
        times: data.times,
        subscriptionId
      })
      
      text = `
נמצאו תורים פנויים - תור רם-אל

תאריך: ${data.dayName}, ${data.date}

שעות זמינות:
${data.times.join(', ')}

מה ברצונך לעשות?

מצאתי תור מתאים:
${process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'}/notification-action?action=approve&subscription=${subscriptionId}

אף תור לא מתאים:
${process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'}/notification-action?action=decline&subscription=${subscriptionId}&times=${encodeURIComponent(data.times.join(','))}&date=${data.date}

לתשומת לבך: בחירת "אף תור לא מתאים" תמנע התראות עתידיות על השעות הללו בלבד.

© 2025 תור רם-אל
      `
      subject = `🎉 תורים פנויים - ${data.dayName} ${data.date}`
    } else {
      throw new Error('Invalid notification data')
    }
    
    // Send email
    const info = await transporter.sendMail({
      from: `"Tor-Ramel" <${process.env.EMAIL_SENDER}>`,
      to,
      subject,
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

// Helper function to send push notification
async function sendPushNotification(data) {
  try {
    const { userId, title, body, url, appointments } = data
    
    // Get active push subscriptions for this user
    const { data: pushSubscriptions, error: pushError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (pushError) {
      console.error('❌ [Push] Error fetching subscriptions:', pushError)
      return false
    }

    if (!pushSubscriptions || pushSubscriptions.length === 0) {
      console.log(`⚠️ [Push] No active push subscriptions for user ${userId}`)
      return true // Not an error, just no subscriptions
    }

    console.log(`📱 [Push] Found ${pushSubscriptions.length} active push subscriptions`)

    // Prepare notification payload
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'
    const notificationPayload = JSON.stringify({
      notification: {
        title,
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'appointment-notification',
        requireInteraction: true,
        actions: [
          { action: 'view', title: 'צפה בתור' },
          { action: 'dismiss', title: 'בטל' }
        ],
        data: {
          url: url || baseUrl,
          appointments: appointments || [],
          timestamp: Date.now()
        }
      }
    })

    // Send to each subscription
    let sent = 0
    let failed = 0

    for (const sub of pushSubscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }

        await webpush.sendNotification(pushSubscription, notificationPayload)
        sent++
        console.log(`✅ [Push] Push sent to ${sub.username} (${sub.device_type})`)

        // Update last_used timestamp
        await supabase
          .from('push_subscriptions')
          .update({ last_used: new Date().toISOString() })
          .eq('id', sub.id)

      } catch (error) {
        failed++
        console.error(`❌ [Push] Failed to send to ${sub.username}:`, error.message)

        // Handle subscription errors
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired or gone - remove it
          console.log(`🗑️ [Push] Removing expired subscription for ${sub.username}`)
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
        }
      }
    }

    console.log(`📊 [Push] Results: ${sent} sent, ${failed} failed`)
    return sent > 0

  } catch (error) {
    console.error('❌ [Push] Error sending push notification:', error)
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
          notification_method,
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
        const { subscription, appointments, appointment_date, available_times, new_times } = item
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

        // Check if this is a grouped notification or single
        let emailData
        const isGrouped = appointments && appointments.length > 0
        
        if (isGrouped) {
          // Grouped notification - check for duplicate notifications
          for (const apt of appointments) {
            const { data: recentNotification } = await supabase
              .from('notified_appointments')
              .select('id')
              .eq('subscription_id', subscription.id)
              .eq('appointment_date', apt.date)
              .eq('notified_times', apt.newTimes)
              .gte('notification_sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
              .single()

            if (recentNotification) {
              console.log(`Recent notification exists for ${apt.date}, filtering from group`)
              // Remove this appointment from the group
              appointments.splice(appointments.indexOf(apt), 1)
            }
          }
          
          // If no appointments left after filtering, skip
          if (appointments.length === 0) {
            console.log(`All appointments already notified for subscription ${subscription.id}`)
            await supabase
              .from('notification_queue')
              .update({ 
                status: 'skipped',
                error_message: 'All appointments already notified within 24 hours'
              })
              .eq('id', item.id)
            continue
          }
          
          emailData = {
            to: userEmail,
            appointments,
            subscriptionId: subscription.id
          }
        } else {
          // Single notification (backward compatibility)
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
          
          emailData = {
            to: userEmail,
            date: appointment_date,
            dayName: dayName,
            times: new_times,
            subscriptionId: subscription.id
          }
        }

        // Get notification method preference (default to 'email' for backward compatibility)
        const notificationMethod = subscription.notification_method || 'email'
        console.log(`📬 [Queue] Notification method for subscription ${subscription.id}: ${notificationMethod}`)

        // Send notifications based on preference
        let emailSent = false
        let pushSent = false

        // Send email if method is 'email' or 'both'
        if (notificationMethod === 'email' || notificationMethod === 'both') {
          const emailTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email timeout')), 8000)
          )
          
          const emailPromise = sendNotificationEmail(emailData)
          emailSent = await Promise.race([emailPromise, emailTimeout])
          
          if (emailSent) {
            console.log(`✅ [Queue] Email sent successfully`)
          } else {
            console.error(`❌ [Queue] Email failed to send`)
          }
        }

        // Send push notification if method is 'push' or 'both'
        if (notificationMethod === 'push' || notificationMethod === 'both') {
          // Prepare push notification data
          let pushTitle, pushBody, pushUrl
          
          if (isGrouped && appointments.length > 0) {
            pushTitle = `תורים פנויים - ${appointments.length} ימים`
            pushBody = `נמצאו תורים זמינים ב-${appointments.length} תאריכים שונים`
            pushUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'}/notification-action?action=approve&subscription=${subscription.id}&appointments=${encodeURIComponent(JSON.stringify(appointments.map(a => ({ date: a.date, times: a.newTimes }))))}`
          } else {
            pushTitle = `תורים פנויים - ${emailData.dayName}`
            pushBody = `נמצאו ${emailData.times.length} תורים זמינים ב-${emailData.date}`
            pushUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'}/notification-action?action=approve&subscription=${subscription.id}&times=${encodeURIComponent(emailData.times.join(','))}&date=${emailData.date}`
          }
          
          pushSent = await sendPushNotification({
            userId: subscription.user_id,
            title: pushTitle,
            body: pushBody,
            url: pushUrl,
            appointments: isGrouped ? appointments : null
          })
          
          if (pushSent) {
            console.log(`✅ [Queue] Push notification sent successfully`)
          } else {
            console.error(`❌ [Queue] Push notification failed to send`)
          }
        }

        // Check if at least one notification method succeeded
        const notificationSent = (notificationMethod === 'email' && emailSent) || 
                                  (notificationMethod === 'push' && pushSent) || 
                                  (notificationMethod === 'both' && (emailSent || pushSent))

        if (notificationSent) {
          // Record successful notifications
          if (isGrouped && appointments.length > 0) {
            // Record each appointment in the group
            for (const apt of appointments) {
              const { error: notifyError } = await supabase
                .from('notified_appointments')
                .insert({
                  subscription_id: subscription.id,
                  appointment_date: apt.date,
                  notified_times: apt.newTimes,
                  notification_sent_at: new Date().toISOString()
                })

              if (notifyError) {
                // Check if it's a duplicate key error
                if (notifyError.code === '23505') {
                  console.log(`Notification already recorded for ${apt.date} (duplicate key) - treating as success`)
                } else {
                  console.error(`Error recording notification for ${apt.date}:`, notifyError)
                }
              }
            }
          } else {
            // Single appointment
            const { error: notifyError } = await supabase
              .from('notified_appointments')
              .insert({
                subscription_id: subscription.id,
                appointment_date: appointment_date,
                notified_times: new_times,
                notification_sent_at: new Date().toISOString()
              })

            if (notifyError) {
              // Check if it's a duplicate key error
              if (notifyError.code === '23505') {
                console.log(`Notification already recorded for ${appointment_date} (duplicate key) - treating as success`)
              } else {
                console.error('Error recording notification:', notifyError)
              }
            }
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
          const message = isGrouped 
            ? `✅ Email sent to ${userEmail} for ${appointments.length} dates`
            : `✅ Email sent to ${userEmail} for ${appointment_date}`
          console.log(message)
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

// ============================================================================
// NETLIFY FUNCTION HANDLER
// ============================================================================

// Main handler for manual invocation
export default async (req) => {
  const functionStart = Date.now()
  
  try {
    console.log('📧 NOTIFICATION-PROCESSOR: Starting manual execution')
    
    // Get limit from query params if provided
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    
    const result = await processNotificationQueue(limit)
    
    const totalTime = Math.round((Date.now() - functionStart) / 1000)
    console.log(`⚡ FUNCTION COMPLETED in ${totalTime}s`)
    
    return new Response(JSON.stringify({
      success: true,
      executionTime: totalTime,
      timestamp: new Date().toISOString(),
      data: result
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
    
  } catch (error) {
    const totalTime = Math.round((Date.now() - functionStart) / 1000)
    console.error(`❌ FUNCTION FAILED in ${totalTime}s:`, error.message)
    console.error(error.stack)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      executionTime: totalTime,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
} 