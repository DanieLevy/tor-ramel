"use client"

import { useEffect } from 'react'
import { useHeader } from '@/components/header-context'
import { useAuth, withAuth } from '@/components/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogOut, Clock, CheckCircle } from 'lucide-react'
import { AppointmentBanner } from '@/components/appointment-banner'

function HomePage() {
  const updateHeader = useHeader()
  const { user, logout } = useAuth()

  useEffect(() => {
    updateHeader({
      title: 'תור רם-אל',
      showMenu: true
    })
  }, [updateHeader])

  return (
    <div className="container p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Appointment Banner - Full width at top */}
        <AppointmentBanner />

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

export default withAuth(HomePage)
