import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { validateSubscriptionData } from '@/lib/notification-helpers'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Get user from cookie
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('tor-ramel-auth')
    
    if (!authCookie) {
      console.log('Unauthorized: No auth cookie found')
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
      console.error('User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    
    // Validate subscription data
    const validation = validateSubscriptionData(body)
    if (!validation.valid) {
      console.log('Validation failed:', validation.error)
      return NextResponse.json({ 
        error: validation.error 
      }, { status: 400 })
    }

    const { subscription_date, date_range_start, date_range_end } = body

    // Check for existing active subscription with same dates
    let existingSubscription
    if (subscription_date) {
      const { data } = await supabase
        .from('notification_subscriptions')
        .select('id')
        .eq('user_id', userData.id)
        .eq('subscription_date', subscription_date)
        .eq('is_active', true)
        .single()
      
      existingSubscription = data
    } else {
      const { data } = await supabase
        .from('notification_subscriptions')
        .select('id')
        .eq('user_id', userData.id)
        .eq('date_range_start', date_range_start)
        .eq('date_range_end', date_range_end)
        .eq('is_active', true)
        .single()
      
      existingSubscription = data
    }

    if (existingSubscription) {
      console.log('Duplicate subscription attempt for user:', userData.id)
      return NextResponse.json({ 
        error: 'כבר קיים מנוי פעיל לתאריכים אלו' 
      }, { status: 400 })
    }

    // Create new subscription
    const { data: newSubscription, error: insertError } = await supabase
      .from('notification_subscriptions')
      .insert({
        user_id: userData.id,
        subscription_date,
        date_range_start,
        date_range_end,
        is_active: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating subscription:', insertError)
      
      // Check if it's a unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json({ 
          error: 'כבר קיים מנוי פעיל לתאריכים אלו' 
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to create subscription' 
      }, { status: 500 })
    }

    console.log(`✅ Created subscription ${newSubscription.id} for user ${userData.id}`)

    return NextResponse.json(newSubscription)

  } catch (error) {
    console.error('Error in subscribe API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 