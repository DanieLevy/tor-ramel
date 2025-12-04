import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { z } from 'zod'

const verifyOtpSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  otp: z.string().length(6, 'קוד האימות חייב להכיל 6 ספרות')
})

export async function POST(request: NextRequest) {
  try {
    console.log('Verify OTP request received')
    
    const body = await request.json()
    
    // Validate input
    const validationResult = verifyOtpSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, otp } = validationResult.data
    console.log('Verifying OTP for email:', email)

    // Get user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'קוד האימות שגוי או פג תוקף' },
        { status: 400 }
      )
    }

    // Check OTP
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('user_otps')
      .select('*')
      .eq('user_id', user.id)
      .eq('otp_code', otp)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (otpError || !otpRecord) {
      console.log('OTP verification failed:', otpError)
      return NextResponse.json(
        { error: 'קוד האימות שגוי או פג תוקף' },
        { status: 400 }
      )
    }

    // Mark OTP as used
    await supabaseAdmin
      .from('user_otps')
      .update({ used: true })
      .eq('id', otpRecord.id)

    console.log('OTP verified successfully for:', email)

    // Generate a temporary token for password reset (valid for 5 minutes)
    const resetToken = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: email,
        timestamp: Date.now(),
        purpose: 'password-reset'
      })
    ).toString('base64')

    return NextResponse.json({
      success: true,
      message: 'קוד האימות אומת בהצלחה',
      resetToken: resetToken
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    
    return NextResponse.json(
      { error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
} 