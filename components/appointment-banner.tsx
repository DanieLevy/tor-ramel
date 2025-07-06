"use client"

import { useEffect, useState } from 'react'
import { ExternalLink, Calendar, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

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
      const response = await fetch('/api/appointments/stats')
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
    const diffHours = Math.floor(diffMs / 3600000)
    
    if (diffMins < 1) return 'הרגע'
    if (diffMins < 60) return `לפני ${diffMins} דקות`
    if (diffHours < 24) return `לפני ${diffHours} שעות`
    return date.toLocaleDateString('he-IL')
  }

  if (loading) {
    return (
      <div className="w-full space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !stats) {
    return null
  }

  return (
    <div className="space-y-3">
      {/* Main appointment banner */}
      {stats.nearestAppointment ? (
        <Alert className="border-green-500/20 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 border-0 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 shadow-sm">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">
                  תור זמין {getRelativeTime(stats.nearestAppointment.date)}!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {stats.nearestAppointment.dayName}, {formatDate(stats.nearestAppointment.date)} • {stats.nearestAppointment.times.length} זמנים פנויים
                </p>
              </div>
            </div>
            
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
              asChild
            >
              <a
                href={stats.nearestAppointment.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                הזמן תור
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </Alert>
      ) : (
        <Alert className="border-muted bg-muted/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              אין תורים פנויים כרגע - המערכת ממשיכה לחפש
            </p>
          </div>
        </Alert>
      )}

      {/* Last check info */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="h-3.5 w-3.5" />
        <span>בדיקה אחרונה: {formatLastCheckTime(stats.lastCheckTime)}</span>
        <span className="mx-1">•</span>
        <span>{stats.availableAppointments} תורים זמינים סה״כ</span>
      </div>
    </div>
  )
} 