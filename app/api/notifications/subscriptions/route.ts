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
    const cookieStore = cookies()
    const authCookie = cookieStore.get('tor-ramel-auth')
    
    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email } = JSON.parse(authCookie.value)
    
    // Get user ID from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get all subscriptions for user
    const { data: subscriptions, error: fetchError } = await supabase
      .from('notification_subscriptions')
      .select('*')
      .eq('user_id', userData.id)
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