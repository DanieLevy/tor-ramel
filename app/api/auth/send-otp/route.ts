import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
})

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'כתובת דוא"ל לא תקינה' },
        { status: 400 }
      )
    }

    // Check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    let userId: string
    let isNewUser = false

    if (!existingUser) {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ email })
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating user:', createError)
        return NextResponse.json(
          { error: 'שגיאה ביצירת משתמש' },
          { status: 500 }
        )
      }

      userId = newUser.id
      isNewUser = true
    } else {
      userId = existingUser.id
    }

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10) // 10 minutes expiry

    // Save OTP to database
    const { error: otpError } = await supabase
      .from('user_otps')
      .insert({
        user_id: userId,
        otp_code: otp,
        expires_at: expiresAt.toISOString()
      })

    if (otpError) {
      console.error('Error saving OTP:', otpError)
      return NextResponse.json(
        { error: 'שגיאה בשמירת קוד אימות' },
        { status: 500 }
      )
    }

    // Send email
    const mailOptions = {
      from: `"תור רם-אל" <${process.env.EMAIL_SENDER}>`,
      to: email,
      subject: 'קוד אימות לכניסה למערכת תור רם-אל',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">
            ${isNewUser ? 'ברוכים הבאים לתור רם-אל!' : 'שלום, שמחים לראותך שוב!'}
          </h2>
          
          <p style="font-size: 16px; color: #666;">
            ${isNewUser 
              ? 'תודה שהצטרפת למערכת שלנו. כדי להשלים את תהליך ההרשמה, הזן את הקוד הבא:'
              : 'זיהינו ניסיון כניסה לחשבונך. כדי להמשיך, הזן את הקוד הבא:'
            }
          </p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #333; font-size: 32px; letter-spacing: 8px; margin: 0;">${otp}</h1>
          </div>
          
          <p style="font-size: 14px; color: #999; text-align: center;">
            הקוד תקף ל-10 דקות בלבד
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            אם לא ביקשת קוד זה, אנא התעלם מהודעה זו.
          </p>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({
      success: true,
      message: 'קוד אימות נשלח לכתובת הדוא"ל שלך',
      isNewUser
    })

  } catch (error) {
    console.error('Error in send-otp:', error)
    return NextResponse.json(
      { error: 'שגיאה בשליחת קוד אימות' },
      { status: 500 }
    )
  }
} 