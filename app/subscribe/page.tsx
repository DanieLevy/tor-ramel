"use client"

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { format } from 'date-fns'
import { pwaFetch } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { NotificationSettingsDialog } from '@/components/notification-settings-dialog'
import {
  SubscriptionStats,
  SubscriptionForm,
  ActiveSubscriptionsList,
  CompletedSubscriptionsList,
  EditSubscriptionDialog,
  type Subscription,
  type NotificationMethod,
  type DateMode,
  type DateRange
} from '@/components/subscribe'

function SubscribePage() {
  useAuth() // Auth context is used for authentication state
  
  // Core state
  const [mounted, setMounted] = useState(false)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingSubscriptions, setFetchingSubscriptions] = useState(true)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined })
  const [dateMode, setDateMode] = useState<DateMode>('single')
  const [notificationMethod, setNotificationMethod] = useState<NotificationMethod>('email')
  
  // Edit modal state
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  
  // Device detection state
  const [useNativePicker, setUseNativePicker] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  // Push notifications hook - used by NotificationSettingsDialog
  usePushNotifications()

  // Initialization effect
  useEffect(() => {
    setMounted(true)
    
    // Detect touch device and iOS after mount to avoid hydration mismatch
    const touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const iosDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    
    setIsTouchDevice(touchDevice)
    
    // Default to native picker on iOS devices
    if (iosDevice) {
      setUseNativePicker(true)
    }
  }, [])

  // Fetch data on mount
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

  const handleDelete = async (id: string) => {
    setDeletingIds(prev => new Set(prev).add(id))
    
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
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
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
    }
  }

  // Computed values
  const activeSubscriptions = subscriptions.filter(s => s.is_active)
  const completedSubscriptions = subscriptions.filter(s => !s.is_active)

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24">
      <div className="container max-w-lg mx-auto px-4 py-4 space-y-5">
        
        {/* Header */}
        <div className="space-y-3">
          <div className="text-center py-2 relative">
            {/* Settings Button */}
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
            <SubscriptionStats 
              activeCount={activeSubscriptions.length} 
              completedCount={completedSubscriptions.length} 
            />
          )}
        </div>

        {/* Subscription Form */}
        <SubscriptionForm
          mounted={mounted}
          dateMode={dateMode}
          selectedDate={selectedDate}
          dateRange={dateRange}
          loading={loading}
          isTouchDevice={isTouchDevice}
          useNativePicker={useNativePicker}
          onDateModeChange={setDateMode}
          onSelectedDateChange={setSelectedDate}
          onDateRangeChange={setDateRange}
          onNativePickerToggle={() => setUseNativePicker(!useNativePicker)}
          onSubmit={handleSubscribe}
        />

        {/* Active Subscriptions */}
        {!fetchingSubscriptions && (
          <ActiveSubscriptionsList
            subscriptions={activeSubscriptions}
            allSubscriptions={subscriptions}
            mounted={mounted}
            deletingIds={deletingIds}
            onEdit={setEditingSubscription}
            onDelete={handleDelete}
          />
        )}

        {/* Completed Subscriptions */}
        {!fetchingSubscriptions && (
          <CompletedSubscriptionsList
            subscriptions={completedSubscriptions}
            mounted={mounted}
            deletingIds={deletingIds}
            onDelete={handleDelete}
          />
        )}

        {/* Empty State */}
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
