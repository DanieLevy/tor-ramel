"use client"

import { useEffect } from 'react'
import { useHeader } from '@/components/header-context'
import { useAuth } from '@/components/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogOut, Clock, CheckCircle } from 'lucide-react'
import { AppointmentBanner } from '@/components/appointment-banner'

export default function HomePage() {
  const updateHeader = useHeader()
  const { user, logout, isLoading } = useAuth()

  useEffect(() => {
    updateHeader({
      title: 'תור רם-אל',
      showMenu: true
    })
  }, [updateHeader])

  // Debug info
  console.log('HomePage - Auth state:', { user, isLoading })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">טוען...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container p-4">
        <div className="mx-auto max-w-4xl">
          <Card className="bg-muted/30">
            <CardContent className="p-6 text-center">
              <p className="text-lg font-medium mb-4">אינך מחובר למערכת</p>
              <Button onClick={() => window.location.href = '/login'}>
                עבור להתחברות
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Appointment Banner - Full width at top */}
        <AppointmentBanner />

        {/* User Info Debug */}
        <Card className="bg-muted/10 border-muted">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">מחובר כ: {user.email}</p>
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card className="bg-muted/30 border-muted">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              איך המערכת עובדת?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">סריקה אוטומטית כל 5 דקות</p>
                <p className="text-xs text-muted-foreground">
                  המערכת בודקת תורים פנויים באופן רציף
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">התראות מיידיות</p>
                <p className="text-xs text-muted-foreground">
                  קבל הודעה ברגע שנמצא תור
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">חיפוש ידני מהיר</p>
                <p className="text-xs text-muted-foreground">
                  חפש תורים בכל רגע נתון
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>המערכת פועלת 24/7 ומחפשת עבורך תורים פנויים</p>
          <p className="mt-1">השתמש בתפריט התחתון כדי לנווט במערכת</p>
        </div>
      </div>
    </div>
  )
}
