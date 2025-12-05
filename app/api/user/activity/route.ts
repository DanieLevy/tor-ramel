import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/jwt'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PATCH - Update user activity (last_app_open)
export async function PATCH() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date().toISOString()

    // Upsert to user_preferences with updated last_app_open
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.userId,
        last_app_open: now,
        updated_at: now
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('Error updating activity:', error)
      return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
    }

    // Also update last_login on users table
    await supabase
      .from('users')
      .update({ last_login: now })
      .eq('id', user.userId)

    return NextResponse.json({ 
      success: true, 
      last_app_open: now 
    })

  } catch (error) {
    console.error('Error in PATCH /api/user/activity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get user activity stats
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user preferences with activity data
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('last_app_open, last_proactive_notification_at')
      .eq('user_id', user.userId)
      .single()

    // Get booked appointments count
    const { count: bookedCount, error: _bookedError } = await supabase
      .from('booked_appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.userId)

    // Get notifications received count
    const { count: notificationsCount, error: _notifError } = await supabase
      .from('notified_appointments')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_id', user.userId) // This might need adjustment based on your schema

    if (prefError && prefError.code !== 'PGRST116') {
      console.error('Error fetching activity:', prefError)
    }

    return NextResponse.json({
      last_app_open: preferences?.last_app_open || null,
      last_proactive_notification_at: preferences?.last_proactive_notification_at || null,
      booked_appointments_count: bookedCount || 0,
      notifications_received: notificationsCount || 0
    })

  } catch (error) {
    console.error('Error in GET /api/user/activity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}




