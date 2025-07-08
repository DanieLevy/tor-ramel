"use client"

import { useState, useEffect } from 'react'
import { Bell, Calendar, CalendarDays, Loader2, Trash2, CheckCircle, Sparkles, Edit, TrendingUp, Zap, BarChart3, Target, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { format, addDays } from 'date-fns'
import { he } from 'date-fns/locale'
import { cn, pwaFetch, isRunningAsPWA } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { motion, AnimatePresence } from 'framer-motion'

interface Subscription {
  id: string
  subscription_date: string | null
  date_range_start: string | null
  date_range_end: string | null
  is_active: boolean
  created_at: string
  completed_at: string | null
}

function SubscribePage() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingSubscriptions, setFetchingSubscriptions] = useState(true)
  const [tab, setTab] = useState<'single' | 'range'>('single')
  const [subscriptionProgress, setSubscriptionProgress] = useState(0)
  
  // Edit modal state
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [editTab, setEditTab] = useState<'single' | 'range'>('single')
  const [editSelectedDate, setEditSelectedDate] = useState<Date>()
  const [editDateRange, setEditDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  useEffect(() => {
    if (editingSubscription) {
      if (editingSubscription.subscription_date) {
        setEditTab('single')
        setEditSelectedDate(new Date(editingSubscription.subscription_date + 'T00:00:00'))
        setEditDateRange({ from: undefined, to: undefined })
      } else if (editingSubscription.date_range_start && editingSubscription.date_range_end) {
        setEditTab('range')
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
      } else {
        const error = await response.json()
        console.error('🔍 Failed to fetch subscriptions:', error)
        toast.error('שגיאה בטעינת המנויים')
      }
    } catch (error) {
      console.error('🔍 Failed to fetch subscriptions:', error)
      toast.error('שגיאה בטעינת המנויים')
    } finally {
      setFetchingSubscriptions(false)
    }
  }

  const isDateDisabled = (date: Date) => {
    // Get day of week in Israeli timezone
    const israeliDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }))
    const day = israeliDate.getDay()
    
    // Get today in Israeli timezone
    const now = new Date()
    const israeliToday = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }))
    israeliToday.setHours(0, 0, 0, 0)
    
    // Get 30 days from today
    const maxDate = new Date(israeliToday)
    maxDate.setDate(maxDate.getDate() + 30)
    
    // Normalize input date to Israeli timezone for comparison
    const israeliInputDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }))
    israeliInputDate.setHours(0, 0, 0, 0)
    
    // Disable past dates, dates more than 30 days from today, Mondays (1) and Saturdays (6)
    return israeliInputDate < israeliToday || israeliInputDate > maxDate || day === 1 || day === 6
  }

  const handleSubscribe = async () => {
    // Haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
    
    setLoading(true)
    setSubscriptionProgress(0)
    
    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setSubscriptionProgress(prev => Math.min(prev + 15, 80))
      }, 100)

      const payload = tab === 'single' 
        ? { subscription_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null }
        : { 
            date_range_start: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
            date_range_end: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : null
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
        // Reset form
        setSelectedDate(undefined)
        setDateRange({ from: undefined, to: undefined })
        fetchSubscriptions()
      } else {
        const error = await response.json()
        toast.error(error.message || 'שגיאה בהרשמה')
      }
    } catch (error) {
      console.error('🔍 Subscribe error:', error)
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
      console.error('🔍 Delete error:', error)
      toast.error('שגיאה בביטול המנוי')
    }
  }

  const handleUpdate = async () => {
    if (!editingSubscription) return
    
    setEditLoading(true)
    
    try {
      const payload = editTab === 'single' 
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
      console.error('🔍 Update error:', error)
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

  const getSubscriptionStats = () => {
    const activeCount = subscriptions.filter(s => s.is_active).length
    const completedCount = subscriptions.filter(s => !s.is_active).length
    const totalCount = subscriptions.length
    const successRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    
    return {
      active: activeCount,
      completed: completedCount,
      total: totalCount,
      successRate
    }
  }

  return (
    <div className="container py-8 px-4 pb-24">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header with animation */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4">
            <Bell className="h-10 w-10 text-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              התראות חכמות
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-base">
              קבל התראה מיידית במייל כשיש תורים פנויים בתאריכים שחשובים לך
            </p>
          </div>

          {/* Quick Stats */}
          {!fetchingSubscriptions && subscriptions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap justify-center gap-3 mt-6"
            >
              {[
                { 
                  icon: Target, 
                  label: 'פעילות', 
                  value: getSubscriptionStats().active, 
                  color: 'from-green-500 to-green-600',
                  bgColor: 'bg-green-50 dark:bg-green-950/20',
                  textColor: 'text-green-700 dark:text-green-300'
                },
                { 
                  icon: CheckCircle, 
                  label: 'הושלמו', 
                  value: getSubscriptionStats().completed, 
                  color: 'from-blue-500 to-blue-600',
                  bgColor: 'bg-blue-50 dark:bg-blue-950/20',
                  textColor: 'text-blue-700 dark:text-blue-300'
                },
                { 
                  icon: BarChart3, 
                  label: 'הצלחה', 
                  value: `${getSubscriptionStats().successRate}%`, 
                  color: 'from-purple-500 to-purple-600',
                  bgColor: 'bg-purple-50 dark:bg-purple-950/20',
                  textColor: 'text-purple-700 dark:text-purple-300'
                }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm",
                    stat.bgColor
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br",
                    stat.color
                  )}>
                    <stat.icon className="h-3 w-3 text-white" />
                  </div>
                  <div className="text-xs">
                    <div className={cn("font-bold", stat.textColor)}>{stat.value}</div>
                    <div className="text-muted-foreground text-[10px]">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Subscription Form - Flat Design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-yellow-500" />
              <h2 className="text-xl font-bold">צור התראה חדשה</h2>
            </div>
            <p className="text-muted-foreground">
              בחר תאריך או טווח תאריכים ונודיע לך מיד כשיתפנה תור
            </p>
          </div>
          
          <div className="space-y-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'single' | 'range')}>
              <div className="grid grid-cols-2 gap-6 mb-6">
                {[
                  { value: 'range', label: 'טווח תאריכים', icon: CalendarDays, color: 'from-purple-500 to-purple-600' },
                  { value: 'single', label: 'תאריך בודד', icon: Calendar, color: 'from-blue-500 to-blue-600' }
                ].map((option) => (
                  <motion.button
                    key={option.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setTab(option.value as any)}
                    className={cn(
                      "relative py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200",
                      tab === option.value
                        ? "text-white"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab === option.value && (
                      <motion.div 
                        layoutId="activeSubscriptionTab"
                        className={cn("absolute inset-0 rounded-lg bg-gradient-to-r", option.color)}
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    <span className="relative flex items-center gap-2 justify-center">
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </span>
                  </motion.button>
                ))}
              </div>

              <TabsContent value="single" className="space-y-4">
                <div className="flex flex-col gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-between text-right h-12 border-2 flex-row-reverse",
                          !selectedDate && "text-muted-foreground",
                          selectedDate && "border-primary"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          format(selectedDate, "EEEE, dd בMMMM yyyy", { locale: he })
                        ) : (
                          "לחץ לבחירת תאריך"
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
                  
                  {selectedDate && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="py-2"
                    >
                      <p className="text-sm text-foreground font-medium text-right">
                        תקבל התראה כשיתפנו תורים ב-{format(selectedDate, "dd/MM/yyyy")}
                      </p>
                    </motion.div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="range" className="space-y-4">
                <div className="flex flex-col gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-between text-right h-12 border-2 flex-row-reverse",
                          !dateRange.from && "text-muted-foreground",
                          dateRange.from && "border-primary"
                        )}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                              {format(dateRange.to, "dd/MM/yyyy")}
                            </>
                          ) : (
                            format(dateRange.from, "dd/MM/yyyy")
                          )
                        ) : (
                          "לחץ לבחירת טווח תאריכים"
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
                  
                  {dateRange.from && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="py-2"
                    >
                      <p className="text-sm text-foreground font-medium text-right">
                        תקבל התראה כשיתפנו תורים בין {format(dateRange.from, "dd/MM")} 
                        {dateRange.to ? ` ל-${format(dateRange.to, "dd/MM/yyyy")}` : '...'}
                      </p>
                    </motion.div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Submit button */}
            <div className="pt-4">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  onClick={handleSubscribe}
                  disabled={loading || (tab === 'single' ? !selectedDate : !dateRange.from || !dateRange.to)}
                  className="w-full h-14 text-lg font-semibold relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 bg-black hover:bg-black/90"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000" />
                  
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>נרשם להתראות...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: loading ? 360 : 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Sparkles className="h-5 w-5" />
                      </motion.div>
                      <span>הירשם להתראות</span>
                    </div>
                  )}
                </Button>
              </motion.div>
              
              {loading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3"
                >
                  <Progress value={subscriptionProgress} className="h-1" />
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Subscriptions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold">המנויים שלך</h3>
              {subscriptions.length > 0 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {getSubscriptionStats().active} פעילים
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {fetchingSubscriptions ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : subscriptions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12 space-y-4"
              >
                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
                  <Bell className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium">עדיין אין לך התראות</p>
                  <p className="text-sm text-muted-foreground/80">
                    צור את ההתראה הראשונה שלך כדי להתחיל לקבל עדכונים
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {subscriptions.map((sub, index) => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={cn(
                        "group flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm hover:scale-[1.01]",
                        sub.is_active 
                          ? "bg-gradient-to-r from-green-50/30 to-green-50/10 border-green-200/60 hover:border-green-300/80 dark:from-green-950/10 dark:to-green-950/5 dark:border-green-800/40" 
                          : "bg-gradient-to-r from-gray-50/30 to-gray-50/10 border-gray-200/60 dark:from-gray-950/10 dark:to-gray-950/5 dark:border-gray-700/40"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                          sub.is_active 
                            ? "bg-green-100/80 dark:bg-green-900/30" 
                            : "bg-gray-100/80 dark:bg-gray-800/30"
                        )}>
                          {sub.is_active ? (
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {formatSubscriptionDate(sub)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sub.is_active ? (
                              "פעיל"
                            ) : (
                              `הושלם ${format(new Date(sub.completed_at!), 'dd/MM')}`
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {sub.is_active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingSubscription(sub)}
                            className="h-7 w-7 hover:bg-primary/10"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(sub.id)}
                          className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        {/* Edit Dialog */}
        <Dialog open={!!editingSubscription} onOpenChange={(open) => !open && setEditingSubscription(null)}>
          <DialogContent className="max-w-md border-2 shadow-xl">
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                  <Edit className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">עריכת התראה</DialogTitle>
                  <DialogDescription className="text-base">
                    שנה את התאריכים להתראה זו
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Tabs value={editTab} onValueChange={(v) => setEditTab(v as 'single' | 'range')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="single" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    תאריך בודד
                  </TabsTrigger>
                  <TabsTrigger value="range" className="gap-2">
                    <CalendarDays className="h-4 w-4" />
                    טווח תאריכים
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="single" className="space-y-4 mt-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-right",
                          !editSelectedDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="ml-2 h-4 w-4" />
                        {editSelectedDate ? (
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
                </TabsContent>

                <TabsContent value="range" className="space-y-4 mt-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-right",
                          !editDateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarDays className="ml-2 h-4 w-4" />
                        {editDateRange.from ? (
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
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleUpdate}
                  disabled={editLoading || (editTab === 'single' ? !editSelectedDate : !editDateRange.from || !editDateRange.to)}
                  className="flex-1 h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  {editLoading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      מעדכן...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="ml-2 h-4 w-4" />
                      עדכן התראה
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingSubscription(null)}
                  disabled={editLoading}
                  className="h-11 border-2"
                >
                  ביטול
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default SubscribePage