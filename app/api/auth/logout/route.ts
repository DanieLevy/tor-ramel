import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser, clearAuthCookies } from '@/lib/auth/jwt'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser()
    
    if (user) {
      // Clear refresh token in database
      await supabase
        .from('users')
        .update({ refresh_token: null })
        .eq('id', user.userId)
    }

    // Clear cookies
    await clearAuthCookies()

    return NextResponse.json({
      success: true,
      message: 'התנתקת בהצלחה'
    })
  } catch (error) {
    console.error('Logout error:', error)
    // Even if error, clear cookies
    await clearAuthCookies()
    return NextResponse.json({
      success: true,
      message: 'התנתקת בהצלחה'
    })
  }
} 