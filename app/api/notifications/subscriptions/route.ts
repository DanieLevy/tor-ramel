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
    
    console.log('🍪 Auth cookie check (subscriptions):', {
      exists: !!authCookie,
      headers: request.headers.get('cookie')
    })
    
    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let authData
    try {
      authData = JSON.parse(authCookie.value)
    } catch (parseError) {
      console.error('Failed to parse auth cookie:', parseError)
      return NextResponse.json({ error: 'Invalid auth data' }, { status: 401 })
    }
    
    const { email, userId } = authData
    
    if (!userId) {
      console.error('No userId in auth data:', authData)
      return NextResponse.json({ error: 'Invalid auth data' }, { status: 401 })
    }

    // Get all subscriptions for user using userId directly
    const { data: subscriptions, error: fetchError } = await supabase
      .from('notification_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch subscriptions' 
      }, { status: 500 })
    }

    return NextResponse.json(subscriptions || [])

  } catch (error) {
    console.error('Error in subscriptions API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 