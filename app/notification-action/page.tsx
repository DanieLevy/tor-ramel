"use client"

import { Suspense } from 'react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Home, 
  Bell, 
  Clock, 
  AlertCircle,
  Calendar,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Flame
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface AppointmentData {
  date: string
  times: string[]
}

function NotificationActionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [processing, setProcessing] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [actionComplete, setActionComplete] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    action?: string
  } | null>(null)

  // Parse URL params
  const subscriptionId = searchParams.get('subscription')
  const bookingUrlParam = searchParams.get('booking_url')
  const notificationType = searchParams.get('type') || 'appointment'
  const appointmentsParam = searchParams.get('appointments')
  const dateParam = searchParams.get('date')
  const timesParam = searchParams.get('times')
  const datesParam = searchParams.get('dates') // For legacy support - plural dates
  const actionParam = searchParams.get('action') // For email links that specify action
  
  // Decode booking URL if present
  const bookingUrl = bookingUrlParam ? decodeURIComponent(bookingUrlParam) : null
  
  // Parse appointments data with multiple fallback strategies
  const appointments = useMemo<AppointmentData[]>(() => {
    // Strategy 1: Full appointments JSON array
    if (appointmentsParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(appointmentsParam))
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('[NotificationAction] Parsed appointments from JSON:', parsed.length)
          return parsed
        }
      } catch (e) {
        console.error('[NotificationAction] Failed to parse appointments JSON:', e)
      }
    }
    
    // Strategy 2: Single date + times params (legacy email format)
    if (dateParam && timesParam) {
      console.log('[NotificationAction] Using single date/times params')
      return [{
        date: dateParam,
        times: timesParam.split(',').map(t => t.trim()).filter(Boolean)
      }]
    }
    
    // Strategy 3: Multiple dates param (legacy - dates without times)
    // Note: This is a fallback that shows dates but no times
    if (datesParam) {
      console.log('[NotificationAction] Using dates param (no times available)')
      const dates = datesParam.split(',').map(d => d.trim()).filter(Boolean)
      return dates.map(date => ({
        date,
        times: [] // No times available in this format
      }))
    }
    
    console.log('[NotificationAction] No appointment data found in URL')
    return []
  }, [appointmentsParam, dateParam, timesParam, datesParam])

  // Initialize page and handle auto-actions from email links
  useEffect(() => {
    // Short delay to show loading state, then check for auto-action
    const timer = setTimeout(() => {
      setInitialLoading(false)
      
      // Auto-trigger action if specified in URL (from email links)
      if (actionParam && subscriptionId && !actionComplete) {
        console.log('[NotificationAction] Auto-triggering action from URL:', actionParam)
        
        if (actionParam === 'approve') {
          // Auto-approve - mark subscription as complete
          handleApprove()
        } else if (actionParam === 'decline' && appointments.length > 0) {
          // Auto-decline - ignore these times (requires appointments data)
          handleDecline()
        } else if (actionParam === 'unsubscribe') {
          // Unsubscribe action - redirect to unsubscribe flow
          router.push(`/unsubscribe?subscription=${subscriptionId}`)
        }
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [actionParam, subscriptionId, appointments, actionComplete, handleApprove, handleDecline, router])

  // Handle approve action - user found a suitable appointment
  const handleApprove = useCallback(async () => {
    if (!subscriptionId) {
      toast.error('חסר מזהה התראה')
      return
    }
    
    setProcessing(true)
    
    try {
      const response = await fetch('/api/notifications/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'approve',
          subscriptionId
        })
      })

      if (response.ok) {
        setResult({
          success: true,
          message: 'מעולה! המעקב סומן כהושלם בהצלחה.',
          action: 'approve'
        })
        setActionComplete(true)
        toast.success('מצוין! מצאת תור מתאים 🎉')
      } else {
        const error = await response.json()
        setResult({
          success: false,
          message: error.message || 'אירעה שגיאה'
        })
        toast.error(error.message || 'אירעה שגיאה')
      }
    } catch {
      setResult({
        success: false,
        message: 'אירעה שגיאה בתקשורת'
      })
      toast.error('שגיאה בתקשורת עם השרת')
    } finally {
      setProcessing(false)
    }
  }, [subscriptionId])

  // Handle decline action - ignore these times
  const handleDecline = useCallback(async () => {
    if (!subscriptionId) {
      toast.error('חסר מזהה התראה')
      return
    }
    
    if (appointments.length === 0) {
      toast.error('חסרים פרטי השעות')
      return
    }
    
    setProcessing(true)
    
    try {
      const response = await fetch('/api/notifications/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'decline',
          subscriptionId,
          appointments
        })
      })

      if (response.ok) {
        setResult({
          success: true,
          message: 'השעות נשמרו לרשימת ההתעלמות. נמשיך לחפש עבורך!',
          action: 'decline'
        })
        setActionComplete(true)
        toast.success('השעות נשמרו - נמשיך לעדכן אותך!')
      } else {
        const error = await response.json()
        setResult({
          success: false,
          message: error.message || 'אירעה שגיאה'
        })
        toast.error(error.message || 'אירעה שגיאה')
      }
    } catch {
      setResult({
        success: false,
        message: 'אירעה שגיאה בתקשורת'
      })
      toast.error('שגיאה בתקשורת עם השרת')
    } finally {
      setProcessing(false)
    }
  }, [subscriptionId, appointments])

  // Handle book action - redirect to external booking
  const handleBook = useCallback(() => {
    if (bookingUrl) {
      window.open(decodeURIComponent(bookingUrl), '_blank')
    }
  }, [bookingUrl])

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
      const dayName = dayNames[date.getDay()]
      const day = date.getDate()
      const month = date.getMonth() + 1
      return { dayName, formatted: `${day}/${month}`, full: `יום ${dayName}, ${day}/${month}` }
    } catch {
      return { dayName: '', formatted: dateStr, full: dateStr }
    }
  }

  // Get total times count
  const totalTimes = appointments.reduce((sum, apt) => sum + apt.times.length, 0)

  // Loading state
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <p className="text-muted-foreground">טוען פרטי התראה...</p>
        </motion.div>
      </div>
    )
  }

  // Check if we have appointments with no times (dates-only fallback)
  const hasAppointmentsWithNoTimes = appointments.length > 0 && appointments.every(apt => apt.times.length === 0)

  // No appointments state - show error only if truly no data
  if (appointments.length === 0 && !actionComplete) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-lg text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">חסרים פרטים</h1>
          <p className="text-muted-foreground mb-6">לא ניתן לטעון את פרטי ההתראה</p>
          <div className="space-y-3">
            <Button onClick={() => router.push('/search')} className="w-full" variant="default">
              <Calendar className="ml-2 h-4 w-4" />
              חפש תורים פנויים
            </Button>
            <Button onClick={() => router.push('/')} className="w-full" variant="outline">
              <Home className="ml-2 h-4 w-4" />
              לדף הבית
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Action complete state
  if (actionComplete && result) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-lg text-center"
        >
          {result.success ? (
            <>
              <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
                result.action === 'approve' 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                {result.action === 'approve' ? (
                  <Sparkles className="h-10 w-10 text-green-600 dark:text-green-400" />
                ) : (
                  <Bell className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {result.action === 'approve' ? 'מעולה! 🎉' : 'הבנו 👍'}
              </h1>
              <p className="text-muted-foreground mb-8">{result.message}</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-6 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">שגיאה</h1>
              <p className="text-muted-foreground mb-8">{result.message}</p>
            </>
          )}
          
          <div className="space-y-3">
            <Button onClick={() => router.push('/')} className="w-full" size="lg">
              <Home className="ml-2 h-4 w-4" />
              לדף הבית
            </Button>
            <Button onClick={() => router.push('/subscribe')} variant="outline" className="w-full" size="lg">
              <Bell className="ml-2 h-4 w-4" />
              ניהול התראות
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Main view - show appointments and actions
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 safe-area-padding">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                {notificationType === 'hot-alert' && <Flame className="h-5 w-5 text-red-500" />}
                {notificationType === 'hot-alert' ? 'תור חם!' : 'תורים פנויים'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {appointments.length} תאריכים • {totalTimes} שעות זמינות
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Appointments List */}
        <div className="space-y-4">
          <AnimatePresence>
            {appointments.map((apt, index) => {
              const dateInfo = formatDate(apt.date)
              return (
                <motion.div
                  key={apt.date}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm"
                >
                  {/* Date Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{dateInfo.full}</div>
                        <div className="text-xs text-muted-foreground">{apt.times.length} שעות פנויות</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {dateInfo.formatted}
                    </Badge>
                  </div>
                  
                  {/* Times Grid */}
                  {apt.times.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {apt.times.slice(0, 9).map((time, timeIndex) => (
                        <div 
                          key={timeIndex}
                          className="text-center py-2.5 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 border-2 border-transparent hover:border-blue-500 transition-colors cursor-default"
                        >
                          <Clock className="h-4 w-4 mx-auto mb-1 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm font-bold text-foreground">{time}</span>
                        </div>
                      ))}
                      {apt.times.length > 9 && (
                        <div className="text-center py-2.5 px-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-sm text-muted-foreground font-medium">
                            +{apt.times.length - 9}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        יש תורים פנויים בתאריך זה
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        לחץ על &quot;פתח אתר הזמנות&quot; לצפייה בכל השעות
                      </p>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Book Now Button (if booking URL available) */}
        {bookingUrl && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={handleBook}
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 text-base font-semibold rounded-xl"
            >
              <ExternalLink className="ml-2 h-5 w-5" />
              פתח אתר הזמנות
            </Button>
          </motion.div>
        )}

        {/* Info Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800"
        >
          {hasAppointmentsWithNoTimes ? (
            <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
              <span className="font-semibold">נמצאו תורים פנויים!</span> לחץ על &quot;פתח אתר הזמנות&quot; לצפייה בכל השעות.
              <br />
              <span className="text-xs opacity-80">לאחר שתזמין, לחץ על &quot;מצאתי תור&quot; לסגירת המעקב.</span>
            </p>
          ) : (
            <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
              <span className="font-semibold">מצאת תור מתאים?</span> לחץ על &quot;מצאתי תור&quot; והמעקב יסתיים.
              <br />
              <span className="text-xs opacity-80">לחיצה על &quot;לא מתאים&quot; תמנע התראות עתידיות על שעות אלו בלבד.</span>
            </p>
          )}
        </motion.div>
      </div>

      {/* Fixed Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 fixed-action-buttons">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            onClick={handleDecline}
            disabled={processing}
            variant="outline"
            size="lg"
            className="flex-1 h-14 text-base border-2 rounded-xl"
          >
            {processing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <XCircle className="ml-2 h-5 w-5" />
                לא מתאים
              </>
            )}
          </Button>
          <Button
            onClick={handleApprove}
            disabled={processing}
            size="lg"
            className="flex-1 h-14 text-base bg-green-600 hover:bg-green-700 text-white rounded-xl"
          >
            {processing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="ml-2 h-5 w-5" />
                מצאתי תור
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function NotificationActionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <p className="text-muted-foreground">טוען...</p>
        </div>
      </div>
    }>
      <NotificationActionContent />
    </Suspense>
  )
}
