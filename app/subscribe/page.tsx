"use client"

import { useState, useEffect } from 'react'
import { Bell, Calendar, CalendarDays, Loader2, Trash2, CheckCircle, Edit, Mail, Smartphone, CheckCircle2, X } from 'lucide-react'
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

  const activeSubscriptions = subscriptions.filter(s => s.is_active)
  const completedSubscriptions = subscriptions.filter(s => !s.is_active)

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24">
      <div className="container max-w-lg mx-auto px-4 py-4 space-y-4">
        
        {/* Header - Minimal */}
        <div className="text-center py-2">
          <h1 className="text-xl font-bold text-black dark:text-white">
            התראות חכמות
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            עדכונים על תורים פנויים
          </p>
        </div>

        {/* Main Card - Clean & Compact */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          
          {/* Notification Method - Compact Buttons */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-800">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-2">
              אופן התראה
            </label>
            
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'email' as NotificationMethod, icon: Mail, label: 'מייל', available: true },
                { value: 'push' as NotificationMethod, icon: Smartphone, label: 'Push', available: pushSupported && (isPWA || !isIOS) },
                { value: 'both' as NotificationMethod, icon: Bell, label: 'שניהם', available: pushSupported && (isPWA || !isIOS) }
              ].map((method) => {
                const isSelected = notificationMethod === method.value
                const Icon = method.icon
                return (
                  <button
                    key={method.value}
                    onClick={() => method.available && handleNotificationMethodChange(method.value)}
                    disabled={!method.available || pushLoading}
                    className={cn(
                      "relative p-2 rounded-md transition-all text-center border",
                      isSelected 
                        ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white" 
                        : "bg-white dark:bg-black border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600",
                      !method.available && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 mx-auto mb-1", isSelected ? "" : "text-gray-600 dark:text-gray-400")} />
                    <span className="text-xs font-medium block">{method.label}</span>
                  </button>
                )
              })}
            </div>

            {/* iOS PWA Notice - Minimal */}
            {isIOS && !isPWA && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                💡 התקן את האפליקציה לקבלת Push
              </p>
            )}
          </div>

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
            
            <div className="space-y-1.5">
              {activeSubscriptions.map((sub) => {
                const MethodIcon = getNotificationMethodIcon(sub.notification_method)
                return (
                  <div
                    key={sub.id}
                    className="border border-gray-200 dark:border-gray-800 rounded-lg p-2.5 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {formatSubscriptionDate(sub)}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MethodIcon className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {sub.notification_method === 'email' ? 'מייל' : sub.notification_method === 'push' ? 'Push' : 'שניהם'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingSubscription(sub)}
                          className="h-7 w-7"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(sub.id)}
                          className="h-7 w-7"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Completed - Ultra Compact */}
        {!fetchingSubscriptions && completedSubscriptions.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 px-1">
              הושלמו ({completedSubscriptions.length})
            </h3>
            <div className="space-y-1">
              {completedSubscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="border border-gray-100 dark:border-gray-900 rounded p-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {formatSubscriptionDate(sub)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(sub.id)}
                    className="h-6 w-6"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State - Minimal */}
        {!fetchingSubscriptions && subscriptions.length === 0 && (
          <div className="text-center py-8">
            <Bell className="h-8 w-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              אין התראות פעילות
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
