"use client"

import { useEffect, useState } from 'react'
import { ExternalLink, Calendar, Clock, AlertCircle, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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

  const formatLastCheckTime = (timeStr: string | null) => {
    if (!timeStr) return 'לא זמין'
    
    const date = new Date(timeStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'הרגע'
    if (diffMins < 60) return `לפני ${diffMins} דקות`
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="w-full p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-2xl">
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !stats) {
    return null
  }

  return (
    <div className="w-full space-y-3">
      {/* Main appointment banner */}
      {stats.nearestAppointment ? (
        <div className={cn(
          "relative overflow-hidden rounded-2xl",
          "bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10",
          "border border-green-500/20",
          "p-4 transition-all duration-300",
          "hover:shadow-lg hover:shadow-green-500/5"
        )}>
          {/* Sparkle decoration */}
          <Sparkles className="absolute top-3 left-3 h-4 w-4 text-green-500/30 animate-pulse" />
          
          <div className="flex flex-col gap-3">
            {/* Top section with icon and text */}
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                "bg-gradient-to-br from-green-500/20 to-emerald-500/20",
                "ring-1 ring-green-500/20"
              )}>
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    תור זמין {getRelativeTime(stats.nearestAppointment.date)}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs bg-green-500/10 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                    <Clock className="h-3 w-3" />
                    {stats.nearestAppointment.times.length} זמנים
                  </span>
                </div>
                <p className="text-sm text-green-700/80 dark:text-green-300/80 mt-0.5">
                  {stats.nearestAppointment.dayName}, {formatDate(stats.nearestAppointment.date)}
                </p>
              </div>
            </div>

            {/* Available times preview */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">שעות זמינות:</span>
              {stats.nearestAppointment.times.slice(0, 3).map((time, idx) => (
                <span 
                  key={idx} 
                  className="text-xs font-medium bg-background/60 backdrop-blur-sm px-2 py-1 rounded-lg border border-green-500/20"
                >
                  {time}
                </span>
              ))}
              {stats.nearestAppointment.times.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{stats.nearestAppointment.times.length - 3} עוד
                </span>
              )}
            </div>

            {/* Action button */}
            <Button
              size="sm"
              className={cn(
                "w-full rounded-xl font-medium",
                "bg-green-600 hover:bg-green-700 text-white",
                "shadow-sm hover:shadow-md transition-all duration-200"
              )}
              asChild
            >
              <a
                href={stats.nearestAppointment.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>הזמן עכשיו</span>
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      ) : (
        <div className={cn(
          "rounded-2xl border border-muted-foreground/10",
          "bg-gradient-to-r from-muted/30 to-muted/10",
          "p-4 transition-all duration-300"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              "bg-muted/50 ring-1 ring-border/50"
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

      {/* Status bar */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground px-2">
        <div className="flex items-center gap-1.5">
          <RefreshCw className="h-3 w-3" />
          <span>{formatLastCheckTime(stats.lastCheckTime)}</span>
        </div>
        {stats.availableAppointments > 0 && (
          <>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span>{stats.availableAppointments} תורים זמינים</span>
          </>
        )}
      </div>
    </div>
  )
} 