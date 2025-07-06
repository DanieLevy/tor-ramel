import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken, generateTokens, setAuthCookies, clearAuthCookies } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refresh-token')

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      )
    }

    // Verify refresh token
    const payload = await verifyToken(refreshToken.value)
    if (!payload) {
      await clearAuthCookies()
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      )
    }

    // Check if refresh token matches the one in database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, refresh_token')
      .eq('id', payload.userId)
      .eq('refresh_token', refreshToken.value)
      .single()

    if (userError || !user) {
      await clearAuthCookies()
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      )
    }

    // Generate new tokens
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

    // Set new cookies
    await setAuthCookies(tokens)

    return NextResponse.json({
      success: true,
      accessToken: tokens.accessToken
    })
  } catch (error) {
    console.error('Refresh token error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    )
  }
} 