import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // Get today's date in Israel timezone
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Fetch the nearest available appointment from today onwards
    const { data, error } = await supabase
      .from('appointment_checks')
      .select('*')
      .eq('available', true)
      .gte('check_date', todayStr)
      .order('check_date', { ascending: true })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ 
        found: false,
        message: 'אין תורים פנויים כרגע' 
      })
    }

    return NextResponse.json({
      found: true,
      appointment: {
        date: data.check_date,
        dayName: data.day_name,
        times: data.times || [],
        bookingUrl: data.booking_url,
        checkedAt: data.checked_at
      }
    })

  } catch (error) {
    console.error('Error fetching nearest appointment:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch appointment',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 