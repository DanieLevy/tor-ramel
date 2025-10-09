'use client'

import { useEffect, useState } from 'react'
import { useHeader } from '@/components/header-context'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, Clock, Undo2, Trash2, Calendar, AlertCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { cn, pwaFetch } from '@/lib/utils'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface IgnoredTime {
  subscription_id: string
  appointment_date: string
  ignored_times: string[]
  created_at: string
}

interface NotifiedAppointment {
  id: string
  subscription_id: string
  appointment_date: string
  notified_times: string[]
  notification_sent_at: string
  user_response: string | null
}

export default function NotificationsHistoryPage() {
  const updateHeader = useHeader()
  const { user, isLoading: authLoading } = useAuth()
  const [ignoredTimes, setIgnoredTimes] = useState<IgnoredTime[]>([])
  const [notifiedAppointments, setNotifiedAppointments] = useState<NotifiedAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ignored')

  useEffect(() => {
    updateHeader({
      title: 'היסטוריית התראות',
      showMenu: true
    })
  }, [updateHeader])

  useEffect(() => {
    if (user) {
      fetchIgnoredTimes()
    }
  }, [user])

  const fetchIgnoredTimes = async () => {
    try {
      setLoading(true)
      const response = await pwaFetch('/api/notifications/ignored-times')
      
      if (response.ok) {
        const data = await response.json()
        setIgnoredTimes(data)
      } else {
        console.error('Failed to fetch ignored times')
      }
    } catch (error) {
      console.error('Error fetching ignored times:', error)
      toast.error('שגיאה בטעינת נתונים')
    } finally {
      setLoading(false)
    }
  }

  const handleUnignoreTime = async (subscriptionId: string, appointmentDate: string, time: string) => {
    try {
      const response = await pwaFetch('/api/notifications/ignored-times', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          appointment_date: appointmentDate,
          time
        })
      })

      if (response.ok) {
        toast.success('הזמן הוחזר בהצלחה')
        fetchIgnoredTimes()
      } else {
        toast.error('שגיאה בהחזרת הזמן')
      }
    } catch (error) {
      console.error('Error unignoring time:', error)
      toast.error('שגיאה בהחזרת הזמן')
    }
  }

  const handleUnignoreAllForDate = async (subscriptionId: string, appointmentDate: string) => {
    try {
      const response = await pwaFetch('/api/notifications/ignored-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          appointment_date: appointmentDate
        })
      })

      if (response.ok) {
        toast.success('כל הזמנים הוחזרו')
        fetchIgnoredTimes()
      } else {
        toast.error('שגיאה בהחזרת הזמנים')
      }
    } catch (error) {
      console.error('Error unignoring all times:', error)
      toast.error('שגיאה בהחזרת הזמנים')
    }
  }

  if (authLoading) {
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">נדרש אימות</CardTitle>
            <CardDescription>
              התחבר כדי לצפות בהיסטוריית ההתראות
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/login">התחבר</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-20 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold mb-2">היסטוריית התראות</h1>
          <p className="text-muted-foreground">
            ניהול זמנים שהתעלמת מהם והיסטוריית התראות
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="ignored" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              זמנים שהתעלמת מהם
            </TabsTrigger>
          </TabsList>

          {/* Ignored Times Tab */}
          <TabsContent value="ignored" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : ignoredTimes.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground text-center mb-2">
                    אין זמנים שהתעלמת מהם
                  </p>
                  <p className="text-sm text-muted-foreground text-center">
                    כאשר תבחר &quot;אף תור לא מתאים&quot;, הזמנים יופיעו כאן
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  <AnimatePresence>
                    {ignoredTimes.map((item, index) => (
                      <motion.div
                        key={`${item.subscription_id}-${item.appointment_date}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                  <Calendar className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <CardTitle className="text-lg">
                                    {format(new Date(item.appointment_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: he })}
                                  </CardTitle>
                                  <CardDescription className="flex items-center gap-1 mt-1">
                                    <Clock className="h-3 w-3" />
                                    {item.ignored_times.length} זמנים
                                  </CardDescription>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnignoreAllForDate(item.subscription_id, item.appointment_date)}
                                className="text-xs"
                              >
                                <Undo2 className="h-3 w-3 ml-1" />
                                החזר הכל
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {item.ignored_times.map((time) => (
                                <div
                                  key={time}
                                  className="relative inline-flex items-center gap-2 px-3 py-2 bg-muted active:bg-muted/70 rounded-lg border border-border transition-colors touch-manipulation"
                                >
                                  <span className="text-sm font-medium">{time}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 p-0 touch-manipulation active:bg-primary/20"
                                    onClick={() => handleUnignoreTime(item.subscription_id, item.appointment_date, time)}
                                    title="החזר זמן זה"
                                  >
                                    <Undo2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium">כיצד זה עובד?</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• כאשר תבחר &quot;אף תור לא מתאים&quot; בהתראת אימייל, הזמנים נשמרים כאן</li>
                  <li>• המערכת לא תשלח לך התראות על זמנים שהתעלמת מהם</li>
                  <li>• אתה יכול להחזיר זמנים בכל עת על ידי לחיצה על כפתור ההחזרה</li>
                  <li>• זמנים שהוחזרו יופיעו שוב בהתראות עתידיות</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

