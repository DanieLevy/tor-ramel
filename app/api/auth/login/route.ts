import { NextRequest, NextResponse } from 'next/server'
import { loginSchema } from '@/lib/auth/validation'
import { verifyPassword } from '@/lib/auth/password'
import { generateTokens, setAuthCookies } from '@/lib/auth/jwt'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    console.log(`[LOGIN:${requestId}] 📥 Login request received`)
    console.log(`[LOGIN:${requestId}] 🌍 Environment check:`, {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV
    })
    
    const body = await request.json()
    
    // Validate input
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, password } = validationResult.data
    console.log(`[LOGIN:${requestId}] 👤 Attempting login for email:`, email)

    // Check if user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, password')
      .eq('email', email)
      .single()

    if (userError) {
      console.error('Database error during login:', {
        code: userError.code,
        message: userError.message,
        details: userError.details,
        hint: userError.hint
      })
      
      if (userError.code === 'PGRST116') {
        // No user found
        return NextResponse.json(
          { error: 'אימייל או סיסמה שגויים' },
          { status: 401 }
        )
      }
      
      // Other database error
      return NextResponse.json(
        { error: 'שגיאת מסד נתונים' },
        { status: 500 }
      )
    }

    if (!user) {
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
      console.log(`[LOGIN:${requestId}] ❌ Invalid password for user:`, email)
      return NextResponse.json(
        { error: 'אימייל או סיסמה שגויים' },
        { status: 401 }
      )
    }

    console.log(`[LOGIN:${requestId}] ✅ Password verified, generating tokens...`)

    // Generate token
    const tokens = await generateTokens({
      userId: user.id,
      email: user.email
    })

    // Update last login timestamp in database
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        last_login: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating last login:', updateError)
      // Don't fail the login if update fails
    }

    // Set cookies
    await setAuthCookies(tokens)

    console.log(`[LOGIN:${requestId}] 🎉 Login successful for user:`, email)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      }
    })
  } catch (error) {
    console.error(`[LOGIN:${requestId}] ❌ Login error:`, error)
    console.error(`[LOGIN:${requestId}] 📋 Error details:`, {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined
    })
    
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { message: String(error) }
    
    return NextResponse.json(
      { 
        error: 'שגיאת שרת פנימית',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    )
  }
} 