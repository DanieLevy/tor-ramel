import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json()
    
    if (!email || !otp) {
      return NextResponse.json(
        { error: 'נדרשים דוא"ל וקוד אימות' },
        { status: 400 }
      )
    }

    // Get user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (!user || userError) {
      return NextResponse.json(
        { error: 'משתמש לא נמצא' },
        { status: 404 }
      )
    }

    // Check OTP validity
    const now = new Date().toISOString()
    const { data: validOtp, error: otpError } = await supabase
      .from('user_otps')
      .select('*')
      .eq('user_id', user.id)
      .eq('otp_code', otp)
      .eq('used', false)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!validOtp || otpError) {
      return NextResponse.json(
        { error: 'קוד אימות לא תקין או פג תוקף' },
        { status: 400 }
      )
    }

    // Mark OTP as used
    await supabase
      .from('user_otps')
      .update({ used: true })
      .eq('id', validOtp.id)

    // Update user's last login
    await supabase
      .from('users')
      .update({ last_login: now })
      .eq('id', user.id)

    // Return user data for client
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: email,
        lastLogin: now
      }
    })

  } catch (error) {
    console.error('Error in verify-otp:', error)
    return NextResponse.json(
      { error: 'שגיאה באימות קוד' },
      { status: 500 }
    )
  }
} 