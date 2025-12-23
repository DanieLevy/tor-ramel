"use client"

import { useEffect, useRef } from 'react'
import { ExternalLink, AlertCircle, Sparkles, CalendarCheck, Flame, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppointmentBannerSkeleton } from '@/components/ui/loading-states'
import { AsyncErrorFallback } from '@/components/error-boundary'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/hooks/use-haptics'
import { useApi } from '@/hooks/use-api'
import { motion } from 'framer-motion'
import type { AppointmentStats } from '@/lib/types/api'

// Scan interval in milliseconds (5 minutes - syncs with Netlify auto-check)
const SCAN_INTERVAL_MS = 5 * 60 * 1000

/**
 * AppointmentBanner Component
 * Displays the nearest available appointment with smart urgency indicators
 * Auto-refreshes on new scan completion (every 5 minutes)
 */
export function AppointmentBanner() {
  const haptics = useHaptics()
  const lastCheckTimeRef = useRef<string | null>(null)

  // Use optimized API hook with stale-while-revalidate
  const { 
    data: stats, 
    isLoading, 
    error,
    refetch 
  } = useApi<AppointmentStats>('/api/appointments/stats', {
    staleTime: 30000,     // Show cached data for 30s
    cacheTime: 120000,    // Keep in cache for 2 minutes
    refetchOnFocus: true, // Refresh when user returns to tab
    refetchOnReconnect: true
  })

  // Auto-refresh when scan completes (check every minute for new scans)
  useEffect(() => {
    const checkForNewScan = () => {
      if (stats?.lastCheckTime && stats.lastCheckTime !== lastCheckTimeRef.current) {
        // New scan detected - trigger haptic and refresh
        if (lastCheckTimeRef.current !== null) {
          haptics.light()
        }
        lastCheckTimeRef.current = stats.lastCheckTime
      }
    }

    // Check immediately when stats change
    checkForNewScan()

    // Set up interval to poll for new scans (every 60 seconds)
    const pollInterval = setInterval(() => {
      refetch()
    }, 60000)

    // Also set up a sync with the 5-minute scan cycle
    const now = new Date()
    const currentMinutes = now.getMinutes()
    const currentSeconds = now.getSeconds()
    const nextScanMinute = Math.ceil(currentMinutes / 5) * 5
    const msUntilNextScan = ((nextScanMinute - currentMinutes) * 60 - currentSeconds) * 1000

    // Refetch slightly after scan completes (10 seconds after)
    const scanSyncTimeout = setTimeout(() => {
      refetch()
      // Then continue every 5 minutes
      const scanInterval = setInterval(refetch, SCAN_INTERVAL_MS)
      return () => clearInterval(scanInterval)
    }, msUntilNextScan + 10000)

    return () => {
      clearInterval(pollInterval)
      clearTimeout(scanSyncTimeout)
    }
  }, [stats?.lastCheckTime, refetch, haptics])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('he-IL', { 
      day: 'numeric',
      month: 'long'
    })
  }

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const diffInDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'היום'
    if (diffInDays === 1) return 'מחר'
    if (diffInDays === 2) return 'מחרתיים'
    return `בעוד ${diffInDays} ימים`
  }

  const getUrgencyLevel = (dateStr: string): 'urgent' | 'soon' | 'normal' => {
    const date = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffInDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays <= 2) return 'urgent' // Hot - within 2 days
    if (diffInDays <= 7) return 'soon'   // Soon - within a week
    return 'normal'
  }

  const handleBookingClick = () => {
    haptics.medium()
  }

  // Loading state with skeleton
  if (isLoading) {
    return <AppointmentBannerSkeleton />
  }

  // Error state with retry
  if (error) {
    return (
      <AsyncErrorFallback 
        error={error} 
        resetError={refetch}
      />
    )
  }

  // No data state
  if (!stats) {
    return null
  }

  const urgency = stats.nearestAppointment 
    ? getUrgencyLevel(stats.nearestAppointment.date) 
    : 'normal'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      {stats.nearestAppointment ? (
        /* Available Appointment - Clean Card */
        <div className={cn(
          "rounded-2xl overflow-hidden border shadow-sm",
          urgency === 'urgent' 
            ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800"
            : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
        )}>
          <div className="p-4 space-y-3">
            {/* Nearest Opportunity Badge */}
            <div className="flex items-center justify-between">
              <div className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide",
                urgency === 'urgent'
                  ? "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300"
                  : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
              )}>
                {urgency === 'urgent' ? (
                  <>
                    <Flame className="h-3 w-3 animate-pulse" />
                    <span>תור קרוב!</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-3 w-3" />
                    <span>התור הקרוב ביותר</span>
                  </>
                )}
              </div>
              <Sparkles className={cn(
                "h-4 w-4 animate-pulse",
                urgency === 'urgent' ? "text-orange-500" : "text-amber-500"
              )} />
            </div>

            {/* Header with icon and status */}
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl transition-transform hover:scale-105",
                urgency === 'urgent'
                  ? "bg-orange-500"
                  : "bg-green-500"
              )}>
                <CalendarCheck className="h-6 w-6 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-bold text-lg",
                  urgency === 'urgent' ? "text-orange-900 dark:text-orange-100" : "text-green-900 dark:text-green-100"
                )}>
                  תור זמין {getRelativeTime(stats.nearestAppointment.date)}
                </h3>
                <p className={cn(
                  "text-sm",
                  urgency === 'urgent' ? "text-orange-700 dark:text-orange-300" : "text-green-700 dark:text-green-300"
                )}>
                  {stats.nearestAppointment.dayName}, {formatDate(stats.nearestAppointment.date)}
                </p>
              </div>
            </div>

            {/* Available times chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "text-xs font-medium",
                urgency === 'urgent' ? "text-orange-700 dark:text-orange-300" : "text-green-700 dark:text-green-300"
              )}>
                שעות:
              </span>
              {stats.nearestAppointment.times.slice(0, 4).map((time, idx) => (
                <motion.span 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-lg",
                    "bg-white dark:bg-gray-900 border",
                    urgency === 'urgent'
                      ? "border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200"
                      : "border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                  )}
                >
                  {time}
                </motion.span>
              ))}
              {stats.nearestAppointment.times.length > 4 && (
                <span className={cn(
                  "text-xs font-medium",
                  urgency === 'urgent' ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"
                )}>
                  +{stats.nearestAppointment.times.length - 4}
                </span>
              )}
            </div>

            {/* CTA Button */}
            <Button
              size="lg"
              className={cn(
                "w-full rounded-xl font-semibold text-base h-12",
                "text-white shadow-sm",
                "active:scale-[0.98] transition-all duration-200",
                "touch-manipulation",
                urgency === 'urgent'
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-green-600 hover:bg-green-700"
              )}
              onClick={handleBookingClick}
              asChild
            >
              <a
                href={stats.nearestAppointment.bookingUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={urgency === 'urgent' ? 'הזמן תור עכשיו - דחוף' : 'הזמן תור עכשיו'}
              >
                <span>{urgency === 'urgent' ? 'הזמן עכשיו!' : 'הזמן עכשיו'}</span>
                <ExternalLink className="mr-2 h-4 w-4" />
              </a>
            </Button>

            {/* Additional appointments indicator */}
            {stats.availableAppointments > 1 && (
              <p className={cn(
                "text-center text-xs",
                urgency === 'urgent' ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"
              )}>
                {stats.availableAppointments} תאריכים זמינים סה״כ
              </p>
            )}
          </div>
        </div>
      ) : (
        /* No Appointments - Subtle Card */
        <div className="rounded-2xl p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-200 dark:bg-gray-800">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">אין תורים פנויים כרגע</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                המערכת בודקת כל 5 דקות
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
