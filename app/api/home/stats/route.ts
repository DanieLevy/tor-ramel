import { apiResponse, apiError, CachePresets } from '@/lib/api-utils'
import { supabaseAdmin } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/jwt'

export interface HomeStats {
  availableAppointments: number
  nearestDate: string | null
  activeSubscriptions: number
  totalNotificationsSent: number
  ignoredTimesCount: number
  lastCheckTime: string | null
  todayChecks: number
  nextCheckIn: number
}

export const GET = async () => {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return apiError('Unauthorized', 401)
    }
    
    const todayStr = new Date().toISOString().split('T')[0]
    
    // Run all queries in parallel for maximum performance
    const [
      availableResult,
      nearestResult,
      subscriptionsResult,
      notificationsResult,
      ignoredResult,
      lastCheckResult,
      todayChecksResult
    ] = await Promise.all([
      // Available appointments count
      supabaseAdmin
        .from('appointment_checks')
        .select('*', { count: 'exact', head: true })
        .eq('available', true)
        .gte('check_date', todayStr),
      
      // Nearest available date
      supabaseAdmin
        .from('appointment_checks')
        .select('check_date')
        .eq('available', true)
        .gte('check_date', todayStr)
        .order('check_date', { ascending: true })
        .limit(1)
        .maybeSingle(),
      
      // User's active subscriptions
      supabaseAdmin
        .from('notification_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.userId)
        .eq('is_active', true),
      
      // Total notifications sent to user
      supabaseAdmin
        .from('notified_appointments')
        .select('id, notification_subscriptions!inner(user_id)', { count: 'exact', head: true })
        .eq('notification_subscriptions.user_id', user.userId),
      
      // User's ignored times count
      supabaseAdmin
        .from('ignored_appointment_times')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.userId),
      
      // Last check time
      supabaseAdmin
        .from('appointment_checks')
        .select('checked_at')
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      
      // Today's checks count
      supabaseAdmin
        .from('appointment_checks')
        .select('*', { count: 'exact', head: true })
        .gte('checked_at', `${todayStr}T00:00:00.000Z`)
        .lt('checked_at', `${todayStr}T23:59:59.999Z`)
    ])
    
    // Calculate next check time (next 5-minute interval)
    const now = new Date()
    const currentMinutes = now.getMinutes()
    const currentSeconds = now.getSeconds()
    const nextInterval = Math.ceil(currentMinutes / 5) * 5
    const minutesUntilNext = nextInterval - currentMinutes
    const secondsUntilNext = (minutesUntilNext * 60) - currentSeconds
    const nextCheckIn = secondsUntilNext > 0 ? secondsUntilNext : 300
    
    const stats: HomeStats = {
      availableAppointments: availableResult.count ?? 0,
      nearestDate: nearestResult.data?.check_date ?? null,
      activeSubscriptions: subscriptionsResult.count ?? 0,
      totalNotificationsSent: notificationsResult.count ?? 0,
      ignoredTimesCount: ignoredResult.count ?? 0,
      lastCheckTime: lastCheckResult.data?.checked_at ?? null,
      todayChecks: todayChecksResult.count ?? 0,
      nextCheckIn
    }
    
    // Private short cache - user-specific data with 30s cache
    return apiResponse(stats, CachePresets.PRIVATE_SHORT)
    
  } catch (error) {
    console.error('[Home Stats API] Error:', error instanceof Error ? error.message : 'Unknown error')
    return apiError(
      'Failed to fetch stats',
      500,
      { message: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}
