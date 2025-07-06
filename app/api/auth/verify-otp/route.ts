import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Secret for JWT - in production, use a secure random key
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json()
    
    console.log('🔐 OTP verification request for:', email)
    
    if (!email || !otp) {
      return NextResponse.json({ 
        error: 'נדרשים אימייל וקוד אימות' 
      }, { status: 400 })
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (userError || !user) {
      console.error('❌ User not found:', userError)
      return NextResponse.json({ 
        error: 'משתמש לא נמצא' 
      }, { status: 404 })
    }

    console.log('✅ User found:', user.id)

    // Verify OTP - FIXED: using 'used' instead of 'is_used'
    const { data: validOtp, error: otpError } = await supabase
      .from('user_otps')
      .select('*')
      .eq('user_id', user.id)
      .eq('otp_code', otp)
      .eq('used', false)  // FIXED: was 'is_used'
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (otpError || !validOtp) {
      console.error('❌ Invalid OTP:', otpError)
      return NextResponse.json({ 
        error: 'קוד אימות לא תקין או שפג תוקפו' 
      }, { status: 401 })
    }

    console.log('✅ Valid OTP found')

    // Mark OTP as used - FIXED: using 'used' instead of 'is_used'
    const { error: updateError } = await supabase
      .from('user_otps')
      .update({ used: true })  // FIXED: was 'is_used'
      .eq('id', validOtp.id)

    if (updateError) {
      console.error('❌ Error updating OTP:', updateError)
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const response = NextResponse.json({ 
      success: true,
      message: 'התחברת בהצלחה',
      token,
      email
    })

    // Set secure cookie
    response.cookies.set('tor-ramel-auth', JSON.stringify({ email, userId: user.id }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    console.log('✅ Login successful for:', email)

    return response

  } catch (error) {
    console.error('❌ Error in verify-otp:', error)
    console.error('Error details:', error instanceof Error ? error.stack : error)
    return NextResponse.json({ 
      error: 'שגיאת שרת פנימית' 
    }, { status: 500 })
  }
} 