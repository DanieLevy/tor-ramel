import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/jwt'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get user from JWT token
    const user = await getCurrentUser()
    
    if (!user) {
      console.error('🔐 [Subscriptions API] No authenticated user')
      return NextResponse.json({ 
        error: 'Unauthorized'
      }, { status: 401 })
    }
    
    console.log('🔐 [Subscriptions API] Authenticated user:', {
      userId: user.userId,
      email: user.email
    })

    // Get all subscriptions for user using userId directly
    const { data: subscriptions, error: fetchError } = await supabase
      .from('notification_subscriptions')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('🔐 [Subscriptions API] Database error:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch subscriptions'
      }, { status: 500 })
    }

    console.log(`🔐 [Subscriptions API] Returning ${subscriptions?.length || 0} subscriptions for user ${user.userId}`)
    return NextResponse.json(subscriptions || [])

  } catch (error) {
    console.error('🍪 [Subscriptions API] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: { unexpectedError: true }
    }, { status: 500 })
  }
} 