import nodemailer from 'nodemailer'

// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
})

// Base URL for links
const getBaseUrl = () => process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'

// ============================================================================
// BASE EMAIL TEMPLATE
// ============================================================================

function getBaseEmailStyles() {
  return `
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
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e5e5e5;
    }
    
    .logo img {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: block;
      margin: 0 auto 16px;
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
      margin-bottom: 32px;
    }
    
    .badge {
      display: inline-block;
      padding: 12px 24px;
      background-color: #f5f5f5;
      border-radius: 8px;
      margin-bottom: 24px;
      border: 1px solid #e5e5e5;
    }
    
    .badge strong {
      display: block;
      font-size: 18px;
      color: #000000;
      margin-bottom: 4px;
    }
    
    .badge span {
      font-size: 14px;
      color: #666666;
    }
    
    .section {
      margin-bottom: 24px;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #000000;
      margin-bottom: 16px;
    }
    
    .times-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .time-chip {
      display: inline-block;
      padding: 8px 14px;
      background-color: #ffffff;
      border: 2px solid #000000;
      border-radius: 24px;
      font-size: 14px;
      font-weight: 500;
      color: #000000;
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
    }
    
    .button-primary {
      background-color: #000000;
      color: #ffffff !important;
      border: 2px solid #000000;
    }
    
    .button-secondary {
      background-color: #ffffff;
      color: #000000 !important;
      border: 2px solid #000000;
    }
    
    .notice {
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 8px;
      font-size: 14px;
      color: #666666;
      margin: 24px 0;
    }
    
    .notice strong {
      color: #000000;
    }
    
    .footer {
      text-align: center;
      font-size: 14px;
      color: #999999;
      padding-top: 24px;
      border-top: 1px solid #e5e5e5;
    }
    
    .footer a {
      color: #666666;
      text-decoration: none;
      margin: 0 8px;
    }
    
    .highlight-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 2px solid #f59e0b;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      text-align: center;
    }
    
    .highlight-box.urgent {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      border-color: #ef4444;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      background-color: #f5f5f5;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    
    .stat-number {
      font-size: 28px;
      font-weight: 700;
      color: #000000;
      margin-bottom: 4px;
    }
    
    .stat-label {
      font-size: 12px;
      color: #666666;
      text-transform: uppercase;
    }
    
    .appointment-card {
      background-color: #fafafa;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    
    .appointment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    @media only screen and (max-width: 600px) {
      .container {
        padding: 24px 16px;
      }
      
      h1 {
        font-size: 20px;
      }
      
      .button {
        font-size: 15px;
        padding: 14px 24px;
      }
      
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `
}

function wrapEmailHtml(title, content) {
  const baseUrl = getBaseUrl()
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style>${getBaseEmailStyles()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <img src="${baseUrl}/icons/icon-128x128.png" alt="תור רם-אל" width="48" height="48">
      </div>
    </div>
    ${content}
    <div class="footer">
      <a href="${baseUrl}/settings">הגדרות התראות</a>
      <span>•</span>
      <a href="${baseUrl}">כניסה למערכת</a>
      <div style="margin-top: 16px;">© 2025 תור רם-אל</div>
    </div>
  </div>
</body>
</html>
  `
}

// ============================================================================
// HOT ALERT EMAIL TEMPLATE
// ============================================================================

export function generateHotAlertEmail(data) {
  const { date, dayName, times, daysUntil, bookingUrl } = data
  const baseUrl = getBaseUrl()
  
  let urgencyText, urgencyClass
  if (daysUntil === 0) {
    urgencyText = 'תור היום!'
    urgencyClass = 'urgent'
  } else if (daysUntil === 1) {
    urgencyText = 'תור מחר!'
    urgencyClass = 'urgent'
  } else {
    urgencyText = `עוד ${daysUntil} ימים`
    urgencyClass = ''
  }
  
  const content = `
    <h1>🔥 ${urgencyText}</h1>
    <p class="subtitle">הזדמנות נדירה לתור קרוב</p>
    
    <div class="content">
      <div class="highlight-box ${urgencyClass}">
        <strong style="font-size: 20px; display: block; margin-bottom: 8px;">${dayName}</strong>
        <span style="font-size: 16px; color: #666;">${date}</span>
      </div>
      
      <div class="section">
        <h2 class="section-title">שעות זמינות</h2>
        <div class="times-grid">
          ${times.slice(0, 8).map(time => `<span class="time-chip">${time}</span>`).join('')}
        </div>
        ${times.length > 8 ? `<p style="font-size: 14px; color: #666; text-align: center;">ועוד ${times.length - 8} שעות נוספות</p>` : ''}
      </div>
      
      <a href="${bookingUrl || baseUrl + '/search'}" class="button button-primary">
        🗓 הזמן עכשיו
      </a>
      <a href="${baseUrl}/search" class="button button-secondary">
        צפה בכל התורים
      </a>
    </div>
    
    <div class="notice">
      <strong>💡 טיפ:</strong> תורים קרובים נתפסים מהר! מומלץ להזמין בהקדם.
    </div>
  `
  
  return wrapEmailHtml('תור חם! - תור רם-אל', content)
}

// ============================================================================
// WEEKLY DIGEST EMAIL TEMPLATE
// ============================================================================

export function generateWeeklyDigestEmail(data) {
  const { appointments, totalSlots, closestDate, closestDayName, closestTime } = data
  const baseUrl = getBaseUrl()
  
  const appointmentCards = appointments.slice(0, 5).map(apt => `
    <div class="appointment-card">
      <div class="appointment-header">
        <div>
          <strong style="font-size: 16px;">${apt.day_name || apt.dayName}</strong>
          <div style="font-size: 14px; color: #666;">${apt.check_date || apt.date}</div>
        </div>
        <span style="background: #000; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
          ${(apt.times?.length || 0)} שעות
        </span>
      </div>
      <div class="times-grid">
        ${(apt.times || []).slice(0, 4).map(t => `<span class="time-chip">${t}</span>`).join('')}
        ${(apt.times?.length || 0) > 4 ? `<span style="padding: 8px; color: #666;">+${apt.times.length - 4}</span>` : ''}
      </div>
    </div>
  `).join('')
  
  const content = `
    <h1>📅 סיכום שבועי</h1>
    <p class="subtitle">התורים הזמינים השבוע</p>
    
    <div class="content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">${appointments.length}</div>
          <div class="stat-label">ימים זמינים</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${totalSlots}</div>
          <div class="stat-label">שעות זמינות</div>
        </div>
      </div>
      
      ${closestDate ? `
        <div class="highlight-box">
          <div style="font-size: 14px; color: #666; margin-bottom: 4px;">הכי קרוב</div>
          <strong style="font-size: 18px;">${closestDayName} - ${closestTime}</strong>
          <div style="font-size: 14px; color: #666;">${closestDate}</div>
        </div>
      ` : ''}
      
      <div class="section">
        <h2 class="section-title">תורים זמינים השבוע</h2>
        ${appointmentCards}
        ${appointments.length > 5 ? `<p style="text-align: center; color: #666; font-size: 14px;">ועוד ${appointments.length - 5} ימים נוספים...</p>` : ''}
      </div>
      
      <a href="${baseUrl}/search" class="button button-primary">
        צפה בכל התורים
      </a>
    </div>
  `
  
  return wrapEmailHtml('סיכום שבועי - תור רם-אל', content)
}

// ============================================================================
// EXPIRY REMINDER EMAIL TEMPLATE
// ============================================================================

export function generateExpiryReminderEmail(data) {
  const { subscriptionDateRange, daysRemaining, subscriptionId } = data
  const baseUrl = getBaseUrl()
  const extendUrl = `${baseUrl}/subscribe?extend=${subscriptionId}`
  
  const urgencyClass = daysRemaining === 0 ? 'urgent' : ''
  const urgencyText = daysRemaining === 0 ? 'מסתיים היום!' : `מסתיים מחר`
  
  const content = `
    <h1>⏰ ההתראה שלך ${urgencyText}</h1>
    <p class="subtitle">החיפוש שלך עומד להסתיים</p>
    
    <div class="content">
      <div class="highlight-box ${urgencyClass}">
        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">טווח התאריכים שלך</div>
        <strong style="font-size: 18px;">${subscriptionDateRange}</strong>
        <div style="font-size: 14px; color: #d97706; margin-top: 8px;">
          ${daysRemaining === 0 ? '🔴 מסתיים היום' : '🟡 מסתיים מחר'}
        </div>
      </div>
      
      <a href="${extendUrl}" class="button button-primary">
        הארך את ההתראה
      </a>
      <a href="${baseUrl}/subscribe" class="button button-secondary">
        צור התראה חדשה
      </a>
    </div>
    
    <div class="notice">
      <strong>📌 שים לב:</strong> לאחר סיום ההתראה, לא תקבל עוד עדכונים על תורים פנויים בטווח התאריכים הזה.
    </div>
  `
  
  return wrapEmailHtml('ההתראה שלך מסתיימת - תור רם-אל', content)
}

// ============================================================================
// OPPORTUNITY DISCOVERY EMAIL TEMPLATE
// ============================================================================

export function generateOpportunityEmail(data) {
  const { appointments, totalSlots } = data
  const baseUrl = getBaseUrl()
  
  const appointmentsList = appointments.slice(0, 3).map(apt => `
    <div class="appointment-card">
      <div class="appointment-header">
        <div>
          <strong style="font-size: 16px;">${apt.dayName || apt.day_name}</strong>
          <div style="font-size: 14px; color: #666;">${apt.date || apt.check_date}</div>
        </div>
        <span style="background: #000; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
          ${apt.times?.length || 0} שעות
        </span>
      </div>
    </div>
  `).join('')
  
  const content = `
    <h1>💡 יש תורים פנויים!</h1>
    <p class="subtitle">מצאנו תורים שעשויים לעניין אותך</p>
    
    <div class="content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">${appointments.length}</div>
          <div class="stat-label">ימים זמינים</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${totalSlots}</div>
          <div class="stat-label">שעות זמינות</div>
        </div>
      </div>
      
      <div class="section">
        ${appointmentsList}
      </div>
      
      <a href="${baseUrl}/search" class="button button-primary">
        צפה בכל התורים
      </a>
      <a href="${baseUrl}/subscribe" class="button button-secondary">
        צור התראה אוטומטית
      </a>
    </div>
    
    <div class="notice">
      <strong>💡 טיפ:</strong> צור התראה אוטומטית כדי לקבל עדכונים מיידיים כשתורים מתפנים!
    </div>
  `
  
  return wrapEmailHtml('תורים פנויים - תור רם-אל', content)
}

// ============================================================================
// TEST NOTIFICATION EMAIL TEMPLATE
// ============================================================================

export function generateTestEmail(data) {
  const { userName, testType } = data
  const baseUrl = getBaseUrl()
  
  const content = `
    <h1>🔔 התראת בדיקה</h1>
    <p class="subtitle">בדיקת מערכת ההתראות</p>
    
    <div class="content">
      <div class="highlight-box">
        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">שלום ${userName || 'משתמש'}!</div>
        <strong style="font-size: 18px;">התראת המייל פועלת! ✅</strong>
      </div>
      
      <div class="notice" style="background-color: #dcfce7; border: 1px solid #22c55e;">
        <strong style="color: #16a34a;">מצוין!</strong> קיבלת את ההתראה בהצלחה.
        ${testType === 'both' ? '<br><br>בדוק גם את ההתראה ב-Push במכשיר שלך.' : ''}
      </div>
      
      <a href="${baseUrl}/settings" class="button button-secondary">
        חזרה להגדרות
      </a>
    </div>
  `
  
  return wrapEmailHtml('התראת בדיקה - תור רם-אל', content)
}

// ============================================================================
// INACTIVITY REMINDER EMAIL TEMPLATE
// ============================================================================

export function generateInactivityEmail(data) {
  const { userName, daysSinceLastVisit, availableAppointments } = data
  const baseUrl = getBaseUrl()
  
  const content = `
    <h1>👋 לא ראינו אותך זמן רב</h1>
    <p class="subtitle">יש תורים פנויים שמחכים לך</p>
    
    <div class="content">
      <div class="highlight-box">
        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">שלום ${userName || 'משתמש'}!</div>
        <strong style="font-size: 18px;">עברו ${daysSinceLastVisit} ימים מהכניסה האחרונה שלך</strong>
      </div>
      
      ${availableAppointments > 0 ? `
        <div class="stat-card" style="margin-bottom: 24px;">
          <div class="stat-number">${availableAppointments}</div>
          <div class="stat-label">תורים זמינים כרגע</div>
        </div>
      ` : ''}
      
      <a href="${baseUrl}/search" class="button button-primary">
        צפה בתורים הזמינים
      </a>
      <a href="${baseUrl}/subscribe" class="button button-secondary">
        צור התראה אוטומטית
      </a>
    </div>
  `
  
  return wrapEmailHtml('התגעגענו! - תור רם-אל', content)
}

// ============================================================================
// EMAIL SENDING FUNCTIONS
// ============================================================================

/**
 * Send an email using the configured transporter
 */
export async function sendEmail(to, subject, html) {
  try {
    if (!process.env.EMAIL_SENDER || !process.env.EMAIL_APP_PASSWORD) {
      console.error('❌ [Email] Email credentials not configured')
      return false
    }
    
    const mailOptions = {
      from: `"תור רם-אל" <${process.env.EMAIL_SENDER}>`,
      to,
      subject,
      html
    }
    
    await transporter.sendMail(mailOptions)
    console.log(`✅ [Email] Email sent successfully to ${to}`)
    return true
  } catch (error) {
    console.error(`❌ [Email] Failed to send email to ${to}:`, error.message)
    return false
  }
}

/**
 * Send a hot alert email
 */
export async function sendHotAlertEmail(to, data) {
  const html = generateHotAlertEmail(data)
  const subject = data.daysUntil === 0 
    ? '🔥 תור היום! - תור רם-אל' 
    : data.daysUntil === 1 
      ? '🔥 תור מחר! - תור רם-אל'
      : `🔥 תור חם! עוד ${data.daysUntil} ימים - תור רם-אל`
  
  return sendEmail(to, subject, html)
}

/**
 * Send a weekly digest email
 */
export async function sendWeeklyDigestEmail(to, data) {
  const html = generateWeeklyDigestEmail(data)
  const subject = `📅 סיכום שבועי: ${data.appointments.length} ימים זמינים - תור רם-אל`
  
  return sendEmail(to, subject, html)
}

/**
 * Send an expiry reminder email
 */
export async function sendExpiryReminderEmail(to, data) {
  const html = generateExpiryReminderEmail(data)
  const subject = data.daysRemaining === 0
    ? '⏰ ההתראה שלך מסתיימת היום! - תור רם-אל'
    : '⏰ ההתראה שלך מסתיימת מחר - תור רם-אל'
  
  return sendEmail(to, subject, html)
}

/**
 * Send an opportunity discovery email
 */
export async function sendOpportunityEmail(to, data) {
  const html = generateOpportunityEmail(data)
  const subject = `💡 ${data.totalSlots} תורים פנויים מחכים לך - תור רם-אל`
  
  return sendEmail(to, subject, html)
}

/**
 * Send a test email
 */
export async function sendTestEmail(to, data) {
  const html = generateTestEmail(data)
  const subject = '🔔 התראת בדיקה - תור רם-אל'
  
  return sendEmail(to, subject, html)
}

/**
 * Send an inactivity reminder email
 */
export async function sendInactivityEmail(to, data) {
  const html = generateInactivityEmail(data)
  const subject = '👋 התגעגענו! יש תורים פנויים - תור רם-אל'
  
  return sendEmail(to, subject, html)
}








