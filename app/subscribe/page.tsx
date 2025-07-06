"use client"

import { useAuth, withAuth } from '@/components/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, Mail, MessageSquare } from 'lucide-react'

function SubscribePage() {
  const { user } = useAuth()

  return (
    <div className="container py-8 px-4">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">התראות והרשמה</h1>
          <p className="text-muted-foreground">
            קבל התראות כשיש תורים פנויים
          </p>
        </div>

        {/* Coming Soon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              בקרוב...
            </CardTitle>
            <CardDescription>
              מערכת ההתראות תהיה זמינה בקרוב
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-12">
              <div className="flex justify-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold mb-2">מערכת התראות חכמה</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                בקרוב תוכל להירשם לקבלת התראות אוטומטיות במייל, SMS או התראות דחיפה כשיש תורים פנויים בתאריכים שמעניינים אותך.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-dashed">
                <CardHeader className="text-center">
                  <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <CardTitle className="text-base">מייל</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    קבל התראות ישירות למייל שלך
                  </p>
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardHeader className="text-center">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <CardTitle className="text-base">SMS</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    קבל הודעות SMS לנייד
                  </p>
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardHeader className="text-center">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <CardTitle className="text-base">Push</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    התראות דחיפה לאפליקציה
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default withAuth(SubscribePage) 