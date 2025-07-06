"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, Calendar, CalendarDays, Loader2, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { format, addDays } from 'date-fns'
import { he } from 'date-fns/locale'
import { cn, pwaFetch, isRunningAsPWA } from '@/lib/utils'
import { toast } from 'sonner'

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
    
    // Log PWA status for debugging
    if (isRunningAsPWA()) {
      console.log('🔍 Running as PWA - special handling enabled')
    }
  }, [])

  const fetchSubscriptions = async () => {
    try {
      console.log('🔍 Fetching subscriptions...')
      const response = await pwaFetch('/api/notifications/subscriptions', {
        method: 'GET',
        credentials: 'include'
      })
      
      console.log('🔍 Subscription response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Subscriptions loaded:', data.length)
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

      console.log('🔍 Creating subscription:', payload)

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
    <div className="container py-8 px-4">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">התראות על תורים פנויים</h1>
          <p className="text-muted-foreground">
            הירשם לקבלת התראות במייל כשיש תורים פנויים בתאריכים שבחרת
          </p>
        </div>

        {/* Subscription Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              הרשמה להתראות
            </CardTitle>
            <CardDescription>
              בחר תאריך בודד או טווח תאריכים לקבלת התראות
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'single' | 'range')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">תאריך בודד</TabsTrigger>
                <TabsTrigger value="range">טווח תאריכים</TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="space-y-4 mt-6">
                <div className="flex flex-col gap-4">
                  <label className="text-sm font-medium">בחר תאריך</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-right",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="ml-2 h-4 w-4" />
                        {selectedDate ? (
                          format(selectedDate, "dd/MM/yyyy")
                        ) : (
                          "בחר תאריך"
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
                </div>
              </TabsContent>

              <TabsContent value="range" className="space-y-4 mt-6">
                <div className="flex flex-col gap-4">
                  <label className="text-sm font-medium">בחר טווח תאריכים</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-right",
                          !dateRange.from && "text-muted-foreground"
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
                          "בחר טווח תאריכים"
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
                </div>
              </TabsContent>
            </Tabs>

            <Button 
              onClick={handleSubscribe}
              disabled={loading || (tab === 'single' ? !selectedDate : !dateRange.from || !dateRange.to)}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  נרשם...
                </>
              ) : (
                <>
                  <Bell className="ml-2 h-4 w-4" />
                  הרשם להתראות
                </>
              )}
            </Button>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                תקבל התראה במייל כשיימצאו תורים פנויים בתאריכים שבחרת.
                תוכל לבטל את ההרשמה בכל עת.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              המנויים הפעילים שלי
            </CardTitle>
            <CardDescription>
              כאן תוכל לראות ולנהל את ההתראות שהגדרת
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fetchingSubscriptions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>אין לך מנויים פעילים כרגע</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border",
                      sub.is_active ? "bg-background" : "bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {sub.is_active ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">
                          {formatSubscriptionDate(sub)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {sub.is_active ? 'פעיל' : 'הושלם'}
                          {' • '}
                          נוצר ב-{format(new Date(sub.created_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    {sub.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sub.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Test Email Button - Development Only */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-dashed border-orange-500">
            <CardHeader>
              <CardTitle className="text-orange-600">🧪 בדיקת מערכת</CardTitle>
              <CardDescription>
                כלי פיתוח - שלח מייל בדיקה
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    const response = await pwaFetch('/api/notifications/test', {
                      method: 'POST'
                    })
                    if (response.ok) {
                      toast.success('מייל בדיקה נשלח בהצלחה!')
                    } else {
                      toast.error('שגיאה בשליחת מייל בדיקה')
                    }
                  } catch (error) {
                    toast.error('שגיאה בשליחת מייל בדיקה')
                  }
                }}
              >
                📧 שלח מייל בדיקה
              </Button>
            </CardContent>
          </Card>
        )}

        {/* PWA Debug Info - Development Only */}
        {process.env.NODE_ENV === 'development' && isRunningAsPWA() && (
          <Card className="border-dashed border-purple-500">
            <CardHeader>
              <CardTitle className="text-purple-600">🔍 PWA Debug Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs font-mono">
              <div>PWA Mode: {isRunningAsPWA() ? '✅ Yes' : '❌ No'}</div>
              <div>User: {user?.email || 'Not logged in'}</div>
              <div>Auth Cookie: {document.cookie.includes('tor-ramel-auth') ? '✅ Present' : '❌ Missing'}</div>
              <div>LocalStorage User: {localStorage.getItem('tor-ramel-user') ? '✅ Present' : '❌ Missing'}</div>
              <div>Display Mode: {window.matchMedia('(display-mode: standalone)').matches ? 'Standalone' : 'Browser'}</div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  console.log('🔍 Full Debug Info:', {
                    cookies: document.cookie,
                    localStorage: {
                      user: localStorage.getItem('tor-ramel-user'),
                      expiry: localStorage.getItem('tor-ramel-auth-expiry')
                    },
                    pwaMode: isRunningAsPWA(),
                    displayMode: window.matchMedia('(display-mode: standalone)').matches,
                    userAgent: navigator.userAgent
                  })
                  toast.info('Debug info logged to console')
                }}
              >
                Log Full Debug Info
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default SubscribePage 