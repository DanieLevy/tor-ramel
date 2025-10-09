"use client"

import { Suspense } from 'react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2, Home, Bell, Clock, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function NotificationActionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [processing, setProcessing] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    action?: string
  } | null>(null)

  // Get times from URL params if available
  const times = searchParams.get('times')
  const date = searchParams.get('date')
  const appointmentsParam = searchParams.get('appointments')
  
  // Parse appointments data if available - wrapped in useMemo to prevent dependency changes
  const appointments = useMemo(() => {
    let parsed: Array<{ date: string; times: string[] }> = []
    if (appointmentsParam) {
      try {
        parsed = JSON.parse(decodeURIComponent(appointmentsParam))
      } catch (e) {
        console.error('Failed to parse appointments:', e)
      }
    }
    return parsed
  }, [appointmentsParam])
  
  const timesList = times ? times.split(',') : []

  const handleAction = useCallback(async () => {
    const action = searchParams.get('action')
    const subscriptionId = searchParams.get('subscription')

    if (!action || !subscriptionId) {
      setResult({
        success: false,
        message: 'פרמטרים חסרים בקישור'
      })
      setProcessing(false)
      setShowDialog(true)
      return
    }

    try {
      if (action === 'approve') {
        // Handle approve action
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
            message: 'מצוין! המנוי שלך סומן כהושלם.',
            action: 'approve'
          })
        } else {
          const error = await response.json()
          setResult({
            success: false,
            message: error.message || 'אירעה שגיאה בעדכון המנוי'
          })
        }
      } else if (action === 'decline') {
        // Handle decline action
        let bodyData: any = {
          action: 'decline',
          subscriptionId
        }
        
        // Check if we have multi-date appointments
        if (appointments.length > 0) {
          bodyData.appointments = appointments
        } else if (times && date) {
          // Backward compatibility for single date
          bodyData.times = times.split(',')
          bodyData.date = date
        } else {
          setResult({
            success: false,
            message: 'חסרים פרטי השעות שנדחו'
          })
          setProcessing(false)
          setShowDialog(true)
          return
        }

        const response = await fetch('/api/notifications/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(bodyData)
        })

        if (response.ok) {
          setResult({
            success: true,
            message: 'השעות שנדחו נשמרו. תמשיך לקבל התראות.',
            action: 'decline'
          })
        } else {
          const error = await response.json()
          setResult({
            success: false,
            message: error.message || 'אירעה שגיאה בשמירת השעות שנדחו'
          })
        }
      } else if (action === 'unsubscribe') {
        // Handle unsubscribe action
        const response = await fetch('/api/notifications/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'unsubscribe',
            subscriptionId
          })
        })

        if (response.ok) {
          setResult({
            success: true,
            message: 'ההרשמה בוטלה בהצלחה.',
            action: 'unsubscribe'
          })
        } else {
          const error = await response.json()
          setResult({
            success: false,
            message: error.message || 'אירעה שגיאה בביטול ההרשמה'
          })
        }
      } else {
        setResult({
          success: false,
          message: 'פעולה לא מזוהה'
        })
      }
    } catch (error) {
      console.error('Error processing action:', error)
      setResult({
        success: false,
        message: 'אירעה שגיאה בתקשורת עם השרת'
      })
    } finally {
      setProcessing(false)
      setShowDialog(true)
    }
  }, [searchParams, times, date, appointments])

  useEffect(() => {
    handleAction()
  }, [handleAction])

  const getDialogContent = () => {
    if (!result) return null

    if (result.success && result.action === 'approve') {
      return (
        <>
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">מעולה! 🎉</DialogTitle>
            <DialogDescription className="text-center">
              אנחנו שמחים שמצאת תור מתאים
            </DialogDescription>
          </DialogHeader>
          {/* Show appointment details if available */}
          {appointments.length > 0 ? (
            <div className="space-y-4 pt-4 max-h-[300px] overflow-y-auto">
              {appointments.map((apt, index) => (
                <div key={index} className="space-y-2">
                  <div className="text-center">
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      {apt.date}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {apt.times.slice(0, 6).map((time, timeIndex) => (
                      <div 
                        key={timeIndex}
                        className="text-center p-2 rounded-lg bg-muted/50 border border-border"
                      >
                        <span className="text-sm font-medium">{time}</span>
                      </div>
                    ))}
                    {apt.times.length > 6 && (
                      <div className="text-center p-2 rounded-lg bg-muted/50 border border-border">
                        <span className="text-sm text-muted-foreground">+{apt.times.length - 6}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-center text-sm text-muted-foreground pt-2">
                בהצלחה בתור שלך!
              </p>
            </div>
          ) : date && timesList.length > 0 ? (
            <div className="space-y-4 pt-4">
              <div className="text-center">
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {date}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {timesList.map((time, index) => (
                  <div 
                    key={index}
                    className="text-center p-2 rounded-lg bg-muted/50 border border-border"
                  >
                    <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <span className="font-medium">{time}</span>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground pt-2">
                בהצלחה בתור שלך!
              </p>
            </div>
          ) : null}
        </>
      )
    }

    if (result.success && result.action === 'decline') {
      return (
        <>
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Bell className="h-8 w-8 text-blue-600" />
            </div>
            <DialogTitle className="text-center text-xl">הבנו 👍</DialogTitle>
            <DialogDescription className="text-center">
              נמשיך לחפש עבורך ונודיע לך כשיתפנו שעות חדשות
            </DialogDescription>
          </DialogHeader>
        </>
      )
    }

    if (result.success && result.action === 'unsubscribe') {
      return (
        <>
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <DialogTitle className="text-center text-xl">ההרשמה בוטלה</DialogTitle>
            <DialogDescription className="text-center">
              לא תקבל יותר התראות. תוכל להירשם מחדש בכל עת.
            </DialogDescription>
          </DialogHeader>
        </>
      )
    }

    // Error state
    return (
      <>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <DialogTitle className="text-center text-xl">שגיאה</DialogTitle>
          <DialogDescription className="text-center">
            {result.message}
          </DialogDescription>
        </DialogHeader>
      </>
    )
  }

  return (
    <div className="container py-8 px-4 max-w-xl mx-auto">
      <div className="space-y-6">
        {/* Loading State */}
        {processing && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">מעבד את הבקשה שלך...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            {getDialogContent()}
            <div className="flex flex-col gap-3 pt-6">
              <Button
                onClick={() => router.push('/')}
                variant="default"
                size="lg"
                className="w-full"
              >
                <Home className="ml-2 h-4 w-4" />
                לדף הבית
              </Button>
              <Button
                onClick={() => router.push('/subscribe')}
                variant="outline"
                size="lg"
                className="w-full"
              >
                <Bell className="ml-2 h-4 w-4" />
                ניהול התראות
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default function NotificationActionPage() {
  return (
    <Suspense fallback={
      <div className="container py-8 px-4 max-w-xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">טוען...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <NotificationActionContent />
    </Suspense>
  )
} 