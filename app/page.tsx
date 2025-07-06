"use client"

import { useEffect } from 'react'
import { useHeader } from '@/components/header-context'
import { useAuth, withAuth } from '@/components/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Bell, Search, LogOut } from 'lucide-react'

function HomePage() {
  const updateHeader = useHeader()
  const { user, logout } = useAuth()

  useEffect(() => {
    updateHeader({
      title: 'תור רם-אל',
      showMenu: true,
      customActions: (
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          title={user?.email}
        >
          <LogOut className="h-4 w-4" />
          <span className="mr-2 hidden sm:inline">יציאה</span>
        </Button>
      )
    })
  }, [updateHeader, logout, user])

  return (
    <div className="container py-8 px-4">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            מערכת חיפוש תורים אוטומטית
          </h1>
          <p className="text-xl text-muted-foreground">
            מצא תורים פנויים בקלות ובמהירות
          </p>
          {user && (
            <p className="text-sm text-muted-foreground">
              מחובר כ: <span className="font-medium" dir="ltr">{user.email}</span>
            </p>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Calendar className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>בדיקת תורים</CardTitle>
              <CardDescription>
                סריקה אוטומטית של 30 הימים הקרובים
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg">
                <Search className="mr-2 h-4 w-4" />
                חפש תורים
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Bell className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>התראות חכמות</CardTitle>
              <CardDescription>
                קבל התראה כשיש תור פנוי בתאריך שבחרת
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg" variant="outline">
                הגדר התראה
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-10 w-10 mb-2 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">24/7</span>
              </div>
              <CardTitle>סריקה רציפה</CardTitle>
              <CardDescription>
                המערכת פועלת סביב השעון ומחפשת תורים עבורך
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg" variant="outline">
                למד עוד
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Status Section */}
        <Card>
          <CardHeader>
            <CardTitle>סטטוס המערכת</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">סטטוס:</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">פעיל</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">בדיקה אחרונה:</span>
              <span className="text-sm font-medium">לפני 2 דקות</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">תורים שנמצאו היום:</span>
              <span className="text-sm font-medium">18</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default withAuth(HomePage)
