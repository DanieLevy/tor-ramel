import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/jwt'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch all ignored times for user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const subscriptionId = searchParams.get('subscription_id')
    const appointmentDate = searchParams.get('appointment_date')
    const countOnly = searchParams.get('count_only') === 'true'
    
    // FIXED: Only fetch ignored times for ACTIVE subscriptions
    // This prevents showing ignored times from deleted/inactive subscriptions
    let query = supabase
      .from('ignored_appointment_times')
      .select(`
        *,
        notification_subscriptions!inner (
          id,
          is_active,
          subscription_status
        )
      `)
      .eq('user_id', user.userId)
      .eq('notification_subscriptions.is_active', true)
      .in('notification_subscriptions.subscription_status', ['active', 'paused'])
    
    if (subscriptionId) {
      query = query.eq('subscription_id', subscriptionId)
    }
    
    if (appointmentDate) {
      query = query.eq('appointment_date', appointmentDate)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching ignored times:', error)
      return NextResponse.json({ error: 'Failed to fetch ignored times' }, { status: 500 })
    }
    
    // If count_only is requested, return total count of ignored times
    if (countOnly) {
      const totalIgnoredTimes = (data || []).reduce((sum, item) => {
        return sum + (item.ignored_times?.length || 0)
      }, 0)
      
      return NextResponse.json({ 
        count: totalIgnoredTimes,
        dates: data?.length || 0
      })
    }
    
    return NextResponse.json(data || [])
    
  } catch (error) {
    console.error('Error in GET ignored times:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove specific time from ignored list (unignore)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { subscription_id, appointment_date, time } = body
    
    if (!subscription_id || !appointment_date || !time) {
      return NextResponse.json({ 
        error: 'Missing required fields: subscription_id, appointment_date, time' 
      }, { status: 400 })
    }
    
    // Fetch current ignored times
    const { data: existing, error: fetchError } = await supabase
      .from('ignored_appointment_times')
      .select('*')
      .eq('subscription_id', subscription_id)
      .eq('appointment_date', appointment_date)
      .eq('user_id', user.userId)
      .single()
    
    if (fetchError || !existing) {
      return NextResponse.json({ 
        error: 'No ignored times found for this date' 
      }, { status: 404 })
    }
    
    // Remove the specific time from the array
    const updatedTimes = (existing.ignored_times || []).filter((t: string) => t !== time)
    
    if (updatedTimes.length === 0) {
      // If no more ignored times, delete the entire record
      const { error: deleteError } = await supabase
        .from('ignored_appointment_times')
        .delete()
        .eq('subscription_id', subscription_id)
        .eq('appointment_date', appointment_date)
        .eq('user_id', user.userId)
      
      if (deleteError) {
        console.error('Error deleting ignored times record:', deleteError)
        return NextResponse.json({ error: 'Failed to remove ignored time' }, { status: 500 })
      }
    } else {
      // Update with remaining times
      const { error: updateError } = await supabase
        .from('ignored_appointment_times')
        .update({ ignored_times: updatedTimes })
        .eq('subscription_id', subscription_id)
        .eq('appointment_date', appointment_date)
        .eq('user_id', user.userId)
      
      if (updateError) {
        console.error('Error updating ignored times:', updateError)
        return NextResponse.json({ error: 'Failed to remove ignored time' }, { status: 500 })
      }
    }
    
    // Create in-app notification
    await supabase
      .from('in_app_notifications')
      .insert({
        user_id: user.userId,
        subscription_id: subscription_id,
        title: 'זמן הוחזר',
        body: `השעה ${time} ביום ${appointment_date} הוחזרה לרשימת הזמינים`,
        notification_type: 'subscription',
        data: { 
          subscription_id, 
          appointment_date, 
          time,
          action: 'unignored'
        }
      })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Time removed from ignored list',
      remaining_ignored_times: updatedTimes 
    })
    
  } catch (error) {
    console.error('Error in DELETE ignored time:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Bulk unignore all times for a date
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { subscription_id, appointment_date } = body
    
    if (!subscription_id || !appointment_date) {
      return NextResponse.json({ 
        error: 'Missing required fields: subscription_id, appointment_date' 
      }, { status: 400 })
    }
    
    // Delete all ignored times for this date
    const { error: deleteError } = await supabase
      .from('ignored_appointment_times')
      .delete()
      .eq('subscription_id', subscription_id)
      .eq('appointment_date', appointment_date)
      .eq('user_id', user.userId)
    
    if (deleteError) {
      console.error('Error bulk deleting ignored times:', deleteError)
      return NextResponse.json({ error: 'Failed to clear ignored times' }, { status: 500 })
    }
    
    // Create in-app notification
    await supabase
      .from('in_app_notifications')
      .insert({
        user_id: user.userId,
        subscription_id: subscription_id,
        title: 'כל הזמנים הוחזרו',
        body: `כל הזמנים שהתעלמת מהם ביום ${appointment_date} הוחזרו`,
        notification_type: 'subscription',
        data: { 
          subscription_id, 
          appointment_date,
          action: 'bulk_unignored'
        }
      })
    
    return NextResponse.json({ 
      success: true, 
      message: 'All ignored times cleared for this date'
    })
    
  } catch (error) {
    console.error('Error in POST bulk unignore:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

