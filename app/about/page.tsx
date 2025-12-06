'use client'

import { useEffect } from 'react'
import { useHeader } from '@/components/header-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Bell, Shield, Clock, Calendar, Users, Heart, Code } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AboutPage() {
  const updateHeader = useHeader()

  useEffect(() => {
    updateHeader({
      title: 'אודות',
      showMenu: true
    })
  }, [updateHeader])

  return (
    <div className="container mx-auto px-4 py-6 pb-20 max-w-2xl page-content-bottom-spacing">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">תור רם-אל</h1>
          <p className="text-muted-foreground">
            מערכת חכמה לניהול תורים במספרת רם-אל
          </p>
        </div>

        {/* Main Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              מה זה תור רם-אל?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p>
              תור רם-אל היא מערכת התראות חכמה שעוזרת לך למצוא תורים פנויים במספרת רם-אל ללא צורך לבדוק כל הזמן באתר.
            </p>
            <p>
              המערכת בודקת את הזמינות כל 5 דקות ושולחת לך התראה מיידית כאשר תור פנוי נמצא.
            </p>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>תכונות מרכזיות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">בדיקה אוטומטית כל 5 דקות</h3>
                  <p className="text-sm text-muted-foreground">
                    המערכת בודקת זמינות באופן רציף ומתריעה מיד כשיש תור פנוי
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                  <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">התראות מיידיות</h3>
                  <p className="text-sm text-muted-foreground">
                    קבל התראות באימייל או התראות Push ישירות למכשיר הנייד
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                  <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">חיפוש לפי תאריכים</h3>
                  <p className="text-sm text-muted-foreground">
                    בחר תאריך ספציפי או טווח תאריכים והמערכת תמצא תורים עבורך
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                  <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">ניהול חכם</h3>
                  <p className="text-sm text-muted-foreground">
                    השהיה והפעלה מחדש של התראות, התעלמות מזמנים מסוימים, וניהול מתקדם
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                  <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">אבטחה מלאה</h3>
                  <p className="text-sm text-muted-foreground">
                    כל הנתונים מוצפנים ומאובטחים. אף אחד לא רואה את הפרטים שלך
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/40 rounded-lg">
                  <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">ממשק ידידותי</h3>
                  <p className="text-sm text-muted-foreground">
                    עיצוב נקי ופשוט לשימוש, מותאם למכשירים ניידים
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technology */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              טכנולוגיה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Next.js 15</Badge>
              <Badge variant="secondary">React 19</Badge>
              <Badge variant="secondary">TypeScript</Badge>
              <Badge variant="secondary">Supabase</Badge>
              <Badge variant="secondary">Tailwind CSS</Badge>
              <Badge variant="secondary">shadcn/ui</Badge>
              <Badge variant="secondary">PWA</Badge>
              <Badge variant="secondary">Netlify Functions</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">5 דקות</div>
                <div className="text-xs text-muted-foreground">תדירות בדיקה</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">24/7</div>
                <div className="text-xs text-muted-foreground">זמינות</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">מיידי</div>
                <div className="text-xs text-muted-foreground">זמן התראה</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact/Info */}
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            <p>נבנה עם ❤️ למען קהילת משתמשי מספרת רם-אל</p>
            <p className="mt-2">
              © 2025 תור רם-אל - כל הזכויות שמורות
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
