"use client"

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2, Home, Calendar } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

function NotificationActionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [processing, setProcessing] = useState(true)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    action?: string
  } | null>(null)

  useEffect(() => {
    handleAction()
  }, [])

  const handleAction = async () => {
    const action = searchParams.get('action')
    const subscriptionId = searchParams.get('subscription')
    const times = searchParams.get('times')
    const date = searchParams.get('date')

    if (!action || !subscriptionId) {
      setResult({
        success: false,
        message: 'פרמטרים חסרים בקישור'
      })
      setProcessing(false)
      return
    }

    try {
      if (action === 'approve') {
        // Handle approve action
        const response = await fetch('/api/notifications/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'approve',
            subscriptionId
          })
        })

        if (response.ok) {
          setResult({
            success: true,
            message: 'מצוין! המנוי שלך סומן כהושלם. לא תקבל התראות נוספות עבור מנוי זה.',
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
        if (!times || !date) {
          setResult({
            success: false,
            message: 'חסרים פרטי השעות שנדחו'
          })
          setProcessing(false)
          return
        }

        const response = await fetch('/api/notifications/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'decline',
            subscriptionId,
            times: times.split(','),
            date
          })
        })

        if (response.ok) {
          setResult({
            success: true,
            message: 'השעות שנדחו נשמרו. תמשיך לקבל התראות אם יתפנו שעות חדשות.',
            action: 'decline'
          })
        } else {
          const error = await response.json()
          setResult({
            success: false,
            message: error.message || 'אירעה שגיאה בשמירת השעות שנדחו'
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
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-12 px-4">
      <div className="container max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">עדכון התראות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {processing ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">מעבד את הבקשה שלך...</p>
              </div>
            ) : result ? (
              <div className="space-y-6">
                <Alert className={result.success ? "border-green-500" : "border-red-500"}>
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <AlertDescription className="text-base">
                      {result.message}
                    </AlertDescription>
                  </div>
                </Alert>

                {result.success && result.action === 'approve' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">מעולה! 🎉</h3>
                    <p className="text-muted-foreground">
                      אנחנו שמחים שמצאת תור מתאים. בהצלחה!
                    </p>
                  </div>
                )}

                {result.success && result.action === 'decline' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <Calendar className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">הבנו 👍</h3>
                    <p className="text-muted-foreground">
                      נמשיך לחפש עבורך ונודיע לך כשיתפנו שעות חדשות
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => router.push('/')}
                    variant="default"
                    className="gap-2"
                  >
                    <Home className="h-4 w-4" />
                    לדף הבית
                  </Button>
                  <Button
                    onClick={() => router.push('/subscribe')}
                    variant="outline"
                    className="gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    ניהול הרשמות
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-muted-foreground">משהו השתבש. אנא נסה שוב.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function NotificationActionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-12 px-4">
        <div className="container max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">טוען...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <NotificationActionContent />
    </Suspense>
  )
} 