import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/jwt'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 15
    const { id: subscriptionId } = await params
    
    // Get user from JWT token
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { subscription_date, date_range_start, date_range_end } = body

    // Validate input
    if (!subscription_date && (!date_range_start || !date_range_end)) {
      return NextResponse.json({ 
        error: 'Either subscription_date or both date_range_start and date_range_end are required' 
      }, { status: 400 })
    }

    // Verify subscription belongs to user
    const { data: subscription, error: fetchError } = await supabase
      .from('notification_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', user.userId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ 
        error: 'Subscription not found' 
      }, { status: 404 })
    }

    // Only allow updates for active subscriptions
    if (!subscription.is_active) {
      return NextResponse.json({ 
        error: 'Cannot update completed subscriptions' 
      }, { status: 400 })
    }

    // Update the subscription
    const { data, error: updateError } = await supabase
      .from('notification_subscriptions')
      .update({
        subscription_date,
        date_range_start,
        date_range_end,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update subscription' 
      }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in update subscription API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 15
    const { id: subscriptionId } = await params
    
    // Get user from JWT token
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify subscription belongs to user
    const { data: subscription, error: fetchError } = await supabase
      .from('notification_subscriptions')
      .select('id')
      .eq('id', subscriptionId)
      .eq('user_id', user.userId)
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