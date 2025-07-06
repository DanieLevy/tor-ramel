import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { registerSchema } from '@/lib/auth/validation'
import { hashPassword } from '@/lib/auth/password'
import { generateTokens, setAuthCookies } from '@/lib/auth/jwt'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, password } = validationResult.data

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, password')
      .eq('email', email)
      .single()

    if (existingUser && existingUser.password) {
      return NextResponse.json(
        { error: 'משתמש עם כתובת אימייל זו כבר קיים' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    let user

    // If user exists without password, update their password
    if (existingUser && !existingUser.password) {
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          password: hashedPassword,
          last_login: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select('id, email')
        .single()

      if (updateError || !updatedUser) {
        console.error('Error updating user:', updateError)
        return NextResponse.json(
          { error: 'שגיאה בעדכון משתמש' },
          { status: 500 }
        )
      }
      
      user = updatedUser
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
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
        console.error('Error creating user:', createError)
        return NextResponse.json(
          { error: 'שגיאה ביצירת משתמש' },
          { status: 500 }
        )
      }
      
      user = newUser
    }

    // Generate tokens
    const tokens = await generateTokens({
      userId: user.id,
      email: user.email
    })

    // Update refresh token
    await supabase
      .from('users')
      .update({ 
        refresh_token: tokens.refreshToken,
        last_login: new Date().toISOString()
      })
      .eq('id', user.id)

    // Set cookies
    await setAuthCookies(tokens)

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
    return NextResponse.json(
      { error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
} 