interface AppointmentData {
  date: string
  dayName: string
  times: string[]
  subscriptionId: string
}

interface SubscriptionData {
  email: string
  subscriptionId: string
  subscriptionDate?: string
  dateRangeStart?: string
  dateRangeEnd?: string
}

interface MultiDateAppointmentData {
  appointments: Array<{
    date: string
    dayName: string
    times: string[]
    newTimes: string[]
  }>
  subscriptionId: string
}

export function generateNotificationEmail(data: AppointmentData): { html: string; text: string } {
  const { date, dayName, times, subscriptionId } = data
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'
  
  // Create URL with parameters for approve/decline actions
  const approveUrl = `${baseUrl}/notification-action?action=approve&subscription=${subscriptionId}`
  const declineUrl = `${baseUrl}/notification-action?action=decline&subscription=${subscriptionId}&times=${encodeURIComponent(times.join(','))}&date=${date}`
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
      <div class="logo">
        <img src="${baseUrl}/icons/icon-128x128.png" alt="תור רם-אל" width="48" height="48" style="border-radius: 12px;">
      </div>
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
  
  const text = `
נמצאו תורים פנויים - תור רם-אל

תאריך: ${dayName}, ${date}

שעות זמינות:
${times.join(', ')}

מה ברצונך לעשות?

מצאתי תור מתאים:
${approveUrl}

אף תור לא מתאים:
${declineUrl}

לתשומת לבך: בחירת "אף תור לא מתאים" תמנע התראות עתידיות על השעות הללו בלבד.

ביטול הרשמה: ${unsubscribeUrl}
ניהול התראות: ${baseUrl}/subscribe

© 2025 תור רם-אל
  `
  
  return { html, text }
}

export function generateSubscriptionConfirmationEmail(data: SubscriptionData): { html: string; text: string } {
  const { email, subscriptionId, subscriptionDate, dateRangeStart, dateRangeEnd } = data
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'
  const unsubscribeUrl = `${baseUrl}/notification-action?action=unsubscribe&subscription=${subscriptionId}`
  
  let dateDisplay = ''
  if (subscriptionDate) {
    const date = new Date(subscriptionDate + 'T00:00:00')
    dateDisplay = date.toLocaleDateString('he-IL', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  } else if (dateRangeStart && dateRangeEnd) {
    const startDate = new Date(dateRangeStart + 'T00:00:00')
    const endDate = new Date(dateRangeEnd + 'T00:00:00')
    const startDisplay = startDate.toLocaleDateString('he-IL', { 
      day: 'numeric',
      month: 'numeric'
    })
    const endDisplay = endDate.toLocaleDateString('he-IL', { 
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    })
    dateDisplay = `${startDisplay} - ${endDisplay}`
  }
  
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>אישור הרשמה - תור רם-אל</title>
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
    
    .success-icon {
      display: inline-block;
      width: 64px;
      height: 64px;
      background-color: #10b981;
      border-radius: 50%;
      margin-bottom: 24px;
      position: relative;
      line-height: 64px;
      text-align: center;
      font-size: 32px;
      color: #ffffff;
    }
    
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #000000;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    
    .content {
      margin-bottom: 40px;
    }
    
    .info-card {
      background-color: #f5f5f5;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    
    .info-label {
      font-size: 14px;
      color: #666666;
      margin-bottom: 8px;
    }
    
    .info-value {
      font-size: 18px;
      font-weight: 600;
      color: #000000;
    }
    
    .features {
      margin: 32px 0;
    }
    
    .feature {
      display: flex;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    
    .feature-icon {
      display: inline-block;
      min-width: 24px;
      height: 24px;
      margin-left: 12px;
      text-align: center;
      font-size: 16px;
    }
    
    .feature-text {
      font-size: 16px;
      color: #333333;
    }
    
    .button {
      display: inline-block;
      padding: 16px 32px;
      background-color: #000000;
      color: #ffffff;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      text-align: center;
    }
    
    .footer {
      text-align: center;
      font-size: 14px;
      color: #999999;
      padding-top: 32px;
      border-top: 1px solid #e5e5e5;
    }
    
    .footer a {
      color: #666666;
      text-decoration: none;
    }
    
    .footer a:hover {
      text-decoration: underline;
    }
    
    @media only screen and (max-width: 600px) {
      .container {
        padding: 32px 16px;
      }
      
      h1 {
        font-size: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">✓</div>
      <h1>נרשמת בהצלחה להתראות</h1>
    </div>
    
    <div class="content">
      <div class="info-card">
        <div class="info-label">תאריכים במעקב</div>
        <div class="info-value">${dateDisplay}</div>
      </div>
      
      <div class="features">
        <div class="feature">
          <span class="feature-icon">⏰</span>
          <span class="feature-text">המערכת סורקת תורים פנויים כל 5 דקות</span>
        </div>
        <div class="feature">
          <span class="feature-icon">📧</span>
          <span class="feature-text">תקבל הודעה למייל ברגע שיימצאו תורים</span>
        </div>
        <div class="feature">
          <span class="feature-icon">🎯</span>
          <span class="feature-text">תוכל לבחור תור מתאים או להמשיך לחפש</span>
        </div>
      </div>
      
      <center style="margin-top: 32px;">
        <a href="${baseUrl}/subscribe" class="button">
          ניהול ההרשמות שלי
        </a>
      </center>
    </div>
    
    <div class="footer">
      <p style="margin-bottom: 16px;">
        לביטול הרשמה זו: <a href="${unsubscribeUrl}">לחץ כאן</a>
      </p>
      <p>© 2025 תור רם-אל</p>
    </div>
  </div>
</body>
</html>
  `
  
  const text = `
נרשמת בהצלחה להתראות - תור רם-אל

תאריכים במעקב: ${dateDisplay}

מה קורה עכשיו?
⏰ המערכת סורקת תורים פנויים כל 5 דקות
📧 תקבל הודעה למייל ברגע שיימצאו תורים
🎯 תוכל לבחור תור מתאים או להמשיך לחפש

ניהול ההרשמות שלי: ${baseUrl}/subscribe

לביטול הרשמה זו: ${unsubscribeUrl}

© 2025 תור רם-אל
  `
  
  return { html, text }
}

export function generateWelcomeEmail(email: string): { html: string; text: string } {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'
  
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>ברוכים הבאים - תור רם-אל</title>
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
      max-width: 560px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 48px;
    }
    
    .welcome-icon {
      display: inline-block;
      width: 64px;
      height: 64px;
      margin-bottom: 24px;
    }
    
    .welcome-icon img {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      display: block;
    }
    
    h1 {
      font-size: 28px;
      font-weight: 600;
      color: #000000;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }
    
    .intro {
      font-size: 18px;
      color: #666666;
      margin-bottom: 40px;
    }
    
    .features {
      margin-bottom: 40px;
    }
    
    .feature-card {
      background-color: #f5f5f5;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
    }
    
    .feature-icon {
      font-size: 24px;
      margin-left: 16px;
    }
    
    .feature-content h3 {
      font-size: 16px;
      font-weight: 600;
      color: #000000;
      margin-bottom: 4px;
    }
    
    .feature-content p {
      font-size: 14px;
      color: #666666;
    }
    
    .cta {
      text-align: center;
      margin: 40px 0;
    }
    
    .button {
      display: inline-block;
      padding: 16px 40px;
      background-color: #000000;
      color: #ffffff;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
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
      
      h1 {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="welcome-icon">
        <img src="${baseUrl}/icons/icon-128x128.png" alt="תור רם-אל" width="64" height="64" style="border-radius: 16px;">
      </div>
      <h1>ברוכים הבאים!</h1>
      <p class="intro">החשבון שלך נוצר בהצלחה. כעת תוכל להנות מכל היתרונות של תור רם-אל.</p>
    </div>
    
    <div class="features">
      <div class="feature-card">
        <span class="feature-icon">🔍</span>
        <div class="feature-content">
          <h3>חיפוש תורים חכם</h3>
          <p>מצא תורים פנויים בקלות ובמהירות</p>
        </div>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">🔔</span>
        <div class="feature-content">
          <h3>התראות מיידיות</h3>
          <p>קבל הודעה ברגע שמתפנה תור</p>
        </div>
      </div>
      
      <div class="feature-card">
        <span class="feature-icon">📱</span>
        <div class="feature-content">
          <h3>נגישות מכל מקום</h3>
          <p>השתמש במערכת מכל מכשיר</p>
        </div>
      </div>
    </div>
    
    <div class="cta">
      <a href="${baseUrl}" class="button">
        כניסה למערכת
      </a>
    </div>
    
    <div class="footer">
      <p>© 2025 תור רם-אל</p>
    </div>
  </div>
</body>
</html>
  `
  
  const text = `
ברוכים הבאים לתור רם-אל!

החשבון שלך (${email}) נוצר בהצלחה.

כעת תוכל להנות מ:
🔍 חיפוש תורים חכם - מצא תורים פנויים בקלות
🔔 התראות מיידיות - קבל הודעה ברגע שמתפנה תור  
📱 נגישות מכל מקום - השתמש במערכת מכל מכשיר

כניסה למערכת: ${baseUrl}

© 2025 תור רם-אל
  `
  
  return { html, text }
}

export function generateMultiDateNotificationEmail(data: MultiDateAppointmentData): { html: string; text: string } {
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
      <h1>נמצאו תורים פנויים</h1>
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

export function generatePasswordResetOTPEmail(otp: string, email: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>קוד אימות לאיפוס סיסמה - תור רם-אל</title>
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
    
    .otp-container {
      background-color: #f5f5f5;
      border-radius: 12px;
      padding: 32px;
      margin-bottom: 32px;
      text-align: center;
      border: 2px solid #e5e5e5;
    }
    
    .otp-label {
      font-size: 14px;
      color: #666666;
      margin-bottom: 16px;
    }
    
    .otp-code {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 8px;
      color: #000000;
      font-family: 'Courier New', monospace;
      background-color: #ffffff;
      padding: 16px 24px;
      border-radius: 8px;
      display: inline-block;
      border: 2px solid #000000;
      margin-bottom: 16px;
    }
    
    .expiry-notice {
      font-size: 14px;
      color: #ef4444;
      font-weight: 500;
    }
    
    .instructions {
      margin-bottom: 32px;
      padding: 0 16px;
    }
    
    .instructions p {
      font-size: 16px;
      color: #333333;
      margin-bottom: 16px;
    }
    
    .steps {
      background-color: #fafafa;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
    }
    
    .step {
      display: flex;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    
    .step-number {
      display: inline-block;
      min-width: 28px;
      height: 28px;
      background-color: #000000;
      color: #ffffff;
      border-radius: 50%;
      text-align: center;
      line-height: 28px;
      font-size: 14px;
      font-weight: 600;
      margin-left: 12px;
    }
    
    .step-text {
      font-size: 15px;
      color: #333333;
      flex: 1;
    }
    
    .security-notice {
      padding: 16px;
      background-color: #fef3c7;
      border-radius: 8px;
      border: 1px solid #fcd34d;
      margin-bottom: 32px;
    }
    
    .security-notice-title {
      font-size: 14px;
      font-weight: 600;
      color: #92400e;
      margin-bottom: 8px;
    }
    
    .security-notice-text {
      font-size: 14px;
      color: #92400e;
    }
    
    .button {
      display: inline-block;
      padding: 16px 32px;
      background-color: #000000;
      color: #ffffff;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      text-align: center;
    }
    
    .footer {
      text-align: center;
      font-size: 14px;
      color: #999999;
      padding-top: 32px;
      border-top: 1px solid #e5e5e5;
    }
    
    .footer a {
      color: #666666;
      text-decoration: none;
    }
    
    .footer a:hover {
      text-decoration: underline;
    }
    
    @media only screen and (max-width: 600px) {
      .container {
        padding: 32px 16px;
      }
      
      h1 {
        font-size: 20px;
      }
      
      .otp-code {
        font-size: 28px;
        letter-spacing: 6px;
        padding: 12px 16px;
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
      <h1>איפוס סיסמה</h1>
      <p class="subtitle">קוד אימות חד-פעמי</p>
    </div>
    
    <div class="otp-container">
      <div class="otp-label">הקוד שלך:</div>
      <div class="otp-code">${otp}</div>
      <div class="expiry-notice">⏱️ תקף ל-10 דקות</div>
    </div>
    
    <div class="instructions">
      <p>ביקשת לאפס את הסיסמה שלך למערכת תור רם-אל.</p>
      
      <div class="steps">
        <div class="step">
          <span class="step-number">1</span>
          <span class="step-text">חזור לעמוד האיפוס במערכת</span>
        </div>
        <div class="step">
          <span class="step-number">2</span>
          <span class="step-text">הזן את קוד האימות המופיע למעלה</span>
        </div>
        <div class="step">
          <span class="step-number">3</span>
          <span class="step-text">הגדר סיסמה חדשה</span>
        </div>
      </div>
    </div>
    
    <div class="security-notice">
      <div class="security-notice-title">⚠️ לתשומת לבך</div>
      <div class="security-notice-text">
        אם לא ביקשת לאפס את הסיסמה שלך, אנא התעלם מהודעה זו. החשבון שלך בטוח ולא בוצעו בו שינויים.
      </div>
    </div>
    
    <center>
      <a href="${baseUrl}/login" class="button">
        עבור לעמוד ההתחברות
      </a>
    </center>
    
    <div class="footer">
      <p>נשלח עבור: ${email}</p>
      <p style="margin-top: 8px;">
        <a href="${baseUrl}">תור רם-אל</a> • 
        <a href="${baseUrl}/subscribe">ניהול התראות</a>
      </p>
      <p style="margin-top: 16px; font-size: 12px; color: #cccccc;">
        © 2025 תור רם-אל - כל הזכויות שמורות
      </p>
    </div>
  </div>
</body>
</html>
  `
} 