import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, subscriptionId, times, date } = body

    if (!action || !subscriptionId) {
      return NextResponse.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 })
    }

    // Verify subscription exists
    const { data: subscription, error: fetchError } = await supabase
      .from('notification_subscriptions')
      .select('*, users!inner(email)')
      .eq('id', subscriptionId)
      .single()

    if (fetchError || !subscription) {
      console.error('Subscription not found:', fetchError)
      return NextResponse.json({ 
        error: 'Subscription not found' 
      }, { status: 404 })
    }

    if (action === 'approve') {
      // Mark subscription as completed
      const { error: updateError } = await supabase
        .from('notification_subscriptions')
        .update({
          is_active: false,
          completed_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)

      if (updateError) {
        console.error('Error updating subscription:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update subscription' 
        }, { status: 500 })
      }

      // Update the last notified appointment record if exists
      const { error: notifiedError } = await supabase
        .from('notified_appointments')
        .update({
          user_response: 'approved',
          response_at: new Date().toISOString()
        })
        .eq('subscription_id', subscriptionId)
        .is('user_response', null)

      if (notifiedError) {
        console.error('Error updating notified appointments:', notifiedError)
      }

      return NextResponse.json({ 
        success: true,
        message: 'Subscription marked as completed'
      })

    } else if (action === 'decline') {
      if (!times || !date) {
        return NextResponse.json({ 
          error: 'Missing times or date for decline action' 
        }, { status: 400 })
      }

      // Save ignored times
      const { error: ignoreError } = await supabase
        .from('ignored_appointment_times')
        .insert({
          user_id: subscription.user_id,
          appointment_date: date,
          ignored_times: times
        })

      if (ignoreError) {
        console.error('Error saving ignored times:', ignoreError)
        return NextResponse.json({ 
          error: 'Failed to save ignored times' 
        }, { status: 500 })
      }

      // Update the notified appointment record
      const { error: notifiedError } = await supabase
        .from('notified_appointments')
        .update({
          user_response: 'declined',
          response_at: new Date().toISOString()
        })
        .eq('subscription_id', subscriptionId)
        .eq('appointment_date', date)
        .is('user_response', null)

      if (notifiedError) {
        console.error('Error updating notified appointments:', notifiedError)
      }

      return NextResponse.json({ 
        success: true,
        message: 'Ignored times saved successfully'
      })

    } else {
      return NextResponse.json({ 
        error: 'Invalid action' 
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in notification action API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 