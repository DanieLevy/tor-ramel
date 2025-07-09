import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    // Clear auth cookies
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