"use client"

import { useEffect, useState } from 'react'
import { ExternalLink, Calendar, Clock, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface Appointment {
  date: string
  dayName: string
  times: string[]
  bookingUrl: string
  checkedAt: string
}

export function AppointmentBanner() {
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchNearestAppointment()
    // Refresh every 5 minutes
    const interval = setInterval(fetchNearestAppointment, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchNearestAppointment = async () => {
    try {
      const response = await fetch('/api/appointments/nearest')
      const data = await response.json()
      
      if (data.found && data.appointment) {
        setAppointment(data.appointment)
      } else {
        setAppointment(null)
      }
      setError(false)
    } catch (err) {
      console.error('Failed to fetch appointment:', err)
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

  if (loading) {
    return (
      <div className="w-full">
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !appointment) {
    return null
  }

  return (
    <Alert className="border-green-500/20 bg-green-50/50 dark:bg-green-950/20">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
            <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium text-green-900 dark:text-green-100">
              תור זמין {getRelativeTime(appointment.date)}!
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              {appointment.dayName}, {formatDate(appointment.date)} • {appointment.times.length} זמנים פנויים
            </p>
          </div>
        </div>
        
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          asChild
        >
          <a
            href={appointment.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            הזמן תור
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </Alert>
  )
} 