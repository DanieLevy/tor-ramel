import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { hashPassword } from '@/lib/auth/password'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'טוקן איפוס חסר'),
  newPassword: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים')
})

export async function POST(request: NextRequest) {
  try {
    console.log('Reset password with token request received')
    
    const body = await request.json()
    
    // Validate input
    const validationResult = resetPasswordSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { resetToken, newPassword } = validationResult.data

    // Decode and validate reset token
    let tokenData
    try {
      tokenData = JSON.parse(Buffer.from(resetToken, 'base64').toString())
      
      // Check if token is valid and not expired (5 minutes)
      const tokenAge = Date.now() - tokenData.timestamp
      if (tokenAge > 5 * 60 * 1000) {
        return NextResponse.json(
          { error: 'קוד האיפוס פג תוקף. אנא בקש קוד חדש.' },
          { status: 400 }
        )
      }
      
      if (tokenData.purpose !== 'password-reset') {
        return NextResponse.json(
          { error: 'קוד איפוס לא תקין' },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'קוד איפוס לא תקין' },
        { status: 400 }
      )
    }

    console.log('Resetting password for user:', tokenData.userId)

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword)

    // Update user's password
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        password: hashedPassword,
        last_login: new Date().toISOString()
      })
      .eq('id', tokenData.userId)

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json(
        { error: 'שגיאה באיפוס הסיסמה' },
        { status: 500 }
      )
    }

    // Mark all unused OTPs for this user as used (cleanup)
    await supabaseAdmin
      .from('user_otps')
      .update({ used: true })
      .eq('user_id', tokenData.userId)
      .eq('used', false)

    console.log('Password reset successful for user:', tokenData.userId)

    return NextResponse.json({
      success: true,
      message: 'הסיסמה שונתה בהצלחה! כעת תוכל להתחבר עם הסיסמה החדשה'
    })
  } catch (error) {
    console.error('Reset password error:', error)
    
    return NextResponse.json(
      { error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
} 