interface AppointmentData {
  date: string
  dayName: string
  times: string[]
  subscriptionId: string
}

export function generateNotificationEmail(data: AppointmentData): { html: string; text: string } {
  const { date, dayName, times, subscriptionId } = data
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tor-ramel.netlify.app'
  
  // Create URL with parameters for approve/decline actions
  const approveUrl = `${baseUrl}/notification-action?action=approve&subscription=${subscriptionId}`
  const declineUrl = `${baseUrl}/notification-action?action=decline&subscription=${subscriptionId}&times=${encodeURIComponent(times.join(','))}&date=${date}`
  
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>התראה על תורים פנויים - תור רם-אל</title>
  <style>
    @font-face {
      font-family: 'Heebo';
      src: url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700&display=swap');
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      direction: rtl;
    }
    
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .header p {
      font-size: 16px;
      opacity: 0.9;
    }
    
    .content {
      padding: 40px 30px;
    }
    
    .date-section {
      background-color: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      text-align: center;
    }
    
    .date-section h2 {
      color: #667eea;
      font-size: 24px;
      margin-bottom: 5px;
    }
    
    .date-section p {
      color: #666;
      font-size: 18px;
    }
    
    .times-section {
      margin-bottom: 30px;
    }
    
    .times-section h3 {
      font-size: 20px;
      margin-bottom: 15px;
      color: #333;
    }
    
    .times-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .time-slot {
      background-color: #e3f2fd;
      border: 2px solid #2196f3;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      font-size: 18px;
      font-weight: 600;
      color: #1976d2;
    }
    
    .action-buttons {
      display: flex;
      gap: 15px;
      justify-content: center;
      margin-top: 30px;
    }
    
    .btn {
      display: inline-block;
      padding: 14px 30px;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      text-align: center;
      transition: all 0.3s ease;
      cursor: pointer;
    }
    
    .btn-approve {
      background-color: #4caf50;
      color: white;
    }
    
    .btn-approve:hover {
      background-color: #45a049;
    }
    
    .btn-decline {
      background-color: #ff9800;
      color: white;
    }
    
    .btn-decline:hover {
      background-color: #f57c00;
    }
    
    .info-section {
      background-color: #fff3cd;
      border: 1px solid #ffeeba;
      border-radius: 8px;
      padding: 15px;
      margin-top: 30px;
    }
    
    .info-section p {
      color: #856404;
      font-size: 14px;
    }
    
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }
    
    .footer p {
      color: #666;
      font-size: 14px;
      margin-bottom: 10px;
    }
    
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    
    @media only screen and (max-width: 600px) {
      .header {
        padding: 30px 20px;
      }
      
      .header h1 {
        font-size: 24px;
      }
      
      .content {
        padding: 30px 20px;
      }
      
      .action-buttons {
        flex-direction: column;
      }
      
      .btn {
        width: 100%;
      }
      
      .times-grid {
        grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>🎉 נמצאו תורים פנויים!</h1>
      <p>במספרת רם-אל</p>
    </div>
    
    <div class="content">
      <div class="date-section">
        <h2>${dayName}</h2>
        <p>${date}</p>
      </div>
      
      <div class="times-section">
        <h3>השעות הפנויות:</h3>
        <div class="times-grid">
          ${times.map(time => `<div class="time-slot">${time}</div>`).join('')}
        </div>
      </div>
      
      <div class="action-buttons">
        <a href="${approveUrl}" class="btn btn-approve">
          ✅ מצאתי תור מתאים
        </a>
        <a href="${declineUrl}" class="btn btn-decline">
          ❌ אף תור לא מתאים
        </a>
      </div>
      
      <div class="info-section">
        <p>
          <strong>שים לב:</strong> אם תבחר "אף תור לא מתאים", לא תקבל התראות נוספות על השעות הללו,
          אך תמשיך לקבל התראות אם יתפנו שעות חדשות.
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p>הודעה זו נשלחה אליך כי נרשמת לקבלת התראות על תורים פנויים.</p>
      <p>
        <a href="${baseUrl}/subscribe">ניהול הרשמות</a> | 
        <a href="${baseUrl}">כניסה לאתר</a>
      </p>
      <p style="margin-top: 20px; font-size: 12px; color: #999;">
        © 2025 תור רם-אל. כל הזכויות שמורות.
      </p>
    </div>
  </div>
</body>
</html>
  `
  
  const text = `
התראה על תורים פנויים - תור רם-אל

נמצאו תורים פנויים!

תאריך: ${dayName}, ${date}

השעות הפנויות:
${times.join(', ')}

מה ברצונך לעשות?

1. מצאתי תור מתאים - לחץ כאן: ${approveUrl}

2. אף תור לא מתאים - לחץ כאן: ${declineUrl}

שים לב: אם תבחר "אף תור לא מתאים", לא תקבל התראות נוספות על השעות הללו,
אך תמשיך לקבל התראות אם יתפנו שעות חדשות.

ניהול הרשמות: ${baseUrl}/subscribe
כניסה לאתר: ${baseUrl}

© 2025 תור רם-אל. כל הזכויות שמורות.
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
  <title>ברוכים הבאים לתור רם-אל</title>
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
    }
    
    .button {
      display: inline-block;
      background-color: #667eea;
      color: white;
      padding: 14px 30px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin-top: 20px;
    }
    
    .features {
      margin: 30px 0;
    }
    
    .feature {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .feature-icon {
      font-size: 24px;
      margin-left: 15px;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>ברוכים הבאים לתור רם-אל! 🎉</h1>
    </div>
    
    <div class="content">
      <p>שלום ${email},</p>
      
      <p>תודה שהצטרפת אלינו! כעת תוכל להנות מכל היתרונות של המערכת שלנו:</p>
      
      <div class="features">
        <div class="feature">
          <span class="feature-icon">📅</span>
          <span>צפייה בתורים פנויים בזמן אמת</span>
        </div>
        <div class="feature">
          <span class="feature-icon">🔔</span>
          <span>קבלת התראות על תורים חדשים</span>
        </div>
        <div class="feature">
          <span class="feature-icon">📱</span>
          <span>גישה נוחה מכל מכשיר</span>
        </div>
      </div>
      
      <p>מוכן להתחיל?</p>
      
      <a href="${baseUrl}" class="button">כניסה לאתר</a>
    </div>
  </div>
</body>
</html>
  `
  
  const text = `
ברוכים הבאים לתור רם-אל!

שלום ${email},

תודה שהצטרפת אלינו! כעת תוכל להנות מכל היתרונות של המערכת שלנו:

- צפייה בתורים פנויים בזמן אמת
- קבלת התראות על תורים חדשים
- גישה נוחה מכל מכשיר

מוכן להתחיל? כנס לאתר: ${baseUrl}
  `
  
  return { html, text }
} 