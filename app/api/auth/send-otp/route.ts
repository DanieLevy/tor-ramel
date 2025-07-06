import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendOTPEmail } from '@/lib/email-sender'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    let userId: string

    if (existingUser) {
      userId = existingUser.id
      // Update last login attempt
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId)
    } else {
      // Create new user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({ 
          email, 
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          is_active: true
        })
        .select('id')
        .single()

      if (userError || !newUser) {
        console.error('Error creating user:', userError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      userId = newUser.id
    }

    // Store OTP in database
    const { error: otpError } = await supabase
      .from('user_otps')
      .insert({
        user_id: userId,
        otp_code: otp,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        is_used: false
      })

    if (otpError) {
      console.error('Error storing OTP:', otpError)
      return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 })
    }

    // Send OTP email using the new utility
    const emailSent = await sendOTPEmail(email, otp)

    if (!emailSent) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'OTP sent successfully' 
    })

  } catch (error) {
    console.error('Error in send-otp:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 