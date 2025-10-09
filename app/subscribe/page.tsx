"use client"

import { useState, useEffect } from 'react'
import { Bell, Calendar, CalendarDays, Loader2, Trash2, CheckCircle, Sparkles, Edit, Mail, Smartphone, CheckCircle2, BellRing } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { cn, pwaFetch } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { motion, AnimatePresence } from 'framer-motion'
import { usePushNotifications } from '@/hooks/use-push-notifications'

interface Subscription {
  id: string
  subscription_date: string | null
  date_range_start: string | null
  date_range_end: string | null
  is_active: boolean
  notification_method: 'email' | 'push' | 'both'
  created_at: string
  completed_at: string | null
}

type NotificationMethod = 'email' | 'push' | 'both'

function SubscribePage() {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single')
  const [notificationMethod, setNotificationMethod] = useState<NotificationMethod>('email')
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingSubscriptions, setFetchingSubscriptions] = useState(true)
  const [subscriptionProgress, setSubscriptionProgress] = useState(0)
  
  // Edit modal state
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [editDateMode, setEditDateMode] = useState<'single' | 'range'>('single')
  const [editSelectedDate, setEditSelectedDate] = useState<Date>()
  const [editDateRange, setEditDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })
  const [editLoading, setEditLoading] = useState(false)

  // Push notifications hook
  const { 
    isSupported: pushSupported, 
    permission: pushPermission, 
    isSubscribed: isPushSubscribed, 
    isLoading: pushLoading, 
    subscribe: subscribeToPush,
    showIOSInstallPrompt
  } = usePushNotifications()

  // Check if iOS and PWA
  const isIOS = typeof window !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const isPWA = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      fetchSubscriptions()
    }
  }, [mounted])

  useEffect(() => {
    if (editingSubscription) {
      if (editingSubscription.subscription_date) {
        setEditDateMode('single')
        setEditSelectedDate(new Date(editingSubscription.subscription_date + 'T00:00:00'))
        setEditDateRange({ from: undefined, to: undefined })
      } else if (editingSubscription.date_range_start && editingSubscription.date_range_end) {
        setEditDateMode('range')
        setEditDateRange({
          from: new Date(editingSubscription.date_range_start + 'T00:00:00'),
          to: new Date(editingSubscription.date_range_end + 'T00:00:00')
        })
        setEditSelectedDate(undefined)
      }
    }
  }, [editingSubscription])

  const fetchSubscriptions = async () => {
    try {
      const response = await pwaFetch('/api/notifications/subscriptions', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setSubscriptions(data)
        
        // Set notification method from first active subscription
        const activeSubscription = data.find((s: Subscription) => s.is_active)
        if (activeSubscription?.notification_method) {
          setNotificationMethod(activeSubscription.notification_method)
        }
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error)
    } finally {
      setFetchingSubscriptions(false)
    }
  }

  const isDateDisabled = (date: Date) => {
    const israeliDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }))
    const day = israeliDate.getDay()
    
    const now = new Date()
    const israeliToday = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }))
    israeliToday.setHours(0, 0, 0, 0)
    
    const maxDate = new Date(israeliToday)
    maxDate.setDate(maxDate.getDate() + 30)
    
    const israeliInputDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }))
    israeliInputDate.setHours(0, 0, 0, 0)
    
    return israeliInputDate < israeliToday || israeliInputDate > maxDate || day === 1 || day === 6
  }

  const handleNotificationMethodChange = async (method: NotificationMethod) => {
    // If switching to push or both, need to subscribe first
    if ((method === 'push' || method === 'both') && !isPushSubscribed) {
      if (isIOS && !isPWA) {
        showIOSInstallPrompt()
        return
      }
      
      try {
        await subscribeToPush()
        setNotificationMethod(method)
      } catch (error) {
        console.error('Failed to subscribe to push:', error)
        return
      }
    } else {
      setNotificationMethod(method)
    }
  }

  const handleSubscribe = async () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
    
    setLoading(true)
    setSubscriptionProgress(0)
    
    try {
      const progressInterval = setInterval(() => {
        setSubscriptionProgress(prev => Math.min(prev + 15, 80))
      }, 100)

      const payload = dateMode === 'single' 
        ? { 
            subscription_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
            notification_method: notificationMethod
          }
        : { 
            date_range_start: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
            date_range_end: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : null,
            notification_method: notificationMethod
          }

      const response = await pwaFetch('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      clearInterval(progressInterval)
      setSubscriptionProgress(100)

      if (response.ok) {
        toast.success('נרשמת בהצלחה להתראות! 🎉', {
          icon: <Sparkles className="h-4 w-4" />,
          duration: 3000
        })
        setSelectedDate(undefined)
        setDateRange({ from: undefined, to: undefined })
        fetchSubscriptions()
      } else {
        const error = await response.json()
        toast.error(error.message || 'שגיאה בהרשמה')
      }
    } catch (error) {
      console.error('Subscribe error:', error)
      toast.error('שגיאה בהרשמה להתראות')
    } finally {
      setTimeout(() => {
        setLoading(false)
        setSubscriptionProgress(0)
      }, 500)
    }
  }

  const handleDateRangeSelect = (range: any) => {
    if (range?.from || range?.to) {
      setDateRange({
        from: range.from || undefined,
        to: range.to || undefined
      })
    } else {
      setDateRange({ from: undefined, to: undefined })
    }
  }

  const handleEditDateRangeSelect = (range: any) => {
    if (range?.from || range?.to) {
      setEditDateRange({
        from: range.from || undefined,
        to: range.to || undefined
      })
    } else {
      setEditDateRange({ from: undefined, to: undefined })
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
      } else {
        toast.error('שגיאה בביטול המנוי')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('שגיאה בביטול המנוי')
    }
  }

  const handleUpdate = async () => {
    if (!editingSubscription) return
    
    setEditLoading(true)
    
    try {
      const payload = editDateMode === 'single' 
        ? { 
            subscription_date: editSelectedDate ? format(editSelectedDate, 'yyyy-MM-dd') : null,
            date_range_start: null,
            date_range_end: null
          }
        : { 
            subscription_date: null,
            date_range_start: editDateRange.from ? format(editDateRange.from, 'yyyy-MM-dd') : null,
            date_range_end: editDateRange.to ? format(editDateRange.to, 'yyyy-MM-dd') : null
          }

      const response = await pwaFetch(`/api/notifications/subscriptions/${editingSubscription.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast.success('המנוי עודכן בהצלחה')
        setEditingSubscription(null)
        fetchSubscriptions()
      } else {
        const error = await response.json()
        toast.error(error.message || 'שגיאה בעדכון המנוי')
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error('שגיאה בעדכון המנוי')
    } finally {
      setEditLoading(false)
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

  const getNotificationMethodIcon = (method: NotificationMethod) => {
    switch (method) {
      case 'email': return Mail
      case 'push': return Smartphone
      case 'both': return Bell
      default: return Bell
    }
  }

  const getNotificationMethodLabel = (method: NotificationMethod) => {
    switch (method) {
      case 'email': return 'מייל'
      case 'push': return 'Push'
      case 'both': return 'מייל + Push'
      default: return 'לא ידוע'
    }
  }

  const activeSubscriptions = subscriptions.filter(s => s.is_active)
  const completedSubscriptions = subscriptions.filter(s => !s.is_active)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 pb-24">
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 pt-2"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <BellRing className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            התראות חכמות
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            קבל עדכונים מיידיים כשיש תורים פנויים בתאריכים שחשובים לך
          </p>
        </motion.div>

        {/* Main Subscription Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        >
          {/* Notification Method Selection */}
          <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold">איך תרצה לקבל התראות?</h2>
            </div>
            
            <div className="grid gap-3">
              {[
                { 
                  value: 'email' as NotificationMethod, 
                  icon: Mail, 
                  title: 'מייל בלבד', 
                  description: 'התראה במייל',
                  gradient: 'from-blue-500 to-blue-600',
                  available: true
                },
                { 
                  value: 'push' as NotificationMethod, 
                  icon: Smartphone, 
                  title: 'התראות Push בלבד', 
                  description: 'התראה במכשיר',
                  gradient: 'from-purple-500 to-purple-600',
                  available: pushSupported && (isPWA || !isIOS)
                },
                { 
                  value: 'both' as NotificationMethod, 
                  icon: Bell, 
                  title: 'מייל + Push', 
                  description: 'שני הערוצים',
                  gradient: 'from-green-500 to-green-600',
                  available: pushSupported && (isPWA || !isIOS)
                }
              ].map((method) => (
                <motion.button
                  key={method.value}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => method.available && handleNotificationMethodChange(method.value)}
                  disabled={!method.available || pushLoading}
                  className={cn(
                    "relative p-4 rounded-2xl transition-all text-right",
                    "border-2",
                    notificationMethod === method.value
                      ? "border-transparent shadow-lg"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800",
                    !method.available && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {notificationMethod === method.value && (
                    <motion.div
                      layoutId="selectedMethod"
                      className={cn(
                        "absolute inset-0 rounded-2xl bg-gradient-to-r",
                        method.gradient
                      )}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  
                  <div className="relative flex items-center gap-3">
                    <div className={cn(
                      "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
                      notificationMethod === method.value
                        ? "bg-white/20 backdrop-blur-sm"
                        : "bg-gray-100 dark:bg-gray-700"
                    )}>
                      <method.icon className={cn(
                        "h-6 w-6",
                        notificationMethod === method.value
                          ? "text-white"
                          : "text-gray-600 dark:text-gray-400"
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={cn(
                          "font-semibold",
                          notificationMethod === method.value
                            ? "text-white"
                            : "text-gray-900 dark:text-gray-100"
                        )}>
                          {method.title}
                        </h3>
                        {notificationMethod === method.value && (
                          <CheckCircle2 className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <p className={cn(
                        "text-sm",
                        notificationMethod === method.value
                          ? "text-white/80"
                          : "text-gray-500 dark:text-gray-400"
                      )}>
                        {method.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* iOS PWA Notice */}
            {isIOS && !isPWA && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl"
              >
                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                  💡 <strong>התקן את האפליקציה</strong> כדי לקבל התראות Push (Share ⬆️ → Add to Home Screen)
                </p>
              </motion.div>
            )}
          </div>

          {/* Date Selection */}
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">בחר תאריכים</h2>
              
              {/* Date Mode Tabs */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { value: 'single' as const, label: 'תאריך בודד', icon: Calendar },
                  { value: 'range' as const, label: 'טווח תאריכים', icon: CalendarDays }
                ].map((mode) => (
                  <motion.button
                    key={mode.value}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setDateMode(mode.value)
                      if (mode.value === 'single') {
                        setDateRange({ from: undefined, to: undefined })
                      } else {
                        setSelectedDate(undefined)
                      }
                    }}
                    className={cn(
                      "relative p-3 rounded-xl transition-all font-medium text-sm",
                      "border-2 flex items-center justify-center gap-2",
                      dateMode === mode.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                  >
                    <mode.icon className="h-4 w-4" />
                    {mode.label}
                  </motion.button>
                ))}
              </div>

              {/* Date Picker */}
              <AnimatePresence mode="wait">
                {dateMode === 'single' ? (
                  <motion.div
                    key="single"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-end text-right h-14 rounded-xl border-2 text-base",
                            selectedDate && "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                          )}
                        >
                          <Calendar className="mr-2 h-5 w-5" />
                          {mounted && selectedDate ? (
                            <span className="font-semibold">
                              {format(selectedDate, "EEEE, dd בMMMM yyyy", { locale: he })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">בחר תאריך</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={isDateDisabled}
                          locale={he}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </motion.div>
                ) : (
                  <motion.div
                    key="range"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-end text-right h-14 rounded-xl border-2 text-base",
                            dateRange.from && "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                          )}
                        >
                          <CalendarDays className="mr-2 h-5 w-5" />
                          {mounted && dateRange.from ? (
                            dateRange.to ? (
                              <span className="font-semibold">
                                {format(dateRange.from, "dd/MM")} - {format(dateRange.to, "dd/MM/yyyy")}
                              </span>
                            ) : (
                              <span className="font-semibold">
                                {format(dateRange.from, "dd/MM/yyyy")}
                              </span>
                            )
                          ) : (
                            <span className="text-muted-foreground">בחר טווח תאריכים</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="range"
                          selected={dateRange}
                          onSelect={handleDateRangeSelect}
                          disabled={isDateDisabled}
                          locale={he}
                          initialFocus
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit Button */}
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleSubscribe}
                disabled={loading || (dateMode === 'single' ? !selectedDate : !dateRange.from || !dateRange.to)}
                className={cn(
                  "w-full h-14 text-lg font-semibold rounded-xl",
                  "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                  "shadow-lg hover:shadow-xl transition-all"
                )}
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>נרשם להתראות...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5" />
                    <span>צור התראה חדשה</span>
                  </div>
                )}
              </Button>
            </motion.div>
            
            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Progress value={subscriptionProgress} className="h-1" />
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Active Subscriptions */}
        {!fetchingSubscriptions && activeSubscriptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                מנויים פעילים
              </h3>
              <Badge className="bg-green-600 text-white">
                {activeSubscriptions.length}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <AnimatePresence>
                {activeSubscriptions.map((sub) => {
                  const MethodIcon = getNotificationMethodIcon(sub.notification_method)
                  return (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-md border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {formatSubscriptionDate(sub)}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <MethodIcon className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {getNotificationMethodLabel(sub.notification_method)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingSubscription(sub)}
                            className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(sub.id)}
                            className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Completed Subscriptions */}
        {!fetchingSubscriptions && completedSubscriptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-muted-foreground">
                הושלמו
              </h3>
              <Badge variant="secondary">
                {completedSubscriptions.length}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {completedSubscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-200 dark:border-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <CheckCircle className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-muted-foreground">
                        {formatSubscriptionDate(sub)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(sub.id)}
                      className="h-7 w-7"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!fetchingSubscriptions && subscriptions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 space-y-4"
          >
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
              <BellRing className="h-10 w-10 text-gray-400" />
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                עדיין אין לך התראות
              </p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                צור את ההתראה הראשונה שלך ותקבל עדכונים מיידיים על תורים פנויים
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingSubscription} onOpenChange={(open) => !open && setEditingSubscription(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Edit className="h-5 w-5" />
              עריכת התראה
            </DialogTitle>
            <DialogDescription>
              שנה את התאריכים להתראה זו
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Edit Date Mode Tabs */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'single' as const, label: 'תאריך בודד', icon: Calendar },
                { value: 'range' as const, label: 'טווח תאריכים', icon: CalendarDays }
              ].map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => {
                    setEditDateMode(mode.value)
                    if (mode.value === 'single') {
                      setEditDateRange({ from: undefined, to: undefined })
                    } else {
                      setEditSelectedDate(undefined)
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-xl transition-all font-medium text-sm",
                    "border-2 flex items-center justify-center gap-2",
                    editDateMode === mode.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-600"
                      : "border-gray-200 dark:border-gray-700"
                  )}
                >
                  <mode.icon className="h-4 w-4" />
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Edit Date Picker */}
            <AnimatePresence mode="wait">
              {editDateMode === 'single' ? (
                <motion.div
                  key="edit-single"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-right rounded-xl h-12"
                      >
                        <Calendar className="ml-2 h-4 w-4" />
                        {mounted && editSelectedDate ? (
                          format(editSelectedDate, "dd/MM/yyyy")
                        ) : (
                          "בחר תאריך"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editSelectedDate}
                        onSelect={setEditSelectedDate}
                        disabled={isDateDisabled}
                        locale={he}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </motion.div>
              ) : (
                <motion.div
                  key="edit-range"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-right rounded-xl h-12"
                      >
                        <CalendarDays className="ml-2 h-4 w-4" />
                        {mounted && editDateRange.from ? (
                          editDateRange.to ? (
                            <>
                              {format(editDateRange.from, "dd/MM/yyyy")} -{" "}
                              {format(editDateRange.to, "dd/MM/yyyy")}
                            </>
                          ) : (
                            format(editDateRange.from, "dd/MM/yyyy")
                          )
                        ) : (
                          "בחר טווח תאריכים"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="range"
                        selected={editDateRange}
                        onSelect={handleEditDateRangeSelect}
                        disabled={isDateDisabled}
                        locale={he}
                        initialFocus
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleUpdate}
                disabled={editLoading || (editDateMode === 'single' ? !editSelectedDate : !editDateRange.from || !editDateRange.to)}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {editLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    מעדכן...
                  </>
                ) : (
                  <>
                    <CheckCircle className="ml-2 h-4 w-4" />
                    עדכן
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingSubscription(null)}
                disabled={editLoading}
                className="h-11 rounded-xl"
              >
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SubscribePage
