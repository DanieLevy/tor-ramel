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
    
    console.log('📧 OTP Request for email:', email)
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    console.log('🔑 Generated OTP:', otp)
    
    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking user:', checkError)
    }

    let userId: string

    if (existingUser) {
      userId = existingUser.id
      console.log('✅ Existing user found:', userId)
      
      // Update last login attempt
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId)
      
      if (updateError) {
        console.error('❌ Error updating last login:', updateError)
      }
    } else {
      console.log('🆕 Creating new user...')
      
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
        console.error('❌ Error creating user:', userError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      userId = newUser.id
      console.log('✅ New user created:', userId)
    }

    // Store OTP in database - FIXED: using 'used' instead of 'is_used'
    console.log('💾 Storing OTP in database...')
    const otpData = {
      user_id: userId,
      otp_code: otp,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      used: false // FIXED: was 'is_used'
    }
    console.log('OTP data:', otpData)
    
    const { error: otpError } = await supabase
      .from('user_otps')
      .insert(otpData)

    if (otpError) {
      console.error('❌ Error storing OTP:', otpError)
      console.error('OTP error details:', JSON.stringify(otpError, null, 2))
      return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 })
    }
    
    console.log('✅ OTP stored successfully')

    // Send OTP email using the new utility
    console.log('📨 Sending OTP email...')
    const emailSent = await sendOTPEmail(email, otp)

    if (!emailSent) {
      console.error('❌ Failed to send email')
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    console.log('✅ OTP email sent successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'OTP sent successfully' 
    })

  } catch (error) {
    console.error('❌ Error in send-otp:', error)
    console.error('Error details:', error instanceof Error ? error.stack : error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 