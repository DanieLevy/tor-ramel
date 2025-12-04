"use client"

import { useEffect, useState } from 'react'
import { ExternalLink, AlertCircle, Sparkles, CalendarCheck, Flame, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/hooks/use-haptics'
import { motion } from 'framer-motion'

interface Appointment {
  date: string
  dayName: string
  times: string[]
  bookingUrl: string
}

interface Stats {
  lastCheckTime: string | null
  todayChecks: number
  availableAppointments: number
  nearestAppointment: Appointment | null
}

export function AppointmentBanner() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const haptics = useHaptics()

  useEffect(() => {
    fetchStats()
    // Refresh every 2 minutes
    const interval = setInterval(fetchStats, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/appointments/stats', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }
      
      const data = await response.json()
      setStats(data)
      setError(false)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

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

  const getUrgencyLevel = (dateStr: string) => {
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

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <div className="glass-elevated rounded-2xl p-4">
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </motion.div>
    )
  }

  if (error || !stats) {
    return null
  }

  const urgency = stats.nearestAppointment ? getUrgencyLevel(stats.nearestAppointment.date) : 'normal'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      {stats.nearestAppointment ? (
        /* Available Appointment - Glass Hero Card */
        <div className={cn(
          "glass-elevated rounded-2xl overflow-hidden",
          urgency === 'urgent' 
            ? "bg-gradient-to-br from-orange-500/15 via-red-500/10 to-rose-500/15 dark:from-orange-500/20 dark:via-red-500/15 dark:to-rose-500/20 border-orange-500/25 dark:border-orange-400/25"
            : "bg-gradient-to-br from-green-500/10 via-emerald-500/8 to-teal-500/10 dark:from-green-500/15 dark:via-emerald-500/10 dark:to-teal-500/15 border-green-500/20 dark:border-green-400/20",
          "border shadow-lg",
          urgency === 'urgent' ? "shadow-orange-500/10" : "shadow-green-500/5"
        )}>
          {/* Glass shine overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative p-4 space-y-3">
            {/* Nearest Opportunity Badge */}
            <div className="flex items-center justify-between">
              <div className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide",
                urgency === 'urgent'
                  ? "bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/30"
                  : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
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
                "flex h-12 w-12 items-center justify-center rounded-xl",
                "backdrop-blur-sm ring-1",
                urgency === 'urgent'
                  ? "bg-gradient-to-br from-orange-500/20 to-red-500/20 ring-orange-500/30 dark:ring-orange-400/30"
                  : "bg-gradient-to-br from-green-500/20 to-emerald-500/20 ring-green-500/30 dark:ring-green-400/30"
              )}>
                <CalendarCheck className={cn(
                  "h-6 w-6",
                  urgency === 'urgent' ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"
                )} />
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
                  urgency === 'urgent' ? "text-orange-700/80 dark:text-orange-300/80" : "text-green-700/80 dark:text-green-300/80"
                )}>
                  {stats.nearestAppointment.dayName}, {formatDate(stats.nearestAppointment.date)}
                </p>
              </div>
            </div>

            {/* Available times chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                "text-xs font-medium",
                urgency === 'urgent' ? "text-orange-700/70 dark:text-orange-300/70" : "text-green-700/70 dark:text-green-300/70"
              )}>
                שעות:
              </span>
              {stats.nearestAppointment.times.slice(0, 4).map((time, idx) => (
                <span 
                  key={idx} 
                  className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-lg",
                    "bg-white/60 dark:bg-white/10",
                    "backdrop-blur-sm",
                    urgency === 'urgent'
                      ? "border border-orange-500/20 dark:border-orange-400/20 text-orange-800 dark:text-orange-200"
                      : "border border-green-500/20 dark:border-green-400/20 text-green-800 dark:text-green-200"
                  )}
                >
                  {time}
                </span>
              ))}
              {stats.nearestAppointment.times.length > 4 && (
                <span className={cn(
                  "text-xs font-medium",
                  urgency === 'urgent' ? "text-orange-600/70 dark:text-orange-400/70" : "text-green-600/70 dark:text-green-400/70"
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
                "text-white shadow-lg",
                "active:scale-[0.98] transition-all duration-200",
                "touch-manipulation",
                urgency === 'urgent'
                  ? "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-orange-600/25"
                  : "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 shadow-green-600/25"
              )}
              onClick={handleBookingClick}
              asChild
            >
              <a
                href={stats.nearestAppointment.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>{urgency === 'urgent' ? 'הזמן עכשיו!' : 'הזמן עכשיו'}</span>
                <ExternalLink className="mr-2 h-4 w-4" />
              </a>
            </Button>

            {/* Additional appointments indicator */}
            {stats.availableAppointments > 1 && (
              <p className={cn(
                "text-center text-xs",
                urgency === 'urgent' ? "text-orange-600/70 dark:text-orange-400/70" : "text-green-600/70 dark:text-green-400/70"
              )}>
                {stats.availableAppointments} תאריכים זמינים סה״כ
              </p>
            )}
          </div>
        </div>
      ) : (
        /* No Appointments - Subtle Glass Card */
        <div className={cn(
          "glass rounded-2xl p-4",
          "bg-gray-50/60 dark:bg-gray-900/40",
          "border border-gray-200/50 dark:border-gray-700/30"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              "bg-gray-100 dark:bg-gray-800/50",
              "ring-1 ring-gray-200 dark:ring-gray-700"
            )}>
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
