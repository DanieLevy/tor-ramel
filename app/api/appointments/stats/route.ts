import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // Get the latest check time
    const { data: latestCheck, error: checkError } = await supabase
      .from('appointment_checks')
      .select('checked_at')
      .order('checked_at', { ascending: false })
      .limit(1)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error fetching latest check:', checkError)
    }

    // Get today's date in Israel timezone
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Count today's checks (distinct dates checked today)
    const { count: todayChecks, error: todayError } = await supabase
      .from('appointment_checks')
      .select('*', { count: 'exact', head: true })
      .gte('checked_at', todayStr + 'T00:00:00.000Z')
      .lt('checked_at', todayStr + 'T23:59:59.999Z')

    if (todayError) {
      console.error('Error counting today checks:', todayError)
    }

    // Count available appointments from today onwards
    const { count: availableCount, error: availableError } = await supabase
      .from('appointment_checks')
      .select('*', { count: 'exact', head: true })
      .eq('available', true)
      .gte('check_date', todayStr)

    if (availableError) {
      console.error('Error counting available appointments:', availableError)
    }

    // Get the nearest available appointment
    const { data: nearestAppointment, error: nearestError } = await supabase
      .from('appointment_checks')
      .select('*')
      .eq('available', true)
      .gte('check_date', todayStr)
      .order('check_date', { ascending: true })
      .limit(1)
      .single()

    if (nearestError && nearestError.code !== 'PGRST116') {
      console.error('Error fetching nearest appointment:', nearestError)
    }

    return NextResponse.json({
      lastCheckTime: latestCheck?.checked_at || null,
      todayChecks: todayChecks || 0,
      availableAppointments: availableCount || 0,
      nearestAppointment: nearestAppointment ? {
        date: nearestAppointment.check_date,
        dayName: nearestAppointment.day_name,
        times: nearestAppointment.times || [],
        bookingUrl: nearestAppointment.booking_url
      } : null
    })

  } catch (error) {
    console.error('Error fetching appointment stats:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 