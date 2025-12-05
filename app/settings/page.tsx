'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Save, CheckCircle, AlertCircle, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import {
  NotificationMethodSelector,
  NotificationTypesTogles,
  FrequencySettings,
  DeliverySchedule,
  TestNotifications
} from '@/components/settings'

// Types
type NotificationMethod = 'email' | 'push' | 'both'

interface UserPreferences {
  default_notification_method: NotificationMethod
  hot_alerts_enabled: boolean
  weekly_digest_enabled: boolean
  expiry_reminders_enabled: boolean
  inactivity_alerts_enabled: boolean
  proactive_notifications_enabled: boolean
  max_notifications_per_day: number
  notification_cooldown_minutes: number
  batch_notifications: boolean
  batch_interval_hours: number
  preferred_delivery_start: string
  preferred_delivery_end: string
  quiet_hours_start: string
  quiet_hours_end: string
}

const DEFAULT_PREFERENCES: UserPreferences = {
  default_notification_method: 'email',
  hot_alerts_enabled: true,
  weekly_digest_enabled: true,
  expiry_reminders_enabled: true,
  inactivity_alerts_enabled: true,
  proactive_notifications_enabled: true,
  max_notifications_per_day: 10,
  notification_cooldown_minutes: 30,
  batch_notifications: false,
  batch_interval_hours: 4,
  preferred_delivery_start: '08:00',
  preferred_delivery_end: '21:00',
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
}

// Helper function for authenticated fetch
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  })
}

export default function SettingsPage() {
  const router = useRouter()
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [originalPreferences, setOriginalPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // Push notifications hook
  const { 
    isSupported: pushSupported, 
    isSubscribed: isPushSubscribed,
    subscribe: subscribeToPush,
    isLoading: pushLoading
  } = usePushNotifications()

  // Check if PWA (for push availability)
  const isPWA = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  )
  const isIOS = typeof window !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const pushAvailable = pushSupported && (isPWA || !isIOS) && isPushSubscribed

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await authFetch('/api/notifications/preferences')
        if (response.ok) {
          const data = await response.json()
          if (data.preferences) {
            const prefs = {
              ...DEFAULT_PREFERENCES,
              ...data.preferences,
              default_notification_method: data.preferences.default_notification_method || data.notification_method || 'email'
            }
            setPreferences(prefs)
            setOriginalPreferences(prefs)
          }
        } else if (response.status === 401) {
          router.push('/login?from=/settings')
          return
        }
      } catch (error) {
        console.error('Failed to load preferences:', error)
        toast.error('שגיאה בטעינת ההגדרות')
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [router])

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(preferences) !== JSON.stringify(originalPreferences)
    setHasChanges(changed)
    if (changed) {
      setSaveStatus('idle')
    }
  }, [preferences, originalPreferences])

  // Handle preference changes
  const handleChange = useCallback((key: string, value: unknown) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  // Handle notification method change (may need to enable push)
  const handleMethodChange = async (method: NotificationMethod) => {
    // If switching to push or both, ensure push is enabled
    if ((method === 'push' || method === 'both') && !isPushSubscribed) {
      try {
        await subscribeToPush()
        toast.success('התראות Push הופעלו בהצלחה!')
      } catch (error) {
        toast.error('שגיאה בהפעלת Push: ' + (error as Error).message)
        return
      }
    }
    
    handleChange('default_notification_method', method)
  }

  // Save preferences
  const handleSave = async () => {
    setSaving(true)
    setSaveStatus('idle')

    try {
      // Build update object with only changed fields
      const updates: Record<string, unknown> = {}
      
      for (const [key, value] of Object.entries(preferences)) {
        if (value !== originalPreferences[key as keyof UserPreferences]) {
          // Map the field names for API
          if (key === 'default_notification_method') {
            updates['notification_method'] = value
          } else {
            updates[key] = value
          }
        }
      }

      if (Object.keys(updates).length === 0) {
        toast.info('אין שינויים לשמור')
        setSaving(false)
        return
      }

      const response = await authFetch('/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(updates)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setOriginalPreferences(preferences)
        setHasChanges(false)
        setSaveStatus('saved')
        toast.success('ההגדרות נשמרו בהצלחה!')
        
        // Reset saved status after 3 seconds
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
        toast.error(data.error || 'שגיאה בשמירת ההגדרות')
      }
    } catch (error) {
      console.error('Save error:', error)
      setSaveStatus('error')
      toast.error('שגיאה בשמירת ההגדרות')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">טוען הגדרות...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="rounded-full"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  הגדרות
                </h1>
                <p className="text-xs text-muted-foreground">ניהול התראות והעדפות</p>
              </div>
            </div>
            
            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={cn(
                "transition-all",
                hasChanges && "animate-pulse"
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                  נשמר!
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <AlertCircle className="h-4 w-4 ml-2 text-red-500" />
                  שגיאה
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2" />
                  שמור
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Push status banner */}
        {!isPushSubscribed && pushSupported && (
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-sm text-foreground mb-1">
                  התראות Push לא מופעלות
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {isIOS && !isPWA 
                    ? 'התקן את האפליקציה מהדפדפן כדי לקבל התראות Push'
                    : 'הפעל התראות Push כדי לקבל עדכונים ישירות למכשיר'}
                </p>
                <Button
                  size="sm"
                  onClick={() => subscribeToPush()}
                  disabled={pushLoading}
                >
                  {pushLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      מפעיל...
                    </>
                  ) : (
                    'הפעל התראות Push'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Section: Notification Method */}
        <section className="space-y-4">
          <NotificationMethodSelector
            value={preferences.default_notification_method}
            onChange={handleMethodChange}
            disabled={saving}
            pushAvailable={pushAvailable || isPushSubscribed}
          />
        </section>

        <hr className="border-black/5 dark:border-white/5" />

        {/* Section: Notification Types */}
        <section className="space-y-4">
          <NotificationTypesTogles
            values={{
              hot_alerts_enabled: preferences.hot_alerts_enabled,
              weekly_digest_enabled: preferences.weekly_digest_enabled,
              expiry_reminders_enabled: preferences.expiry_reminders_enabled,
              inactivity_alerts_enabled: preferences.inactivity_alerts_enabled,
              proactive_notifications_enabled: preferences.proactive_notifications_enabled,
            }}
            onChange={handleChange}
            disabled={saving}
          />
        </section>

        <hr className="border-black/5 dark:border-white/5" />

        {/* Section: Frequency Settings */}
        <section className="space-y-4">
          <FrequencySettings
            values={{
              max_notifications_per_day: preferences.max_notifications_per_day,
              notification_cooldown_minutes: preferences.notification_cooldown_minutes,
              batch_notifications: preferences.batch_notifications,
              batch_interval_hours: preferences.batch_interval_hours,
            }}
            onChange={handleChange}
            disabled={saving}
          />
        </section>

        <hr className="border-black/5 dark:border-white/5" />

        {/* Section: Delivery Schedule */}
        <section className="space-y-4">
          <DeliverySchedule
            values={{
              preferred_delivery_start: preferences.preferred_delivery_start,
              preferred_delivery_end: preferences.preferred_delivery_end,
              quiet_hours_start: preferences.quiet_hours_start,
              quiet_hours_end: preferences.quiet_hours_end,
            }}
            onChange={handleChange}
            disabled={saving}
          />
        </section>

        <hr className="border-black/5 dark:border-white/5" />

        {/* Section: Test Notifications */}
        <section className="space-y-4">
          <TestNotifications
            notificationMethod={preferences.default_notification_method}
            pushAvailable={isPushSubscribed}
          />
        </section>

        {/* Floating save button for mobile */}
        {hasChanges && (
          <div className="fixed bottom-20 left-4 right-4 max-w-2xl mx-auto z-50">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full shadow-lg"
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  שומר שינויים...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2" />
                  שמור שינויים
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
