import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/jwt'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface HomeStats {
  // Available appointments
  availableAppointments: number
  nearestDate: string | null
  
  // User-specific stats
  activeSubscriptions: number
  totalNotificationsSent: number
  ignoredTimesCount: number
  
  // System stats
  lastCheckTime: string | null
  todayChecks: number
  nextCheckIn: number // seconds until next 5-minute interval
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const todayStr = new Date().toISOString().split('T')[0]
    
    // Run all queries in parallel for performance
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
      supabase
        .from('appointment_checks')
        .select('*', { count: 'exact', head: true })
        .eq('available', true)
        .gte('check_date', todayStr),
      
      // Nearest available date
      supabase
        .from('appointment_checks')
        .select('check_date')
        .eq('available', true)
        .gte('check_date', todayStr)
        .order('check_date', { ascending: true })
        .limit(1)
        .single(),
      
      // User's active subscriptions
      supabase
        .from('notification_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.userId)
        .eq('is_active', true),
      
      // Total notifications sent to user
      supabase
        .from('notified_appointments')
        .select('id, notification_subscriptions!inner(user_id)', { count: 'exact', head: true })
        .eq('notification_subscriptions.user_id', user.userId),
      
      // User's ignored times count
      supabase
        .from('ignored_appointment_times')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.userId),
      
      // Last check time
      supabase
        .from('appointment_checks')
        .select('checked_at')
        .order('checked_at', { ascending: false })
        .limit(1)
        .single(),
      
      // Today's checks count
      supabase
        .from('appointment_checks')
        .select('*', { count: 'exact', head: true })
        .gte('checked_at', todayStr + 'T00:00:00.000Z')
        .lt('checked_at', todayStr + 'T23:59:59.999Z')
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
      availableAppointments: availableResult.count || 0,
      nearestDate: nearestResult.data?.check_date || null,
      activeSubscriptions: subscriptionsResult.count || 0,
      totalNotificationsSent: notificationsResult.count || 0,
      ignoredTimesCount: ignoredResult.count || 0,
      lastCheckTime: lastCheckResult.data?.checked_at || null,
      todayChecks: todayChecksResult.count || 0,
      nextCheckIn
    }
    
    return NextResponse.json(stats)
    
  } catch (error) {
    console.error('Error fetching home stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}






