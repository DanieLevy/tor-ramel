import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/jwt'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch all ignored times for the user
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: ignoredTimes, error } = await supabase
      .from('ignored_appointment_times')
      .select(`
        id,
        appointment_date,
        ignored_times,
        created_at,
        subscription_id,
        notification_subscriptions (
          date_range_start,
          date_range_end,
          is_active
        )
      `)
      .eq('user_id', user.userId)
      .order('appointment_date', { ascending: true })

    if (error) {
      console.error('Error fetching ignored times:', error)
      return NextResponse.json({ error: 'Failed to fetch ignored times' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      ignoredTimes: ignoredTimes || [] 
    })
  } catch (error) {
    console.error('Error in ignored-times GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Clear specific or all ignored times
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const date = searchParams.get('date')
    const clearAll = searchParams.get('clearAll') === 'true'

    if (clearAll) {
      // Clear all ignored times for user
      const { error } = await supabase
        .from('ignored_appointment_times')
        .delete()
        .eq('user_id', user.userId)

      if (error) {
        console.error('Error clearing all ignored times:', error)
        return NextResponse.json({ error: 'Failed to clear ignored times' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'All ignored times cleared' 
      })
    }

    if (id) {
      // Delete specific ignored time by ID
      const { error } = await supabase
        .from('ignored_appointment_times')
        .delete()
        .eq('id', id)
        .eq('user_id', user.userId)

      if (error) {
        console.error('Error deleting ignored time:', error)
        return NextResponse.json({ error: 'Failed to delete ignored time' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Ignored time deleted' 
      })
    }

    if (date) {
      // Delete ignored times for specific date
      const { error } = await supabase
        .from('ignored_appointment_times')
        .delete()
        .eq('user_id', user.userId)
        .eq('appointment_date', date)

      if (error) {
        console.error('Error deleting ignored times for date:', error)
        return NextResponse.json({ error: 'Failed to delete ignored times' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: `Ignored times for ${date} deleted` 
      })
    }

    return NextResponse.json({ 
      error: 'Missing id, date, or clearAll parameter' 
    }, { status: 400 })
  } catch (error) {
    console.error('Error in ignored-times DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
