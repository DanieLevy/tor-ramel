import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loginSchema } from '@/lib/auth/validation'
import { verifyPassword } from '@/lib/auth/password'
import { generateTokens, setAuthCookies } from '@/lib/auth/jwt'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, password } = validationResult.data

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, password')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'אימייל או סיסמה שגויים' },
        { status: 401 }
      )
    }

    // Check if user has a password (might be OTP-only user)
    if (!user.password) {
      return NextResponse.json(
        { error: 'משתמש זה לא הגדיר סיסמה. אנא השתמש בכניסה עם קוד חד-פעמי' },
        { status: 400 }
      )
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password)
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'אימייל או סיסמה שגויים' },
        { status: 401 }
      )
    }

    // Generate tokens
    const tokens = await generateTokens({
      userId: user.id,
      email: user.email
    })

    // Update refresh token in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        refresh_token: tokens.refreshToken,
        last_login: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating refresh token:', updateError)
    }

    // Set cookies
    await setAuthCookies(tokens)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
} 