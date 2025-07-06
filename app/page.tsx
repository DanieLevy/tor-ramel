"use client"

import { useEffect } from 'react'
import { useHeader } from '@/components/header-context'
import { useAuth, withAuth } from '@/components/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Bell, Search, LogOut, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'

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
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            ברוך הבא לתור רם-אל
          </h1>
          <p className="text-xl text-muted-foreground">
            המערכת החכמה למציאת תורים במרפאה
          </p>
          {user && (
            <p className="text-sm text-muted-foreground">
              מחובר כ: <span className="font-medium" dir="ltr">{user.email}</span>
            </p>
          )}
        </div>

        {/* Main Actions */}
        <div className="grid gap-6 md:grid-cols-3">
          <Link href="/search">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-primary/20 hover:border-primary/40">
              <CardHeader>
                <Search className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>חיפוש ידני</CardTitle>
                <CardDescription>
                  חפש תורים פנויים בתאריכים הקרובים
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="lg">
                  התחל חיפוש
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/subscribe">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Bell className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>התראות</CardTitle>
                <CardDescription>
                  הרשם לקבלת התראות על תורים פנויים
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="lg" variant="outline">
                  הגדר התראות
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader>
              <TrendingUp className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>סטטיסטיקות</CardTitle>
              <CardDescription>
                נתונים בזמן אמת
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">בדיקות היום:</span>
                  <span className="font-medium">142</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">תורים שנמצאו:</span>
                  <span className="font-medium text-green-600">18</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              איך זה עובד?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">חיפוש אוטומטי</p>
                <p className="text-sm text-muted-foreground">
                  המערכת סורקת את לוח התורים כל 5 דקות ומחפשת תורים פנויים
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">התראות מיידיות</p>
                <p className="text-sm text-muted-foreground">
                  קבל התראה ברגע שנמצא תור פנוי בתאריך שמעניין אותך
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">חיפוש ידני</p>
                <p className="text-sm text-muted-foreground">
                  חפש תורים בעצמך בכל זמן שתרצה
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default withAuth(HomePage)
