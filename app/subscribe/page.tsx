"use client"

import { useState, useEffect } from 'react'
import { Bell, Calendar, CalendarDays, Loader2, Trash2, CheckCircle, Edit, Mail, Smartphone, CheckCircle2, X, AlertCircle, Clock, Sparkles, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { cn, pwaFetch } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { motion, AnimatePresence } from 'framer-motion'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { NotificationSettingsDialog } from '@/components/notification-settings-dialog'

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
      fetchNotificationPreference()
    }
  }, [mounted])

  // Listen for notification preference changes from settings dialog
  useEffect(() => {
    const handlePreferenceChange = (event: CustomEvent) => {
      if (event.detail?.notificationMethod) {
        setNotificationMethod(event.detail.notificationMethod)
      }
    }

    window.addEventListener('notificationPreferenceChanged', handlePreferenceChange as EventListener)

    return () => {
      window.removeEventListener('notificationPreferenceChanged', handlePreferenceChange as EventListener)
    }
  }, [])
  
  const fetchNotificationPreference = async () => {
    try {
      const response = await pwaFetch('/api/notifications/preferences', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.notification_method) {
          setNotificationMethod(data.notification_method)
        }
      }
    } catch (error) {
      console.error('Failed to fetch notification preference:', error)
    }
  }

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

  const handleSubscribe = async () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
    
    setLoading(true)
    
    try {
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

      if (response.ok) {
        toast.success('נרשמת בהצלחה')
        setSelectedDate(undefined)
        setDateRange({ from: undefined, to: undefined })
        fetchSubscriptions()
      } else {
        const error = await response.json()
        toast.error(error.message || 'שגיאה בהרשמה')
      }
    } catch (error) {
      console.error('Subscribe error:', error)
      toast.error('שגיאה בהרשמה')
    } finally {
        setLoading(false)
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
        toast.success('המנוי בוטל')
        fetchSubscriptions()
      } else {
        toast.error('שגיאה בביטול')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('שגיאה בביטול')
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
        toast.success('המנוי עודכן')
        setEditingSubscription(null)
        fetchSubscriptions()
      } else {
        const error = await response.json()
        toast.error(error.message || 'שגיאה בעדכון')
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error('שגיאה בעדכון')
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

  const getDaysInfo = (sub: Subscription) => {
    if (typeof window === 'undefined') return { text: '', color: '', bgColor: '', borderColor: '' }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (sub.subscription_date) {
      const targetDate = new Date(sub.subscription_date + 'T00:00:00')
      const diffTime = targetDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays < 0) return { 
        text: 'עבר', 
        color: 'text-red-700 dark:text-red-300',
        bgColor: 'bg-gradient-to-br from-red-50 to-red-50/50 dark:from-red-950/20 dark:to-red-950/10',
        borderColor: 'border-red-200/50 dark:border-red-800/30'
      }
      if (diffDays === 0) return { 
        text: 'היום', 
        color: 'text-green-700 dark:text-green-300',
        bgColor: 'bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/20 dark:to-green-950/10',
        borderColor: 'border-green-200/50 dark:border-green-800/30'
      }
      if (diffDays === 1) return { 
        text: 'מחר', 
        color: 'text-blue-700 dark:text-blue-300',
        bgColor: 'bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-950/10',
        borderColor: 'border-blue-200/50 dark:border-blue-800/30'
      }
      if (diffDays <= 7) return { 
        text: `בעוד ${diffDays} ימים`, 
        color: 'text-orange-700 dark:text-orange-300',
        bgColor: 'bg-gradient-to-br from-orange-50 to-orange-50/50 dark:from-orange-950/20 dark:to-orange-950/10',
        borderColor: 'border-orange-200/50 dark:border-orange-800/30'
      }
    return {
        text: `בעוד ${diffDays} ימים`, 
        color: 'text-purple-700 dark:text-purple-300',
        bgColor: 'bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/20 dark:to-purple-950/10',
        borderColor: 'border-purple-200/50 dark:border-purple-800/30'
      }
    }
    
    if (sub.date_range_start && sub.date_range_end) {
      const endDate = new Date(sub.date_range_end + 'T00:00:00')
      const diffTime = endDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays < 0) return { 
        text: 'הסתיים', 
        color: 'text-red-700 dark:text-red-300',
        bgColor: 'bg-gradient-to-br from-red-50 to-red-50/50 dark:from-red-950/20 dark:to-red-950/10',
        borderColor: 'border-red-200/50 dark:border-red-800/30'
      }
      if (diffDays === 0) return { 
        text: 'נגמר היום', 
        color: 'text-orange-700 dark:text-orange-300',
        bgColor: 'bg-gradient-to-br from-orange-50 to-orange-50/50 dark:from-orange-950/20 dark:to-orange-950/10',
        borderColor: 'border-orange-200/50 dark:border-orange-800/30'
      }
      if (diffDays <= 7) return { 
        text: `נגמר בעוד ${diffDays} ימים`, 
        color: 'text-orange-700 dark:text-orange-300',
        bgColor: 'bg-gradient-to-br from-orange-50 to-orange-50/50 dark:from-orange-950/20 dark:to-orange-950/10',
        borderColor: 'border-orange-200/50 dark:border-orange-800/30'
      }
      return { 
        text: `נגמר בעוד ${diffDays} ימים`, 
        color: 'text-purple-700 dark:text-purple-300',
        bgColor: 'bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/20 dark:to-purple-950/10',
        borderColor: 'border-purple-200/50 dark:border-purple-800/30'
      }
    }
    
    return { text: '', color: '', bgColor: '', borderColor: '' }
  }

  const hasDuplicateDates = (sub: Subscription, allSubs: Subscription[]) => {
    return allSubs.some(otherSub => {
      if (otherSub.id === sub.id || !otherSub.is_active) return false
      
      if (sub.subscription_date && otherSub.subscription_date) {
        return sub.subscription_date === otherSub.subscription_date
      }
      
      if (sub.date_range_start && sub.date_range_end && otherSub.date_range_start && otherSub.date_range_end) {
        return sub.date_range_start === otherSub.date_range_start && 
               sub.date_range_end === otherSub.date_range_end
      }
      
      return false
    })
  }

  const activeSubscriptions = subscriptions.filter(s => s.is_active)
  const completedSubscriptions = subscriptions.filter(s => !s.is_active)

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24">
      <div className="container max-w-lg mx-auto px-4 py-4 space-y-5">
        
        {/* Header - Modern with Stats */}
        <div className="space-y-3">
          <div className="text-center py-2 relative">
            {/* Settings Button - Top Right */}
            <div className="absolute top-2 left-2">
              <NotificationSettingsDialog />
            </div>
            
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 mb-2">
              <Bell className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
            <h1 className="text-xl font-bold text-black dark:text-white">
              התראות חכמות
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              עדכונים מיידיים על תורים פנויים
            </p>
          </div>

          {/* Quick Stats */}
          {!fetchingSubscriptions && subscriptions.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/20 dark:to-green-950/10 p-3 rounded-xl border border-green-200/50 dark:border-green-800/30">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  <span className="text-xs text-green-700 dark:text-green-300 font-medium">פעילים</span>
                  </div>
                <span className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {activeSubscriptions.length}
                </span>
                  </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-950/10 p-3 rounded-xl border border-blue-200/50 dark:border-blue-800/30">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">הושלמו</span>
                </div>
                <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {completedSubscriptions.length}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Main Card - Clean & Compact */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          
          {/* Date Selection - Compact */}
          <div className="p-3 space-y-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block">
              תאריכים
            </label>
            
            {/* Date Mode Toggle - Minimal */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'single' as const, label: 'תאריך בודד', icon: Calendar },
                { value: 'range' as const, label: 'טווח', icon: CalendarDays }
              ].map((mode) => {
                const isSelected = dateMode === mode.value
                const Icon = mode.icon
                return (
                  <button
                    key={mode.value}
                    onClick={() => {
                      setDateMode(mode.value)
                      if (mode.value === 'single') {
                        setDateRange({ from: undefined, to: undefined })
                      } else {
                        setSelectedDate(undefined)
                      }
                    }}
                    className={cn(
                      "p-2 rounded text-xs font-medium transition-all border flex items-center justify-center gap-1.5",
                      isSelected
                        ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {mode.label}
                  </button>
                )
              })}
              </div>

            {/* Date Picker - Clean */}
            <AnimatePresence mode="wait">
              {dateMode === 'single' ? (
                <motion.div
                  key="single"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-end text-right h-10 text-sm font-normal",
                          selectedDate && "border-black dark:border-white"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {mounted && selectedDate ? (
                          format(selectedDate, "dd/MM/yyyy")
                        ) : (
                          <span className="text-gray-400">בחר תאריך</span>
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-end text-right h-10 text-sm font-normal",
                          dateRange.from && "border-black dark:border-white"
                        )}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {mounted && dateRange.from ? (
                          dateRange.to ? (
                            `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM/yyyy")}`
                          ) : (
                            format(dateRange.from, "dd/MM/yyyy")
                          )
                        ) : (
                          <span className="text-gray-400">בחר טווח</span>
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

            {/* Submit - Clean Black Button */}
                <Button
                  onClick={handleSubscribe}
              disabled={loading || (dateMode === 'single' ? !selectedDate : !dateRange.from || !dateRange.to)}
              className="w-full h-10 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black text-sm font-medium"
                >
                  {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'צור התראה'
                  )}
                </Button>
            </div>
          </div>

        {/* Active Subscriptions - Compact List */}
        {!fetchingSubscriptions && activeSubscriptions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                פעילים
              </h3>
              <Badge variant="default" className="h-5 text-xs bg-green-600">
                {activeSubscriptions.length}
              </Badge>
            </div>
            
            <div className="space-y-3">
              <AnimatePresence>
                {activeSubscriptions.map((sub, index) => {
                  const MethodIcon = getNotificationMethodIcon(sub.notification_method)
                  const daysInfo = getDaysInfo(sub)
                  const isDuplicate = hasDuplicateDates(sub, subscriptions)
                  const method = sub.notification_method || 'email'
                  
                  return (
                    <motion.div
                      key={sub.id}
                      initial={mounted ? { opacity: 0, y: 10 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: mounted ? index * 0.05 : 0 }}
                    >
                      <div
                      className={cn(
                          "rounded-xl p-3 border transition-all hover:shadow-md",
                          daysInfo.bgColor || "bg-gradient-to-br from-gray-50 to-gray-50/50 dark:from-gray-950/20 dark:to-gray-950/10",
                          daysInfo.borderColor || "border-gray-200/50 dark:border-gray-800/30"
                        )}
                      >
                        {/* Duplicate Warning Banner */}
                        {isDuplicate && (
                          <div className="flex items-center gap-2 mb-2.5 px-2 py-1.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                              ⚠️ תאריכים כפולים זוהו
                            </span>
                        </div>
                        )}
                        
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Date Info */}
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                              <p className="text-sm font-semibold truncate">
                            {formatSubscriptionDate(sub)}
                          </p>
                            </div>
                            
                            {/* Status Row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Notification Method Badge */}
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "h-6 text-xs font-medium",
                                  method === 'email' && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
                                  method === 'push' && "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700",
                                  method === 'both' && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                                )}
                              >
                                <MethodIcon className="h-3 w-3 mr-1" />
                                {method === 'email' ? 'מייל' : method === 'push' ? 'Push' : 'שניהם'}
                              </Badge>
                              
                              {/* Days Info Badge */}
                              {daysInfo.text && (
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "h-6 text-xs font-medium",
                                    daysInfo.color
                                  )}
                                  suppressHydrationWarning
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  {daysInfo.text}
                                </Badge>
                              )}
                        </div>
                      </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingSubscription(sub)}
                              className="h-8 w-8 hover:bg-white/50 dark:hover:bg-black/20"
                          >
                              <Edit className="h-4 w-4" />
                          </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(sub.id)}
                              className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400"
                        >
                              <X className="h-4 w-4" />
                        </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Completed - Improved Design */}
        {!fetchingSubscriptions && completedSubscriptions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                הושלמו
              </h3>
              <Badge variant="outline" className="h-5 text-xs">
                {completedSubscriptions.length}
              </Badge>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {completedSubscriptions.map((sub, index) => {
                  const MethodIcon = getNotificationMethodIcon(sub.notification_method)
                  const method = sub.notification_method || 'email'
                  
                  return (
                    <motion.div
                      key={sub.id}
                      initial={mounted ? { opacity: 0, y: 10 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: mounted ? index * 0.05 : 0 }}
                    >
                      <div className="bg-gradient-to-br from-gray-50 to-gray-50/50 dark:from-gray-950/20 dark:to-gray-950/10 rounded-lg p-2.5 border border-gray-200/50 dark:border-gray-800/30">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate block">
                                {formatSubscriptionDate(sub)}
                              </span>
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "h-5 text-xs mt-1 font-medium opacity-70",
                                  method === 'email' && "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
                                  method === 'push' && "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
                                  method === 'both' && "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                )}
                              >
                                <MethodIcon className="h-2.5 w-2.5 mr-1" />
                                {method === 'email' ? 'מייל' : method === 'push' ? 'Push' : 'שניהם'}
                              </Badge>
                </div>
                </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(sub.id)}
                            className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
              </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Empty State - Modern */}
        {!fetchingSubscriptions && subscriptions.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gray-50 to-gray-50/50 dark:from-gray-950/20 dark:to-gray-950/10 border border-gray-200/50 dark:border-gray-800/30 mb-4">
              <Bell className="h-10 w-10 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
              אין התראות פעילות
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              צור התראה חדשה כדי להתחיל לקבל עדכונים
            </p>
          </div>
        )}
      </div>

      {/* Edit Dialog - Compact */}
      <Dialog open={!!editingSubscription} onOpenChange={(open) => !open && setEditingSubscription(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">עריכת התראה</DialogTitle>
            <DialogDescription className="text-xs">שנה תאריכים</DialogDescription>
            </DialogHeader>
          <div className="space-y-3 pt-2">
            {/* Edit Date Mode */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'single' as const, label: 'תאריך בודד', icon: Calendar },
                { value: 'range' as const, label: 'טווח', icon: CalendarDays }
              ].map((mode) => {
                const isSelected = editDateMode === mode.value
                const Icon = mode.icon
                return (
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
                      "p-2 rounded text-xs font-medium border flex items-center justify-center gap-1.5",
                      isSelected
                        ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                        : "border-gray-200 dark:border-gray-800"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {mode.label}
                  </button>
                )
              })}
            </div>

            {/* Edit Date Picker */}
            <AnimatePresence mode="wait">
              {editDateMode === 'single' ? (
                <Popover key="edit-single">
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                      className="w-full justify-start text-right h-10 text-sm"
                      >
                        <Calendar className="ml-2 h-4 w-4" />
                      {mounted && editSelectedDate ? format(editSelectedDate, "dd/MM/yyyy") : "בחר תאריך"}
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
              ) : (
                <Popover key="edit-range">
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                      className="w-full justify-start text-right h-10 text-sm"
                      >
                        <CalendarDays className="ml-2 h-4 w-4" />
                        {mounted && editDateRange.from ? (
                          editDateRange.to ? (
                          `${format(editDateRange.from, "dd/MM")} - ${format(editDateRange.to, "dd/MM/yyyy")}`
                          ) : (
                            format(editDateRange.from, "dd/MM/yyyy")
                          )
                        ) : (
                        "בחר טווח"
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
              )}
            </AnimatePresence>

            <div className="flex gap-2">
                <Button 
                  onClick={handleUpdate}
                disabled={editLoading || (editDateMode === 'single' ? !editSelectedDate : !editDateRange.from || !editDateRange.to)}
                className="flex-1 h-9 text-sm bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200"
              >
                {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'עדכן'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingSubscription(null)}
                  disabled={editLoading}
                className="h-9 text-sm"
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
