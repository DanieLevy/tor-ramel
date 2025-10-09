import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/jwt'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// DELETE - Existing endpoint (keep as is)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    
    // Verify subscription belongs to user
    const { data: subscription, error: fetchError } = await supabase
      .from('notification_subscriptions')
      .select('user_id')
      .eq('id', id)
      .single()
    
    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }
    
    if (subscription.user_id !== user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Delete subscription
    const { error: deleteError } = await supabase
      .from('notification_subscriptions')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      console.error('Error deleting subscription:', deleteError)
      return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error in DELETE subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update subscription settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    const body = await request.json()
    
    // Verify subscription belongs to user
    const { data: subscription, error: fetchError } = await supabase
      .from('notification_subscriptions')
      .select('user_id')
      .eq('id', id)
      .single()
    
    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }
    
    if (subscription.user_id !== user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Prepare update data - only allow specific fields
    const allowedFields = [
      'notification_method',
      'preferred_time_ranges',
      'quiet_hours_start',
      'quiet_hours_end',
      'subscription_status',
      'paused_until'
    ]
    
    const updateData: any = {}
    
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }
    
    // Validate notification_method
    if (updateData.notification_method && 
        !['email', 'push', 'both'].includes(updateData.notification_method)) {
      return NextResponse.json({ 
        error: 'Invalid notification_method. Must be: email, push, or both' 
      }, { status: 400 })
    }
    
    // Validate subscription_status
    if (updateData.subscription_status && 
        !['active', 'paused', 'completed'].includes(updateData.subscription_status)) {
      return NextResponse.json({ 
        error: 'Invalid subscription_status. Must be: active, paused, or completed' 
      }, { status: 400 })
    }
    
    // Validate preferred_time_ranges format
    if (updateData.preferred_time_ranges) {
      if (!Array.isArray(updateData.preferred_time_ranges)) {
        return NextResponse.json({ 
          error: 'preferred_time_ranges must be an array' 
        }, { status: 400 })
      }
      
      for (const range of updateData.preferred_time_ranges) {
        if (!range.start || !range.end) {
          return NextResponse.json({ 
            error: 'Each time range must have start and end properties' 
          }, { status: 400 })
        }
        
        // Validate time format (HH:MM)
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
        if (!timeRegex.test(range.start) || !timeRegex.test(range.end)) {
          return NextResponse.json({ 
            error: 'Time must be in HH:MM format (24-hour)' 
          }, { status: 400 })
        }
      }
    }
    
    // Set paused_at timestamp if pausing
    if (updateData.subscription_status === 'paused') {
      updateData.paused_at = new Date().toISOString()
    }
    
    // Clear paused_at if resuming
    if (updateData.subscription_status === 'active') {
      updateData.paused_at = null
      updateData.paused_until = null
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        error: 'No valid fields to update' 
      }, { status: 400 })
    }
    
    // Update subscription
    const { data: updated, error: updateError } = await supabase
      .from('notification_subscriptions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }
    
    // Create in-app notification for status change
    if (updateData.subscription_status) {
      const statusMessages = {
        paused: 'המנוי הושהה זמנית',
        active: 'המנוי חודש בהצלחה',
        completed: 'המנוי הושלם'
      }
      
      await supabase
        .from('in_app_notifications')
        .insert({
          user_id: user.userId,
          subscription_id: id,
          title: 'עדכון מנוי',
          body: statusMessages[updateData.subscription_status as keyof typeof statusMessages],
          notification_type: 'subscription',
          data: { subscription_id: id, action: updateData.subscription_status }
        })
    }
    
    return NextResponse.json(updated)
    
  } catch (error) {
    console.error('Error in PATCH subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Fetch single subscription details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    
    // Fetch subscription with related data
    const { data: subscription, error } = await supabase
      .from('notification_subscriptions')
      .select(`
        *,
        notified_appointments(
          appointment_date,
          notified_times,
          notification_sent_at,
          user_response
        )
      `)
      .eq('id', id)
      .eq('user_id', user.userId)
      .single()
    
    if (error || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }
    
    return NextResponse.json(subscription)
    
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
