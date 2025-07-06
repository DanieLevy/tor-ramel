"use client"

import { useEffect, useState } from 'react'
import { useHeader } from '@/components/header-context'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, Loader2, Trash2, CheckCircle, AlertCircle, CalendarDays } from 'lucide-react'
import { AppointmentBanner } from '@/components/appointment-banner'
import Link from 'next/link'
import { format } from 'date-fns'
import { cn, pwaFetch } from '@/lib/utils'
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

export default function HomePage() {
  const updateHeader = useHeader()
  const { user, logout, isLoading } = useAuth()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [fetchingSubscriptions, setFetchingSubscriptions] = useState(true)

  useEffect(() => {
    updateHeader({
      title: 'תור רם-אל',
      showMenu: true
    })
  }, [updateHeader])

  useEffect(() => {
    if (user) {
      fetchSubscriptions()
    }
  }, [user])

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
      } else {
        toast.error('שגיאה בביטול המנוי')
      }
    } catch (error) {
      console.error('Delete error:', error)
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
    <div className="container mx-auto px-4 py-6 pb-20 max-w-2xl">
      {/* Appointment Banner */}
      <AppointmentBanner />
      
      {/* Active Subscriptions */}
      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            ההתראות הפעילות שלי
          </h2>
        </div>

        {fetchingSubscriptions ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : subscriptions.filter(sub => sub.is_active).length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">אין לך התראות פעילות כרגע</p>
            <Button asChild>
              <Link href="/subscribe">
                <Bell className="ml-2 h-4 w-4" />
                הגדר התראה חדשה
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {subscriptions
              .filter(sub => sub.is_active)
              .map((sub) => (
                <div
                  key={sub.id}
                  className="group flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {formatSubscriptionDate(sub)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        נוצר ב-{format(new Date(sub.created_at), 'dd/MM HH:mm')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(sub.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            
            {/* Add new subscription button */}
            <div className="pt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/subscribe">
                  <Bell className="ml-2 h-4 w-4" />
                  הוסף התראה חדשה
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
