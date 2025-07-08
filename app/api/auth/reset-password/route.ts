import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth/password'
import { supabaseAdmin } from '@/lib/supabase/client'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  newPassword: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים')
})

export async function POST(request: NextRequest) {
  try {
    console.log('Password reset request received')
    
    const body = await request.json()
    
    // Validate input
    const validationResult = resetPasswordSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, newPassword } = validationResult.data
    console.log('Attempting to reset password for:', email)

    // Check if user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (userError || !user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        { success: true, message: 'אם כתובת האימייל קיימת במערכת, הסיסמה אופסה בהצלחה' },
        { status: 200 }
      )
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword)

    // Update user's password
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        password: hashedPassword,
        last_login: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json(
        { error: 'שגיאה באיפוס הסיסמה' },
        { status: 500 }
      )
    }

    console.log('Password reset successful for:', email)

    return NextResponse.json({
      success: true,
      message: 'הסיסמה אופסה בהצלחה! כעת תוכל להתחבר עם הסיסמה החדשה'
    })
  } catch (error) {
    console.error('Password reset error:', error)
    
    return NextResponse.json(
      { error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
} 