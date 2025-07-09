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
  
  // Group times by period
  const groupedTimes = {
    morning: times.filter(time => {
      const hour = parseInt(time.split(':')[0])
      return hour >= 6 && hour < 12
    }),
    afternoon: times.filter(time => {
      const hour = parseInt(time.split(':')[0])
      return hour >= 12 && hour < 17
    }),
    evening: times.filter(time => {
      const hour = parseInt(time.split(':')[0])
      return hour >= 17 && hour < 22
    })
  }
  
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      line-height: 1.5;
      color: #1a1a1a;
      background-color: #ffffff;
      direction: rtl;
      -webkit-font-smoothing: antialiased;
    }
    
    .container {
      max-width: 400px;
      margin: 0 auto;
      padding: 24px 16px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .logo {
      display: inline-block;
      width: 40px;
      height: 40px;
      margin-bottom: 12px;
      background-color: #f5f5f5;
      border-radius: 8px;
      padding: 8px;
    }
    
    .logo svg {
      width: 24px;
      height: 24px;
      fill: #1a1a1a;
    }
    
    h1 {
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 4px;
      letter-spacing: -0.3px;
    }
    
    .subtitle {
      font-size: 14px;
      color: #666666;
    }
    
    .date-section {
      background-color: #f5f5f5;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: center;
    }
    
    .date-section strong {
      display: block;
      font-size: 16px;
      color: #1a1a1a;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .date-section span {
      font-size: 14px;
      color: #666666;
    }
    
    .times-section {
      margin-bottom: 24px;
    }
    
    .times-title {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 12px;
      text-align: center;
    }
    
    .time-period {
      margin-bottom: 16px;
    }
    
    .period-label {
      font-size: 12px;
      color: #666666;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .times-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
      gap: 8px;
    }
    
    .time-slot {
      padding: 8px 4px;
      background-color: #ffffff;
      border: 1px solid #1a1a1a;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      color: #1a1a1a;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    
    /* For many times, switch to compact list */
    .times-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      font-size: 14px;
      color: #1a1a1a;
      line-height: 1.8;
    }
    
    .times-list .time-slot {
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 13px;
    }
    
    .actions {
      margin: 32px 0 24px;
    }
    
    .button {
      display: block;
      width: 100%;
      padding: 14px 24px;
      margin-bottom: 12px;
      text-align: center;
      text-decoration: none;
      font-size: 15px;
      font-weight: 500;
      border-radius: 6px;
      transition: opacity 0.2s ease;
    }
    
    .button-primary {
      background-color: #1a1a1a;
      color: #ffffff;
    }
    
    .button-secondary {
      background-color: #ffffff;
      color: #1a1a1a;
      border: 1px solid #1a1a1a;
    }
    
    .notice {
      padding: 12px;
      background-color: #f5f5f5;
      border-radius: 6px;
      font-size: 12px;
      color: #666666;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999999;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
    }
    
    .footer a {
      color: #666666;
      text-decoration: none;
    }
    
    .footer-links {
      margin-bottom: 12px;
    }
    
    .footer-links a {
      margin: 0 8px;
    }
    
    @media only screen and (max-width: 400px) {
      .container {
        padding: 20px 12px;
      }
      
      h1 {
        font-size: 18px;
      }
      
      .times-grid {
        grid-template-columns: repeat(auto-fill, minmax(55px, 1fr));
        gap: 6px;
      }
      
      .button {
        font-size: 14px;
        padding: 12px 20px;
      }
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #1a1a1a;
        color: #e0e0e0;
      }
      
      .header {
        border-bottom-color: #333333;
      }
      
      h1 {
        color: #ffffff;
      }
      
      .date-section {
        background-color: #2a2a2a;
      }
      
      .date-section strong {
        color: #ffffff;
      }
      
      .time-slot {
        background-color: #1a1a1a;
        border-color: #e0e0e0;
        color: #e0e0e0;
      }
      
      .button-primary {
        background-color: #ffffff;
        color: #1a1a1a;
      }
      
      .button-secondary {
        background-color: #1a1a1a;
        color: #ffffff;
        border-color: #ffffff;
      }
      
      .notice {
        background-color: #2a2a2a;
      }
      
      .footer {
        border-top-color: #333333;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
        </svg>
      </div>
      <h1>תורים פנויים</h1>
      <p class="subtitle">מספרת רם-אל</p>
    </div>
    
    <div class="date-section">
      <strong>${dayName}</strong>
      <span>${date}</span>
    </div>
    
    <div class="times-section">
      <h2 class="times-title">${times.length} תורים זמינים</h2>
      
      ${Object.entries(groupedTimes)
        .filter(([_, times]) => times.length > 0)
        .map(([period, periodTimes]) => {
          const periodLabels = {
            morning: 'בוקר',
            afternoon: 'צהריים',
            evening: 'ערב'
          }
          
          // Use compact list for more than 6 times in a period
          const isCompact = periodTimes.length > 6
          
          return `
            <div class="time-period">
              <div class="period-label">${periodLabels[period as keyof typeof periodLabels]} (${periodTimes.length})</div>
              <div class="${isCompact ? 'times-list' : 'times-grid'}">
                ${periodTimes.map(time => `<div class="time-slot">${time}</div>`).join('')}
              </div>
            </div>
          `
        }).join('')}
    </div>
    
    <div class="actions">
      <a href="${approveUrl}" class="button button-primary">
        מצאתי תור מתאים
      </a>
      <a href="${declineUrl}" class="button button-secondary">
        אף תור לא מתאים לי
      </a>
    </div>
    
    <div class="notice">
      💡 בחירת "אף תור לא מתאים" תמנע התראות על השעות הללו בלבד
    </div>
    
    <div class="footer">
      <div class="footer-links">
        <a href="${unsubscribeUrl}">ביטול הרשמה</a>
        <span>•</span>
        <a href="${baseUrl}">כניסה למערכת</a>
      </div>
      <div>© 2025 תור רם-אל</div>
    </div>
  </div>
</body>
</html>
  `
  
  const text = `
תורים פנויים - תור רם-אל

${dayName}, ${date}

${times.length} תורים זמינים:
${times.join(', ')}

מצאתי תור מתאים:
${approveUrl}

אף תור לא מתאים לי:
${declineUrl}

💡 בחירת "אף תור לא מתאים" תמנע התראות על השעות הללו בלבד

ביטול הרשמה: ${unsubscribeUrl}

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
  
  // Filter out days with no times
  const validAppointments = appointments.filter(apt => apt.times.length > 0)
  
  if (validAppointments.length === 0) {
    return { html: '', text: '' }
  }
  
  // Create URL with parameters for actions
  const allTimes = validAppointments.flatMap(apt => 
    apt.times.map(time => `${apt.date}:${time}`)
  ).join(',')
  
  const approveUrl = `${baseUrl}/notification-action?action=approve&subscription=${subscriptionId}`
  const declineUrl = `${baseUrl}/notification-action?action=decline&subscription=${subscriptionId}&times=${encodeURIComponent(allTimes)}`
  const unsubscribeUrl = `${baseUrl}/notification-action?action=unsubscribe&subscription=${subscriptionId}`
  
  // Calculate total appointments
  const totalAppointments = validAppointments.reduce((sum, apt) => sum + apt.times.length, 0)
  
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      line-height: 1.5;
      color: #1a1a1a;
      background-color: #ffffff;
      direction: rtl;
      -webkit-font-smoothing: antialiased;
    }
    
    .container {
      max-width: 400px;
      margin: 0 auto;
      padding: 24px 16px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .logo {
      display: inline-block;
      width: 40px;
      height: 40px;
      margin-bottom: 12px;
      background-color: #f5f5f5;
      border-radius: 8px;
      padding: 8px;
    }
    
    .logo svg {
      width: 24px;
      height: 24px;
      fill: #1a1a1a;
    }
    
    h1 {
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 4px;
      letter-spacing: -0.3px;
    }
    
    .subtitle {
      font-size: 14px;
      color: #666666;
    }
    
    .summary {
      background-color: #f5f5f5;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: center;
    }
    
    .summary-number {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    
    .summary-text {
      font-size: 14px;
      color: #666666;
    }
    
    .days-container {
      margin-bottom: 24px;
    }
    
    .day-section {
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .day-section:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    
    .day-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .day-info {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
    }
    
    .day-count {
      font-size: 12px;
      color: #666666;
      background-color: #f5f5f5;
      padding: 2px 8px;
      border-radius: 12px;
    }
    
    .times-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(55px, 1fr));
      gap: 6px;
    }
    
    .time-slot {
      padding: 6px 4px;
      background-color: #ffffff;
      border: 1px solid #1a1a1a;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      color: #1a1a1a;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    
    .time-slot.new {
      background-color: #1a1a1a;
      color: #ffffff;
    }
    
    .actions {
      margin: 32px 0 24px;
    }
    
    .button {
      display: block;
      width: 100%;
      padding: 14px 24px;
      margin-bottom: 12px;
      text-align: center;
      text-decoration: none;
      font-size: 15px;
      font-weight: 500;
      border-radius: 6px;
    }
    
    .button-primary {
      background-color: #1a1a1a;
      color: #ffffff;
    }
    
    .button-secondary {
      background-color: #ffffff;
      color: #1a1a1a;
      border: 1px solid #1a1a1a;
    }
    
    .notice {
      padding: 12px;
      background-color: #f5f5f5;
      border-radius: 6px;
      font-size: 12px;
      color: #666666;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    
    .legend {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-bottom: 20px;
      font-size: 12px;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .legend-box {
      width: 16px;
      height: 16px;
      border: 1px solid #1a1a1a;
      border-radius: 3px;
    }
    
    .legend-box.new {
      background-color: #1a1a1a;
    }
    
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999999;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
    }
    
    .footer a {
      color: #666666;
      text-decoration: none;
    }
    
    .footer-links {
      margin-bottom: 12px;
    }
    
    .footer-links a {
      margin: 0 8px;
    }
    
    @media only screen and (max-width: 400px) {
      .container {
        padding: 20px 12px;
      }
      
      h1 {
        font-size: 18px;
      }
      
      .times-container {
        grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
        gap: 4px;
      }
      
      .time-slot {
        font-size: 12px;
        padding: 5px 2px;
      }
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #1a1a1a;
        color: #e0e0e0;
      }
      
      .header {
        border-bottom-color: #333333;
      }
      
      h1 {
        color: #ffffff;
      }
      
      .summary {
        background-color: #2a2a2a;
      }
      
      .summary-number {
        color: #ffffff;
      }
      
      .day-section {
        border-bottom-color: #333333;
      }
      
      .day-info {
        color: #ffffff;
      }
      
      .day-count {
        background-color: #2a2a2a;
      }
      
      .time-slot {
        background-color: #1a1a1a;
        border-color: #666666;
        color: #e0e0e0;
      }
      
      .time-slot.new {
        background-color: #ffffff;
        color: #1a1a1a;
      }
      
      .button-primary {
        background-color: #ffffff;
        color: #1a1a1a;
      }
      
      .button-secondary {
        background-color: #1a1a1a;
        color: #ffffff;
        border-color: #ffffff;
      }
      
      .notice {
        background-color: #2a2a2a;
      }
      
      .legend-box {
        border-color: #666666;
      }
      
      .legend-box.new {
        background-color: #ffffff;
      }
      
      .footer {
        border-top-color: #333333;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
        </svg>
      </div>
      <h1>תורים פנויים</h1>
      <p class="subtitle">מספרת רם-אל</p>
    </div>
    
    <div class="summary">
      <div class="summary-number">${totalAppointments}</div>
      <div class="summary-text">תורים זמינים ב-${validAppointments.length} ימים</div>
    </div>
    
    ${validAppointments.some(apt => apt.newTimes && apt.newTimes.length > 0) ? `
      <div class="legend">
        <div class="legend-item">
          <div class="legend-box"></div>
          <span>תורים קיימים</span>
        </div>
        <div class="legend-item">
          <div class="legend-box new"></div>
          <span>תורים חדשים</span>
        </div>
      </div>
    ` : ''}
    
    <div class="days-container">
      ${validAppointments.map(apt => {
        const date = new Date(apt.date + 'T00:00:00')
        const dateDisplay = date.toLocaleDateString('he-IL', { 
          weekday: 'short',
          day: 'numeric',
          month: 'numeric'
        })
        
        // Combine all times and mark new ones
        const allTimes = apt.times.map(time => ({ time, isNew: false }))
        if (apt.newTimes) {
          apt.newTimes.forEach(time => {
            if (!apt.times.includes(time)) {
              allTimes.push({ time, isNew: true })
            }
          })
        }
        
        // Sort times
        allTimes.sort((a, b) => {
          const timeA = parseInt(a.time.replace(':', ''))
          const timeB = parseInt(b.time.replace(':', ''))
          return timeA - timeB
        })
        
        return `
          <div class="day-section">
            <div class="day-header">
              <div class="day-info">${apt.dayName}, ${dateDisplay}</div>
              <div class="day-count">${allTimes.length} תורים</div>
            </div>
            <div class="times-container">
              ${allTimes.map(({ time, isNew }) => 
                `<div class="time-slot${isNew ? ' new' : ''}">${time}</div>`
              ).join('')}
            </div>
          </div>
        `
      }).join('')}
    </div>
    
    <div class="actions">
      <a href="${approveUrl}" class="button button-primary">
        מצאתי תור מתאים
      </a>
      <a href="${declineUrl}" class="button button-secondary">
        אף תור לא מתאים לי
      </a>
    </div>
    
    <div class="notice">
      💡 בחירת "אף תור לא מתאים" תמנע התראות עתידיות על כל התורים המוצגים
    </div>
    
    <div class="footer">
      <div class="footer-links">
        <a href="${unsubscribeUrl}">ביטול הרשמה</a>
        <span>•</span>
        <a href="${baseUrl}">כניסה למערכת</a>
      </div>
      <div>© 2025 תור רם-אל</div>
    </div>
  </div>
</body>
</html>
  `
  
  const text = validAppointments.map(apt => {
    return `${apt.dayName}, ${apt.date}: ${apt.times.join(', ')}`
  }).join('\n\n')
  
  return { 
    html, 
    text: `תורים פנויים - תור רם-אל

נמצאו ${totalAppointments} תורים זמינים ב-${validAppointments.length} ימים:

${text}

מצאתי תור מתאים: ${approveUrl}
אף תור לא מתאים לי: ${declineUrl}

ביטול הרשמה: ${unsubscribeUrl}

© 2025 תור רם-אל` 
  }
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