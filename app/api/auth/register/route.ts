import { NextRequest, NextResponse } from 'next/server'
import { registerSchema } from '@/lib/auth/validation'
import { hashPassword } from '@/lib/auth/password'
import { generateTokens, setAuthCookies } from '@/lib/auth/jwt'
import { supabaseAdmin } from '@/lib/supabase/client'
import { ensureUserPreferences } from '@/lib/user-preferences'

export async function POST(request: NextRequest) {
  try {
    console.log('Register request received')
    
    const body = await request.json()
    
    // Validate input
    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, password } = validationResult.data
    console.log('Attempting to register user:', email)

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, password')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // Database error (not "no rows found")
      console.error('Database error checking existing user:', {
        code: checkError.code,
        message: checkError.message,
        details: checkError.details,
        hint: checkError.hint
      })
      
      return NextResponse.json(
        { 
          error: 'שגיאת מסד נתונים',
          details: process.env.NODE_ENV === 'development' ? checkError : undefined
        },
        { status: 500 }
      )
    }

    if (existingUser && existingUser.password) {
      return NextResponse.json(
        { error: 'משתמש עם כתובת אימייל זו כבר קיים' },
        { status: 400 }
      )
    }

    console.log('Hashing password...')
    // Hash password
    const hashedPassword = await hashPassword(password)

    let user

    // If user exists without password, update their password
    if (existingUser && !existingUser.password) {
      console.log('Updating existing user password...')
      
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          password: hashedPassword,
          last_login: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select('id, email')
        .single()

      if (updateError || !updatedUser) {
        console.error('Error updating user:', {
          error: updateError,
          message: updateError?.message,
          details: updateError?.details,
          hint: updateError?.hint,
          code: updateError?.code
        })
        return NextResponse.json(
          { 
            error: 'שגיאה בעדכון משתמש',
            details: process.env.NODE_ENV === 'development' ? updateError : undefined
          },
          { status: 500 }
        )
      }
      
      user = updatedUser
    } else {
      console.log('Creating new user...')
      
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          password: hashedPassword,
          created_at: new Date().toISOString(),
          is_active: true
        })
        .select('id, email')
        .single()

      if (createError || !newUser) {
        console.error('Error creating user:', {
          error: createError,
          message: createError?.message,
          details: createError?.details,
          hint: createError?.hint,
          code: createError?.code
        })
        return NextResponse.json(
          { 
            error: 'שגיאה ביצירת משתמש',
            details: process.env.NODE_ENV === 'development' ? createError : undefined
          },
          { status: 500 }
        )
      }
      
      user = newUser
    }

    console.log('User created/updated, generating tokens...')

    // Generate token
    const tokens = await generateTokens({
      userId: user.id,
      email: user.email
    })

    // Set cookies
    await setAuthCookies(tokens)

    // Auto-create user preferences (non-blocking)
    ensureUserPreferences(user.id).catch(err => 
      console.error('Failed to create user preferences:', err)
    )

    console.log('Registration successful for user:', email)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      message: existingUser && !existingUser.password 
        ? 'הסיסמה הוגדרה בהצלחה! כעת תוכל להתחבר'
        : 'נרשמת בהצלחה!'
    })
  } catch (error) {
    console.error('Register error:', error)
    
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