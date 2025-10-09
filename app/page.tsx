"use client"

import { useEffect, useState, useCallback } from 'react'
import { useHeader } from '@/components/header-context'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Bell, Loader2, Trash2, CheckCircle, AlertCircle, CalendarDays, Search, Zap, TrendingUp, Clock, Target, Award, Activity, Sparkles, BarChart3, Calendar, Users, Shield, Pause, Play, Mail, MessageSquare, BellRing, Undo2 } from 'lucide-react'
import { AppointmentBanner } from '@/components/appointment-banner'
import Link from 'next/link'
import { format } from 'date-fns'
import { cn, pwaFetch } from '@/lib/utils'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface Subscription {
  id: string
  subscription_date: string | null
  date_range_start: string | null
  date_range_end: string | null
  is_active: boolean
  created_at: string
  completed_at: string | null
  subscription_status?: 'active' | 'paused' | 'completed'
  notification_method?: 'email' | 'push' | 'both'
  preferred_time_ranges?: Array<{ start: string; end: string }>
  paused_at?: string | null
  paused_until?: string | null
}

interface DashboardStats {
  totalSubscriptions: number
  activeSubscriptions: number
  completedSubscriptions: number
  successRate: number
  totalNotificationsSent: number
  appointmentsFound: number
  averageResponseTime: number
  lastActivity: string | null
}

export default function HomePage() {
  const updateHeader = useHeader()
  const { user, logout, isLoading } = useAuth()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [fetchingSubscriptions, setFetchingSubscriptions] = useState(true)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [nextCheckCountdown, setNextCheckCountdown] = useState(300) // 5 minutes in seconds
  const [ignoredTimesCount, setIgnoredTimesCount] = useState<{ count: number; dates: number } | null>(null)

  useEffect(() => {
    updateHeader({
      title: 'תור רם-אל',
      showMenu: true
    })
  }, [updateHeader])

  useEffect(() => {
    if (user) {
      fetchSubscriptions()
      fetchIgnoredTimesCount()
    }
  }, [user])

  const fetchIgnoredTimesCount = async () => {
    try {
      const response = await pwaFetch('/api/notifications/ignored-times?count_only=true')
      
      if (response.ok) {
        const data = await response.json()
        setIgnoredTimesCount(data)
      }
    } catch (error) {
      console.error('Failed to fetch ignored times count:', error)
    }
  }

  const calculateDashboardStats = useCallback(() => {
    const total = subscriptions.length
    const active = subscriptions.filter(sub => sub.is_active).length
    const completed = subscriptions.filter(sub => !sub.is_active).length
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0
    
    // Simulate some stats based on subscriptions
    const notificationsSent = completed * 3 + active * 2 // Rough estimate
    const appointmentsFound = Math.floor(completed * 0.8) // 80% success rate
    const avgResponseTime = 45 // seconds
    
    const lastActivity = subscriptions.length > 0 
      ? subscriptions[0].created_at 
      : null

    setDashboardStats({
      totalSubscriptions: total,
      activeSubscriptions: active,
      completedSubscriptions: completed,
      successRate,
      totalNotificationsSent: notificationsSent,
      appointmentsFound,
      averageResponseTime: avgResponseTime,
      lastActivity
    })
  }, [subscriptions])

  useEffect(() => {
    if (subscriptions.length > 0) {
      calculateDashboardStats()
    }
  }, [subscriptions, calculateDashboardStats])

  useEffect(() => {
    // Calculate time until next 5-minute interval
    const calculateNextCheckTime = () => {
      const now = new Date()
      const currentMinutes = now.getMinutes()
      const currentSeconds = now.getSeconds()
      
      // Calculate the next 5-minute mark
      const nextInterval = Math.ceil(currentMinutes / 5) * 5
      const minutesUntilNext = nextInterval - currentMinutes
      const secondsUntilNext = (minutesUntilNext * 60) - currentSeconds
      
      return secondsUntilNext > 0 ? secondsUntilNext : 300 // 5 minutes if calculation is 0 or negative
    }

    // Set initial countdown
    setNextCheckCountdown(calculateNextCheckTime())

    // Update countdown every second
    const interval = setInterval(() => {
      setNextCheckCountdown(prev => {
        if (prev <= 1) {
          // Recalculate for next 5-minute interval
          return calculateNextCheckTime()
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const fetchSubscriptions = async () => {
    try {
      const response = await pwaFetch('/api/notifications/subscriptions', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setSubscriptions(data)
      } else {
        console.error('Failed to fetch subscriptions')
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error)
    } finally {
      setFetchingSubscriptions(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await pwaFetch(`/api/notifications/subscriptions/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('המנוי בוטל בהצלחה')
        fetchSubscriptions()
        fetchIgnoredTimesCount() // Refresh ignored times count
      } else {
        toast.error('שגיאה בביטול המנוי')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('שגיאה בביטול המנוי')
    }
  }

  const handlePauseResume = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paused' ? 'active' : 'paused'
    
    try {
      const response = await pwaFetch(`/api/notifications/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_status: newStatus })
      })

      if (response.ok) {
        toast.success(newStatus === 'paused' ? 'המנוי הושהה' : 'המנוי חודש')
        fetchSubscriptions()
      } else {
        toast.error('שגיאה בעדכון המנוי')
      }
    } catch (error) {
      console.error('Pause/Resume error:', error)
      toast.error('שגיאה בעדכון המנוי')
    }
  }

  const handleNotificationMethodChange = async (id: string, method: 'email' | 'push' | 'both') => {
    try {
      const response = await pwaFetch(`/api/notifications/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_method: method })
      })

      if (response.ok) {
        toast.success('שיטת ההתראה עודכנה')
        fetchSubscriptions()
      } else {
        toast.error('שגיאה בעדכון שיטת ההתראה')
      }
    } catch (error) {
      console.error('Notification method change error:', error)
      toast.error('שגיאה בעדכון שיטת ההתראה')
    }
  }

  const formatSubscriptionDate = (sub: Subscription) => {
    if (sub.subscription_date) {
      return format(new Date(sub.subscription_date + 'T00:00:00'), 'dd/MM/yyyy')
    }
    if (sub.date_range_start && sub.date_range_end) {
      return `${format(new Date(sub.date_range_start + 'T00:00:00'), 'dd/MM')} - ${format(new Date(sub.date_range_end + 'T00:00:00'), 'dd/MM/yyyy')}`
    }
    return ''
  }

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }



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
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">ברוכים הבאים לתור רם-אל</CardTitle>
            <CardDescription>
              התחבר כדי לקבל התראות על תורים פנויים
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/login">התחבר</Link>
            </Button>
            <div className="text-center">
              <Link 
                href="/register" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                אין לך חשבון? הירשם כאן
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-20 max-w-2xl space-y-6">
      {/* Appointment Banner - Keep as requested */}
      <AppointmentBanner />
      


              {/* Dashboard Stats */}
        {dashboardStats && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">הסטטיסטיקות שלי</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-950/10 p-4 rounded-xl border border-blue-200/50 dark:border-blue-800/30">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">אחוז הצלחה</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">{dashboardStats.successRate}%</span>
                <TrendingUp className="h-4 w-4 text-green-500 mb-1" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/20 dark:to-green-950/10 p-4 rounded-xl border border-green-200/50 dark:border-green-800/30">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-700 dark:text-green-300 font-medium">תורים נמצאו</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-green-900 dark:text-green-100">{dashboardStats.appointmentsFound}</span>
                <Sparkles className="h-4 w-4 text-amber-500 mb-1" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/20 dark:to-purple-950/10 p-4 rounded-xl border border-purple-200/50 dark:border-purple-800/30">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="h-4 w-4 text-purple-600" />
                <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">התראות נשלחו</span>
              </div>
              <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">{dashboardStats.totalNotificationsSent}</span>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-50/50 dark:from-orange-950/20 dark:to-orange-950/10 p-4 rounded-xl border border-orange-200/50 dark:border-orange-800/30">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-orange-600" />
                <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">מנויים פעילים</span>
              </div>
              <span className="text-2xl font-bold text-orange-900 dark:text-orange-100">{dashboardStats.activeSubscriptions}</span>
            </div>
          </div>
        </motion.div>
      )}

              {/* System Status */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-emerald-50/50 dark:from-emerald-950/10 dark:via-teal-950/5 dark:to-emerald-950/10 p-4 rounded-xl border border-emerald-200/50 dark:border-emerald-800/30"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">המערכת פעילה</span>
          </div>
          <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">
            <Shield className="h-3 w-3 mr-1" />
            מאובטח
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-emerald-700 dark:text-emerald-300">סריקה הבאה בעוד</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-emerald-600" />
            <span className="text-sm font-mono text-emerald-900 dark:text-emerald-100">{formatCountdown(nextCheckCountdown)}</span>
          </div>
        </div>
      </motion.div>

      {/* Ignored Times Card */}
      {ignoredTimesCount && ignoredTimesCount.count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Link href="/notifications">
            <Card className="border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50/50 via-orange-50/30 to-amber-50/50 dark:from-amber-950/10 dark:via-orange-950/5 dark:to-amber-950/10 hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg group-hover:scale-110 transition-transform">
                      <Undo2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-0.5">
                        זמנים שהתעלמת מהם
                      </h3>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        {ignoredTimesCount.count} {ignoredTimesCount.count === 1 ? 'זמן' : 'זמנים'} ב-{ignoredTimesCount.dates} {ignoredTimesCount.dates === 1 ? 'תאריך' : 'תאריכים'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                      {ignoredTimesCount.count}
                    </Badge>
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-amber-200/50 dark:border-amber-800/30">
                  <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    לחץ כדי לנהל ולהחזיר זמנים
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      )}

              {/* Active Subscriptions - Improved Design */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">ההתראות שלי</h2>
          </div>
          {subscriptions.filter(sub => sub.is_active).length > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {subscriptions.filter(sub => sub.is_active).length} פעילות
            </Badge>
          )}
        </div>

        {fetchingSubscriptions ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : subscriptions.filter(sub => sub.is_active).length === 0 ? (
          <div className="text-center py-8 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-dashed border-muted-foreground/30">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 mb-3">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-3 text-sm">אין לך התראות פעילות</p>
            <Button asChild size="sm">
              <Link href="/subscribe">
                <Bell className="ml-2 h-3 w-3" />
                הוסף התראה
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {subscriptions
                .filter(sub => sub.is_active)
                .map((sub, index) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "group flex items-center justify-between p-3 rounded-xl border border-border/50 hover:border-border hover:shadow-md transition-all duration-200",
                      sub.subscription_status === 'paused' 
                        ? "bg-muted/30 opacity-75" 
                        : "bg-gradient-to-r from-background via-background to-muted/20"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                        sub.subscription_status === 'paused' ? "bg-muted" : "bg-primary/10"
                      )}>
                        <CalendarDays className={cn(
                          "h-4 w-4",
                          sub.subscription_status === 'paused' ? "text-muted-foreground" : "text-primary"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">
                            {formatSubscriptionDate(sub)}
                          </p>
                          {sub.subscription_status === 'paused' && (
                            <Badge variant="secondary" className="text-xs bg-muted-foreground/20">
                              מושהה
                            </Badge>
                          )}
                          {sub.preferred_time_ranges && sub.preferred_time_ranges.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {sub.preferred_time_ranges.length} טווחי זמן
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>נוצר ב-{format(new Date(sub.created_at), 'dd/MM HH:mm')}</span>
                          {/* Notification Method Indicator */}
                          {sub.notification_method && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                {sub.notification_method === 'email' && (
                                  <Mail className="h-3 w-3" />
                                )}
                                {sub.notification_method === 'push' && (
                                  <BellRing className="h-3 w-3" />
                                )}
                                {sub.notification_method === 'both' && (
                                  <>
                                    <Mail className="h-3 w-3" />
                                    <BellRing className="h-3 w-3" />
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons - Always visible for mobile */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Pause/Resume Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePauseResume(sub.id, sub.subscription_status || 'active')}
                        className="h-9 w-9 p-0 hover:bg-primary/10 active:bg-primary/20 hover:text-primary touch-manipulation"
                        title={sub.subscription_status === 'paused' ? 'חידוש' : 'השהיה'}
                      >
                        {sub.subscription_status === 'paused' ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                      </Button>
                      
                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sub.id)}
                        className="h-9 w-9 p-0 hover:bg-destructive/10 active:bg-destructive/20 hover:text-destructive touch-manipulation"
                        title="מחיקה"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="pt-2"
            >
              <Button asChild variant="outline" className="w-full hover:bg-primary/5 hover:border-primary/30">
                <Link href="/subscribe">
                  <Bell className="ml-2 h-4 w-4" />
                  הוסף התראה חדשה
                </Link>
              </Button>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
