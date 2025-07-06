"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, Calendar, CalendarDays, Loader2, Trash2, CheckCircle, AlertCircle, Clock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
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

  useEffect(() => {
    fetchSubscriptions()
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
    const day = date.getDay()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Disable past dates, Mondays (1) and Saturdays (6)
    return date < today || day === 1 || day === 6
  }

  const handleSubscribe = async () => {
    setLoading(true)
    
    try {
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

      if (response.ok) {
        toast.success('נרשמת בהצלחה להתראות')
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

  const formatSubscriptionDate = (sub: Subscription) => {
    if (sub.subscription_date) {
      return format(new Date(sub.subscription_date + 'T00:00:00'), 'dd/MM/yyyy')
    }
    if (sub.date_range_start && sub.date_range_end) {
      return `${format(new Date(sub.date_range_start + 'T00:00:00'), 'dd/MM')} - ${format(new Date(sub.date_range_end + 'T00:00:00'), 'dd/MM/yyyy')}`
    }
    return ''
  }

  return (
    <div className="container py-8 px-4 pb-24">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header with animation */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <Bell className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            התראות חכמות
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            קבל התראה מיידית במייל כשיש תורים פנויים בתאריכים שחשובים לך
          </p>
        </motion.div>

        {/* Subscription Form with better design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                צור התראה חדשה
              </CardTitle>
              <CardDescription>
                בחר תאריך או טווח תאריכים ונודיע לך מיד כשיתפנה תור
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={tab} onValueChange={(v) => setTab(v as 'single' | 'range')}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="single" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    תאריך בודד
                  </TabsTrigger>
                  <TabsTrigger value="range" className="gap-2">
                    <CalendarDays className="h-4 w-4" />
                    טווח תאריכים
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="single" className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-right h-12 border-2",
                            !selectedDate && "text-muted-foreground",
                            selectedDate && "border-primary"
                          )}
                        >
                          <Calendar className="ml-2 h-4 w-4" />
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
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 bg-primary/5 rounded-lg border border-primary/20"
                      >
                        <p className="text-sm text-primary font-medium">
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
                            "w-full justify-start text-right h-12 border-2",
                            !dateRange.from && "text-muted-foreground",
                            dateRange.from && "border-primary"
                          )}
                        >
                          <CalendarDays className="ml-2 h-4 w-4" />
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
                    
                    {dateRange.from && dateRange.to && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 bg-primary/5 rounded-lg border border-primary/20"
                      >
                        <p className="text-sm text-primary font-medium">
                          תקבל התראה אחת עם כל התורים הזמינים בטווח הזה
                        </p>
                      </motion.div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <Button 
                onClick={handleSubscribe}
                disabled={loading || (tab === 'single' ? !selectedDate : !dateRange.from || !dateRange.to)}
                className="w-full h-12 text-base shadow-lg"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    יוצר התראה...
                  </>
                ) : (
                  <>
                    <Bell className="ml-2 h-5 w-5" />
                    צור התראה
                  </>
                )}
              </Button>

              <Alert className="border-primary/20 bg-primary/5">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  המערכת סורקת תורים פנויים כל 5 דקות, 24/7. 
                  ברגע שיתפנה תור תקבל מייל עם קישור ישיר להזמנה.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Subscriptions with better animations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                ההתראות שלי
              </CardTitle>
              <CardDescription>
                כל ההתראות הפעילות וההיסטוריה שלך
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fetchingSubscriptions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : subscriptions.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted">
                    <Bell className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-medium mb-2">אין התראות פעילות</p>
                    <p className="text-muted-foreground text-sm">
                      צור את ההתראה הראשונה שלך למעלה
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {subscriptions.map((sub) => (
                      <motion.div
                        key={sub.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={cn(
                          "group flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:shadow-md",
                          sub.is_active 
                            ? "bg-background border-border hover:border-primary/30" 
                            : "bg-muted/30 border-muted"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
                            sub.is_active ? "bg-green-100 dark:bg-green-900/20" : "bg-muted"
                          )}>
                            {sub.is_active ? (
                              <CheckCircle className="h-6 w-6 text-green-600" />
                            ) : (
                              <AlertCircle className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-lg">
                              {formatSubscriptionDate(sub)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {sub.is_active ? (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                  פעיל - סורק כל 5 דקות
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  הושלם ב-{format(new Date(sub.completed_at!), 'dd/MM HH:mm')}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        {sub.is_active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(sub.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

export default SubscribePage 