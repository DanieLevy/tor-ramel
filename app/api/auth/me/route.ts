import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/jwt'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user details from database
    const { data: userDetails, error } = await supabaseAdmin
      .from('users')
      .select('id, email, created_at, last_login')
      .eq('id', user.userId)
      .single()

    if (error || !userDetails) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: userDetails
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 