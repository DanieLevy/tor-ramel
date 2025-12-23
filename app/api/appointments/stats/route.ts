import { apiResponse, apiError, CachePresets } from '@/lib/api-utils'
import { supabaseAdmin } from '@/lib/supabase/client'

interface AppointmentStats {
  lastCheckTime: string | null
  todayChecks: number
  availableAppointments: number
  nearestAppointment: {
    date: string
    dayName: string | null
    times: string[]
    bookingUrl: string | null
  } | null
}

export const GET = async () => {
  try {
    const todayStr = new Date().toISOString().split('T')[0]

    // Run all queries in parallel for maximum performance
    const [latestCheckResult, todayChecksResult, availableCountResult, nearestResult] = await Promise.all([
      // Get the latest check time
      supabaseAdmin
        .from('appointment_checks')
        .select('checked_at')
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Count today's checks
      supabaseAdmin
        .from('appointment_checks')
        .select('*', { count: 'exact', head: true })
        .gte('checked_at', `${todayStr}T00:00:00.000Z`)
        .lt('checked_at', `${todayStr}T23:59:59.999Z`),

      // Count available appointments from today onwards
      supabaseAdmin
        .from('appointment_checks')
        .select('*', { count: 'exact', head: true })
        .eq('available', true)
        .gte('check_date', todayStr),

      // Get the nearest available appointment
      supabaseAdmin
        .from('appointment_checks')
        .select('*')
        .eq('available', true)
        .gte('check_date', todayStr)
        .order('check_date', { ascending: true })
        .limit(1)
        .maybeSingle()
    ])

    const stats: AppointmentStats = {
      lastCheckTime: latestCheckResult.data?.checked_at ?? null,
      todayChecks: todayChecksResult.count ?? 0,
      availableAppointments: availableCountResult.count ?? 0,
      nearestAppointment: nearestResult.data ? {
        date: nearestResult.data.check_date,
        dayName: nearestResult.data.day_name,
        times: nearestResult.data.times ?? [],
        bookingUrl: nearestResult.data.booking_url
      } : null
    }

    // Medium cache - appointment data updates every 5 minutes, cache for 2 minutes
    return apiResponse(stats, CachePresets.MEDIUM)

  } catch (error) {
    console.error('[Appointment Stats API] Error:', error instanceof Error ? error.message : 'Unknown error')
    return apiError(
      'Failed to fetch stats',
      500,
      { message: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}
