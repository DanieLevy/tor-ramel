import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get user from cookie
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('tor-ramel-auth')
    
    // Enhanced logging for PWA debugging
    const userAgent = request.headers.get('user-agent') || ''
    const isPWA = userAgent.includes('PWA') || request.headers.get('sec-fetch-dest') === 'empty'
    
    console.log('🍪 [Subscriptions API] Auth check:', {
      hasCookie: !!authCookie,
      isPWA,
      userAgent: userAgent.substring(0, 50) + '...',
      referer: request.headers.get('referer'),
      origin: request.headers.get('origin')
    })
    
    if (!authCookie) {
      console.error('🍪 [Subscriptions API] No auth cookie found')
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: { noCookie: true, isPWA }
      }, { status: 401 })
    }

    let authData
    try {
      authData = JSON.parse(authCookie.value)
      console.log('🍪 [Subscriptions API] Parsed auth data:', {
        hasEmail: !!authData.email,
        hasUserId: !!authData.userId,
        userIdLength: authData.userId?.length
      })
    } catch (parseError) {
      console.error('🍪 [Subscriptions API] Failed to parse auth cookie:', parseError)
      return NextResponse.json({ 
        error: 'Invalid auth data',
        debug: { parseError: true, isPWA }
      }, { status: 401 })
    }
    
    const { email, userId } = authData
    
    if (!userId) {
      console.error('🍪 [Subscriptions API] No userId in auth data')
      return NextResponse.json({ 
        error: 'Invalid auth data',
        debug: { noUserId: true, isPWA }
      }, { status: 401 })
    }

    // Get all subscriptions for user using userId directly
    const { data: subscriptions, error: fetchError } = await supabase
      .from('notification_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('🍪 [Subscriptions API] Database error:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch subscriptions',
        debug: { dbError: fetchError.message, isPWA }
      }, { status: 500 })
    }

    console.log(`🍪 [Subscriptions API] Returning ${subscriptions?.length || 0} subscriptions`)
    return NextResponse.json(subscriptions || [])

  } catch (error) {
    console.error('🍪 [Subscriptions API] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: { unexpectedError: true }
    }, { status: 500 })
  }
} 