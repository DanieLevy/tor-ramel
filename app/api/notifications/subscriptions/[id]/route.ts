import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const subscriptionId = params.id

    // Verify subscription belongs to user
    const { data: subscription, error: fetchError } = await supabase
      .from('notification_subscriptions')
      .select('id')
      .eq('id', subscriptionId)
      .eq('user_id', userData.id)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ 
        error: 'Subscription not found' 
      }, { status: 404 })
    }

    // Delete the subscription
    const { error: deleteError } = await supabase
      .from('notification_subscriptions')
      .delete()
      .eq('id', subscriptionId)

    if (deleteError) {
      console.error('Error deleting subscription:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete subscription' 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in delete subscription API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 