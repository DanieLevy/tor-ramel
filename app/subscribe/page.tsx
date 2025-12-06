"use client"

import { useState, useEffect, useCallback } from 'react'
import { Bell, Calendar, CalendarDays, Loader2, Plus, Trash2, Pause, Play, Edit3, CheckCircle2, Clock, Zap, ChevronDown } from 'lucide-react'
import { format, addDays, isPast } from 'date-fns'
import { he } from 'date-fns/locale'
import { pwaFetch, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useHaptics } from '@/hooks/use-haptics'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { NativeDatePicker, NativeDateRangePicker } from '@/components/ui/native-date-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { motion, AnimatePresence } from 'framer-motion'
import {
  EditSubscriptionDialog,
  type Subscription,
  type DateRange
} from '@/components/subscribe'

// Quick subscribe presets - Apple-style solid colors
const QUICK_PRESETS = [
  { id: 'week', label: 'שבוע', days: 7, color: 'bg-blue-500', textColor: 'text-white' },
  { id: 'two-weeks', label: 'שבועיים', days: 14, color: 'bg-indigo-500', textColor: 'text-white' },
  { id: 'month', label: 'חודש', days: 30, color: 'bg-violet-500', textColor: 'text-white' },
]

// Date mode type
type DateMode = 'single' | 'range'

// Check if date is disabled (Monday/Saturday or past)
const isDateDisabled = (date: Date) => {
  const day = date.getDay()
  return day === 1 || day === 6 || date < new Date(new Date().setHours(0, 0, 0, 0))
}

function SubscribePage() {
  useAuth()
  const haptics = useHaptics()
  
  // Core state
  const [mounted, setMounted] = useState(false)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [quickLoading, setQuickLoading] = useState<string | null>(null)
  const [fetchingSubscriptions, setFetchingSubscriptions] = useState(true)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined })
  const [dateMode, setDateMode] = useState<DateMode>('range')
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Edit modal state
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  
  // Device detection
  const [useNativePicker, setUseNativePicker] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  usePushNotifications()

  // Define fetchSubscriptions BEFORE the useEffect that uses it
  const fetchSubscriptions = useCallback(async () => {
    try {
      const response = await pwaFetch('/api/notifications/subscriptions', {
        method: 'GET',
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setSubscriptions(data)
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error)
    } finally {
      setFetchingSubscriptions(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    const touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const iosDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    setIsTouchDevice(touchDevice)
    if (iosDevice) setUseNativePicker(true)
  }, [])

  useEffect(() => {
    if (mounted) fetchSubscriptions()
  }, [mounted, fetchSubscriptions])

  const handleQuickSubscribe = async (preset: typeof QUICK_PRESETS[0]) => {
    haptics.medium()
    setQuickLoading(preset.id)

    try {
      const today = new Date()
      const endDate = addDays(today, preset.days)

      const response = await pwaFetch('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          date_range_start: format(today, 'yyyy-MM-dd'),
          date_range_end: format(endDate, 'yyyy-MM-dd'),
        }),
      })

      if (response.ok) {
        haptics.success()
        toast.success(`נרשמת להתראות עבור ${preset.label} הקרוב!`)
        fetchSubscriptions()
      } else {
        const data = await response.json()
        haptics.error()
        toast.error(data.error || 'שגיאה ביצירת ההתראה')
      }
    } catch (error) {
      console.error('Quick subscribe error:', error)
      haptics.error()
      toast.error('שגיאה ביצירת ההתראה')
    } finally {
      setQuickLoading(null)
    }
  }

  const handleSubscribe = async () => {
    haptics.medium()
    setLoading(true)
    
    try {
      const payload = dateMode === 'single' 
        ? { subscription_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null }
        : { 
            date_range_start: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
            date_range_end: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : null
          }

      const response = await pwaFetch('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        haptics.success()
        toast.success('נרשמת בהצלחה!')
        setSelectedDate(undefined)
        setDateRange({ from: undefined, to: undefined })
        setShowAdvanced(false)
        fetchSubscriptions()
      } else {
        const error = await response.json()
        haptics.error()
        toast.error(error.error || 'שגיאה בהרשמה')
      }
    } catch (error) {
      console.error('Subscribe error:', error)
      haptics.error()
      toast.error('שגיאה בהרשמה')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    haptics.medium()
    setDeletingIds(prev => new Set(prev).add(id))
    
    try {
      const response = await pwaFetch(`/api/notifications/subscriptions/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        haptics.success()
        toast.success('ההתראה בוטלה')
        fetchSubscriptions()
      } else {
        haptics.error()
        toast.error('שגיאה בביטול')
      }
    } catch (error) {
      console.error('Delete error:', error)
      haptics.error()
      toast.error('שגיאה בביטול')
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const handleTogglePause = async (sub: Subscription) => {
    haptics.light()
    setTogglingIds(prev => new Set(prev).add(sub.id))
    const newStatus = sub.subscription_status === 'paused' ? 'active' : 'paused'
    
    try {
      const response = await pwaFetch(`/api/notifications/subscriptions/${sub.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ subscription_status: newStatus })
      })

      if (response.ok) {
        haptics.success()
        toast.success(newStatus === 'paused' ? 'ההתראה הושהתה' : 'ההתראה חודשה')
        fetchSubscriptions()
      } else {
        haptics.error()
        toast.error('שגיאה בעדכון')
      }
    } catch (error) {
      console.error('Toggle error:', error)
      haptics.error()
      toast.error('שגיאה בעדכון')
    } finally {
      setTogglingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(sub.id)
        return newSet
      })
    }
  }

  const handleUpdate = async (payload: {
    subscription_date: string | null
    date_range_start: string | null
    date_range_end: string | null
  }) => {
    if (!editingSubscription) return
    
    try {
      const response = await pwaFetch(`/api/notifications/subscriptions/${editingSubscription.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        haptics.success()
        toast.success('ההתראה עודכנה')
        setEditingSubscription(null)
        fetchSubscriptions()
      } else {
        const error = await response.json()
        haptics.error()
        toast.error(error.message || 'שגיאה בעדכון')
      }
    } catch (error) {
      console.error('Update error:', error)
      haptics.error()
      toast.error('שגיאה בעדכון')
    }
  }

  const formatSubscriptionDate = (sub: Subscription) => {
    if (sub.subscription_date) {
      return format(new Date(sub.subscription_date + 'T00:00:00'), 'dd בMMMM', { locale: he })
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

  const activeSubscriptions = subscriptions.filter(s => s.is_active)
  const completedSubscriptions = subscriptions.filter(s => !s.is_active)
  const isSubmitDisabled = loading || (dateMode === 'single' ? !selectedDate : !dateRange.from || !dateRange.to)

  return (
    <div className="min-h-full bg-background">
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-6 page-content-bottom-spacing">
        
        {/* Hero Header - Clean minimal design */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 pt-2"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500">
            <Bell className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              התראות חכמות
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              קבל עדכון מיידי כשמתפנה תור
            </p>
          </div>
        </motion.div>

        {/* Quick Subscribe Section - Solid color cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">התראה מהירה</span>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {QUICK_PRESETS.map((preset) => {
              const isLoading = quickLoading === preset.id
              return (
                <motion.button
                  key={preset.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleQuickSubscribe(preset)}
                  disabled={quickLoading !== null}
                  className={cn(
                    "relative rounded-2xl p-4 text-center transition-all shadow-sm",
                    preset.color,
                    isLoading && "opacity-70"
                  )}
                >
                  <div className="relative">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white mx-auto mb-1" />
                    ) : (
                      <Calendar className="h-5 w-5 text-white/90 mx-auto mb-1" />
                    )}
                    <span className={cn("block text-sm font-bold", preset.textColor)}>
                      {preset.label}
                    </span>
                    <span className={cn("block text-[10px] mt-0.5 opacity-80", preset.textColor)}>
                      {preset.days} ימים
                    </span>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Advanced Date Picker - Collapsible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <button
            onClick={() => {
              haptics.light()
              setShowAdvanced(!showAdvanced)
            }}
            className="w-full p-4 flex items-center justify-between touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                <CalendarDays className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-right">
                <span className="block text-sm font-semibold">בחירת תאריכים מותאמת</span>
                <span className="block text-xs text-muted-foreground">בחר תאריך או טווח ספציפי</span>
              </div>
            </div>
            <motion.div
              animate={{ rotate: showAdvanced ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-4 border-t border-border">
                  {/* Date Mode Toggle */}
                  <div className="pt-4 grid grid-cols-2 gap-2">
                    {[
                      { value: 'single' as const, label: 'תאריך בודד', icon: Calendar },
                      { value: 'range' as const, label: 'טווח תאריכים', icon: CalendarDays }
                    ].map((mode) => {
                      const isSelected = dateMode === mode.value
                      const Icon = mode.icon
                      return (
                        <button
                          key={mode.value}
                          onClick={() => {
                            haptics.light()
                            setDateMode(mode.value)
                            if (mode.value === 'single') {
                              setDateRange({ from: undefined, to: undefined })
                            } else {
                              setSelectedDate(undefined)
                            }
                          }}
                          className={cn(
                            "p-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
                            isSelected
                              ? "bg-foreground text-background"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {mode.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Native Picker Toggle */}
                  {isTouchDevice && (
                    <div className="flex items-center justify-between py-2 px-1">
                      <span className="text-xs text-muted-foreground">
                        לוח שנה של המכשיר
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          haptics.light()
                          setUseNativePicker(!useNativePicker)
                        }}
                        className={cn(
                          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 touch-manipulation",
                          useNativePicker ? "bg-blue-500" : "bg-muted"
                        )}
                        role="switch"
                        aria-checked={useNativePicker}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 mt-0.5",
                            useNativePicker ? "translate-x-5 mr-0.5" : "translate-x-0.5"
                          )}
                        />
                      </button>
                    </div>
                  )}
                  
                  {/* Date Picker */}
                  <AnimatePresence mode="wait">
                    {dateMode === 'single' ? (
                      <motion.div
                        key="single"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                      >
                        {useNativePicker ? (
                          <NativeDatePicker
                            value={selectedDate}
                            onChange={setSelectedDate}
                            minDate={new Date()}
                            placeholder="בחר תאריך"
                            label="תאריך להתראה"
                          />
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-center h-12 text-sm font-normal rounded-xl",
                                  selectedDate && "border-foreground/30"
                                )}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {mounted && selectedDate ? (
                                  format(selectedDate, "dd בMMMM yyyy", { locale: he })
                                ) : (
                                  <span className="text-muted-foreground">בחר תאריך</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="center">
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
                        )}
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="range"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        {useNativePicker ? (
                          <NativeDateRangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            minDate={new Date()}
                          />
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-center h-12 text-sm font-normal rounded-xl",
                                  dateRange.from && "border-foreground/30"
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
                                  <span className="text-muted-foreground">בחר טווח תאריכים</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="center">
                              <CalendarComponent
                                mode="range"
                                selected={dateRange}
                                onSelect={(range) => setDateRange({
                                  from: range?.from,
                                  to: range?.to
                                })}
                                disabled={isDateDisabled}
                                locale={he}
                                initialFocus
                                numberOfMonths={1}
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubscribe}
                    disabled={isSubmitDisabled}
                    className={cn(
                      "w-full h-12 rounded-xl text-sm font-semibold",
                      !isSubmitDisabled && "bg-blue-500 hover:bg-blue-600"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 ml-2" />
                        צור התראה
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Active Subscriptions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold">התראות פעילות</span>
              {activeSubscriptions.length > 0 && (
                <span className="text-xs text-muted-foreground">({activeSubscriptions.length})</span>
              )}
            </div>
          </div>

          {fetchingSubscriptions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeSubscriptions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                אין התראות פעילות
              </h3>
              <p className="text-xs text-muted-foreground">
                בחר אפשרות מהירה או תאריכים מותאמים
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {activeSubscriptions.map((sub) => {
                  const isExpired = isSubscriptionExpired(sub)
                  const isPaused = sub.subscription_status === 'paused'
                  const isDeleting = deletingIds.has(sub.id)
                  const isToggling = togglingIds.has(sub.id)
                  
                  return (
                    <motion.div
                      key={sub.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, x: -100 }}
                      className={cn(
                        "rounded-2xl border bg-card p-4 transition-all",
                        isExpired && "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20",
                        isPaused && !isExpired && "border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20",
                        !isExpired && !isPaused && "border-border"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        {/* Status Icon */}
                        <div className={cn(
                          "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
                          isExpired ? "bg-red-100 dark:bg-red-900/40" :
                          isPaused ? "bg-amber-100 dark:bg-amber-900/40" :
                          "bg-emerald-100 dark:bg-emerald-900/40"
                        )}>
                          {isExpired ? (
                            <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
                          ) : isPaused ? (
                            <Pause className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">
                            {formatSubscriptionDate(sub)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {isExpired ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium">
                                פג תוקף
                              </span>
                            ) : isPaused ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
                                מושהה
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
                                פעיל
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {!isExpired && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleTogglePause(sub)}
                                disabled={isToggling}
                                className="h-9 w-9 rounded-xl touch-manipulation"
                              >
                                {isToggling ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isPaused ? (
                                  <Play className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <Pause className="h-4 w-4 text-amber-600" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingSubscription(sub)}
                                className="h-9 w-9 rounded-xl touch-manipulation"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(sub.id)}
                            disabled={isDeleting}
                            className="h-9 w-9 rounded-xl touch-manipulation hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Completed Subscriptions */}
        {completedSubscriptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <span className="text-sm font-semibold text-muted-foreground">
              היסטוריה ({completedSubscriptions.length})
            </span>
            
            <div className="space-y-2 opacity-60">
              {completedSubscriptions.slice(0, 3).map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-xl border border-border bg-card p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {formatSubscriptionDate(sub)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(sub.id)}
                    disabled={deletingIds.has(sub.id)}
                    className="h-8 w-8 rounded-lg"
                  >
                    {deletingIds.has(sub.id) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Edit Dialog */}
      <EditSubscriptionDialog
        subscription={editingSubscription}
        mounted={mounted}
        onClose={() => setEditingSubscription(null)}
        onUpdate={handleUpdate}
      />
    </div>
  )
}

export default SubscribePage
