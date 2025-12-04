import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { z } from 'zod'
import { generatePasswordResetOTPEmail } from '@/lib/email-templates'
import nodemailer from 'nodemailer'

const sendOtpSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה')
})

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
})

export async function POST(request: NextRequest) {
  try {
    console.log('Send reset OTP request received')
    
    const body = await request.json()
    
    // Validate input
    const validationResult = sendOtpSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email } = validationResult.data
    console.log('Checking if user exists:', email)

    // Check if user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (userError || !user) {
      // Don't reveal if user exists or not for security
      console.log('User not found, but returning success for security')
      return NextResponse.json({
        success: true,
        message: 'אם כתובת האימייל קיימת במערכת, נשלח אליה קוד אימות'
      })
    }

    console.log('User found, generating OTP...')
    
    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Mark any existing OTPs as used
    await supabaseAdmin
      .from('user_otps')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false)

    // Store OTP in database
    const { error: otpError } = await supabaseAdmin
      .from('user_otps')
      .insert({
        user_id: user.id,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        used: false
      })

    if (otpError) {
      console.error('Error storing OTP:', otpError)
      return NextResponse.json(
        { error: 'שגיאה בשליחת קוד האימות' },
        { status: 500 }
      )
    }

    // Send OTP via email
    try {
      console.log('Sending OTP email to:', email)
      
      const emailHtml = generatePasswordResetOTPEmail(otp, email)
      
      await transporter.sendMail({
        from: `"תור רם-אל" <${process.env.EMAIL_SENDER}>`,
        to: email,
        subject: 'קוד אימות לאיפוס סיסמה - תור רם-אל',
        html: emailHtml,
        text: `קוד האימות שלך הוא: ${otp}\n\nהקוד תקף ל-10 דקות.`
      })

      console.log('OTP email sent successfully')
    } catch (emailError) {
      console.error('Error sending email:', emailError)
      
      // Delete the OTP if email fails
      await supabaseAdmin
        .from('user_otps')
        .delete()
        .eq('user_id', user.id)
        .eq('otp_code', otp)
      
      return NextResponse.json(
        { error: 'שגיאה בשליחת האימייל. אנא נסה שוב.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'קוד אימות נשלח לכתובת האימייל שלך'
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    
    return NextResponse.json(
      { error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
} 