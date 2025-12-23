"use client"

import { useEffect, useState, useCallback } from 'react'
import { useHeader } from '@/components/header-context'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, Loader2, Trash2, CalendarDays, Pause, Play, Mail, BellRing, Search, History, Plus, Zap, CalendarClock, CheckCircle2, XCircle } from 'lucide-react'
import { AppointmentBanner } from '@/components/appointment-banner'
import { QuickActionCard, QuickActionGrid } from '@/components/quick-action-card'
import { QuickSubscribe } from '@/components/quick-subscribe'
import { IgnoredTimesCard } from '@/components/ignored-times-card'
import { NotificationPreferenceBanner } from '@/components/notification-preference-banner'
import { useHaptics } from '@/hooks/use-haptics'
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { useApi } from '@/hooks/use-api'
import { PullToRefreshIndicator } from '@/components/pull-to-refresh'
import Link from 'next/link'
import { format, isPast } from 'date-fns'
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

interface HomeStats {
  availableAppointments: number
  nearestDate: string | null
  activeSubscriptions: number
  totalNotificationsSent: number
  ignoredTimesCount: number
  lastCheckTime: string | null
  todayChecks: number
  nextCheckIn: number
  unreadNotifications?: number
}

export default function HomePage() {
  const updateHeader = useHeader()
  const { user, isLoading } = useAuth()
  const haptics = useHaptics()
  const [nextCheckCountdown, setNextCheckCountdown] = useState(300)

  // Use optimized API hooks with stale-while-revalidate caching
  const { 
    data: homeStats, 
    refetch: refetchStats
  } = useApi<HomeStats>(
    user ? '/api/home/stats' : null,
    { 
      staleTime: 10000,   // 10 seconds - show cached data for 10s
      cacheTime: 60000,   // 60 seconds - keep in cache for 1 minute
      refetchOnFocus: true,
      refetchOnReconnect: true
    }
  )

  const { 
    data: subscriptions, 
    isLoading: fetchingSubscriptions,
    refetch: refetchSubscriptions
  } = useApi<Subscription[]>(
    user ? '/api/notifications/subscriptions' : null,
    { 
      staleTime: 15000,   // 15 seconds
      cacheTime: 120000,  // 2 minutes
      refetchOnFocus: true
    }
  )

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    toast.info('מרענן נתונים...')
    await Promise.all([
      refetchStats(),
      refetchSubscriptions()
    ])
    toast.success('הנתונים עודכנו')
  }, [refetchStats, refetchSubscriptions])

  // Pull-to-refresh hook
  const pullToRefresh = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    disabled: isLoading
  })

  useEffect(() => {
    updateHeader({
      title: 'תור רם-אל',
      showMenu: true
    })
  }, [updateHeader])

  // Initialize countdown from API response
  useEffect(() => {
    if (homeStats?.nextCheckIn) {
      setNextCheckCountdown(homeStats.nextCheckIn)
    }
  }, [homeStats?.nextCheckIn])

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setNextCheckCountdown(prev => {
        if (prev <= 1) {
          refetchStats()
          return 300
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [refetchStats])

  const handleDelete = async (id: string) => {
    haptics.medium()
    try {
      const response = await pwaFetch(`/api/notifications/subscriptions/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        haptics.success()
        toast.success('המנוי בוטל בהצלחה')
        // Refetch both - optimized with caching
        await Promise.all([refetchSubscriptions(), refetchStats()])
      } else {
        haptics.error()
        toast.error('שגיאה בביטול המנוי')
      }
    } catch {
      haptics.error()
      toast.error('שגיאה בביטול המנוי')
    }
  }

  const handlePauseResume = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paused' ? 'active' : 'paused'
    haptics.light()
    
    try {
      const response = await pwaFetch(`/api/notifications/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_status: newStatus })
      })

      if (response.ok) {
        haptics.success()
        toast.success(newStatus === 'paused' ? 'המנוי הושהה' : 'המנוי חודש')
        await refetchSubscriptions()
      } else {
        haptics.error()
        toast.error('שגיאה בעדכון המנוי')
      }
    } catch {
      haptics.error()
      toast.error('שגיאה בעדכון המנוי')
    }
  }

  const formatSubscriptionDate = (sub: Subscription) => {
    if (sub.subscription_date) {
      return format(new Date(sub.subscription_date + 'T00:00:00'), 'dd/MM')
    }
    if (sub.date_range_start && sub.date_range_end) {
      return `${format(new Date(sub.date_range_start + 'T00:00:00'), 'dd/MM')} - ${format(new Date(sub.date_range_end + 'T00:00:00'), 'dd/MM')}`
    }
    return ''
  }

  const isSubscriptionExpired = (sub: Subscription) => {
    const endDate = sub.subscription_date || sub.date_range_end
    if (!endDate) return false
    return isPast(new Date(endDate + 'T23:59:59'))
  }

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatLastCheck = (timeStr: string | null) => {
    if (!timeStr) return 'לא זמין'
    const date = new Date(timeStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'הרגע'
    if (diffMins < 60) return `לפני ${diffMins} דק׳`
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }

  const activeSubscriptions = (subscriptions ?? []).filter(sub => sub.is_active)

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
        <Card variant="glass-elevated" className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">ברוכים הבאים לתור רם-אל</CardTitle>
            <CardDescription>
              התחבר כדי לקבל התראות על תורים פנויים
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full glass-button" onClick={() => haptics.light()}>
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
    <>
      {/* Pull to Refresh Indicator */}
      <PullToRefreshIndicator
        pullDistance={pullToRefresh.pullDistance}
        pullProgress={pullToRefresh.pullProgress}
        isRefreshing={pullToRefresh.isRefreshing}
        isPulling={pullToRefresh.isPulling}
        threshold={pullToRefresh.threshold}
      />
      
      <div className="container mx-auto px-4 pt-4 pb-4 max-w-2xl space-y-4 page-content-bottom-spacing">
        {/* Hero: Appointment Banner */}
        <AppointmentBanner />
        
        {/* Notification Preference Banner */}
        <NotificationPreferenceBanner />
      
      {/* Quick Actions Grid */}
      <QuickActionGrid>
        <QuickActionCard
          icon={Search}
          title="חיפוש תורים"
          subtitle={homeStats ? `${homeStats.availableAppointments} פנויים` : 'טוען...'}
          href="/search"
          variant="primary"
          delay={0.1}
        />
        <QuickActionCard
          icon={Bell}
          title="התראה חדשה"
          subtitle={`${activeSubscriptions.length} פעילות`}
          href="/subscribe"
          variant="purple"
          delay={0.15}
        />
        <QuickActionCard
          icon={CalendarClock}
          title="סריקה הבאה"
          subtitle={formatCountdown(nextCheckCountdown)}
          variant="success"
          live={true}
          delay={0.2}
        />
        <QuickActionCard
          icon={History}
          title="היסטוריה"
          subtitle={homeStats ? `${homeStats.totalNotificationsSent} נשלחו` : 'טוען...'}
          href="/notifications"
          variant="indigo"
          delay={0.25}
        />
      </QuickActionGrid>

      {/* Quick Subscribe - Show when no active subscriptions */}
      {activeSubscriptions.length === 0 && (
        <QuickSubscribe 
          onSubscribed={() => {
            // Optimistic refetch with caching
            Promise.all([refetchSubscriptions(), refetchStats()])
          }}
        />
      )}

      {/* Active Subscriptions - Enhanced Design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-2xl p-4 space-y-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold">התראות פעילות</h2>
          </div>
          <Link 
            href="/subscribe" 
            className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            onClick={() => haptics.light()}
          >
            <Plus className="h-3.5 w-3.5" />
            חדש
          </Link>
        </div>

        {/* Subscriptions List */}
        {fetchingSubscriptions ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : activeSubscriptions.length === 0 ? (
          <Link href="/subscribe" onClick={() => haptics.light()}>
            <div className={cn(
              "p-6 rounded-xl text-center",
              "border-2 border-dashed border-muted-foreground/20",
              "hover:border-primary/30 hover:bg-primary/5 transition-all"
            )}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 mb-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">אין התראות פעילות</p>
              <p className="text-xs text-muted-foreground/70 mt-1">לחץ להוספת התראה ראשונה</p>
            </div>
          </Link>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {activeSubscriptions.map((sub, index) => {
                const isExpired = isSubscriptionExpired(sub)
                const isPaused = sub.subscription_status === 'paused'
                
                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "rounded-xl p-3 flex items-center gap-3",
                      "border transition-all duration-200",
                      isExpired 
                        ? "bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30"
                        : isPaused
                          ? "bg-orange-50/50 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-800/30"
                          : "bg-white/50 dark:bg-white/5 border-white/30 dark:border-white/10"
                    )}
                  >
                    {/* Status Icon */}
                    <div className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                      isExpired 
                        ? "bg-red-100 dark:bg-red-900/50"
                        : isPaused
                          ? "bg-orange-100 dark:bg-orange-900/50"
                          : "bg-primary/10"
                    )}>
                      {isExpired ? (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      ) : isPaused ? (
                        <Pause className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      ) : (
                        <CalendarDays className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "font-semibold text-sm",
                          isExpired && "text-red-900 dark:text-red-100"
                        )}>
                          {formatSubscriptionDate(sub)}
                        </p>
                        {isExpired && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                            פג תוקף
                          </Badge>
                        )}
                        {isPaused && !isExpired && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                            מושהה
                          </Badge>
                        )}
                      </div>
                      
                      {/* Notification method icons */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          {(sub.notification_method === 'email' || sub.notification_method === 'both') && (
                            <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                            </div>
                          )}
                          {(sub.notification_method === 'push' || sub.notification_method === 'both') && (
                            <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <BellRing className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        {!isExpired && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            פעיל
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="flex items-center gap-1">
                      {!isExpired && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePauseResume(sub.id, sub.subscription_status || 'active')}
                          className={cn(
                            "h-8 w-8 p-0 touch-manipulation",
                            isPaused 
                              ? "hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600"
                              : "hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-600"
                          )}
                        >
                          {isPaused ? (
                            <Play className="h-4 w-4" />
                          ) : (
                            <Pause className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sub.id)}
                        className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 touch-manipulation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Ignored Times Card - Shows expandable list with clear options */}
      <IgnoredTimesCard />

      {/* Minimal Status Footer */}
      {homeStats && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-3 text-xs text-muted-foreground py-1"
        >
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {formatLastCheck(homeStats.lastCheckTime)}
          </span>
          <span className="text-muted-foreground/40">•</span>
          <span>{homeStats.todayChecks} בדיקות היום</span>
        </motion.div>
      )}
    </div>
    </>
  )
}
