'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, CheckCircle, AlertCircle, Settings, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import {
  NotificationMethodSelector,
  NotificationTypesTogles,
  FrequencySettings,
  QuietHoursSettings,
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
  quiet_hours_start: string | null  // null = not set (no quiet hours)
  quiet_hours_end: string | null    // null = not set (no quiet hours)
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
  quiet_hours_start: null,  // No quiet hours by default
  quiet_hours_end: null,    // No quiet hours by default
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
  const [loading, setLoading] = useState(true)
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set())
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set())
  const [errorFields, setErrorFields] = useState<Set<string>>(new Set())
  
  // Debounce timer refs
  const saveTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())

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
          }
        } else if (response.status === 401) {
          router.push('/login?from=/settings')
          return
        }
      } catch (error) {
        console.error('Failed to load preferences:', error)
        toast.error('שגיאה בטעינת ההגדרות', {
          description: 'נסה לרענן את הדף',
          action: {
            label: 'רענן',
            onClick: () => window.location.reload()
          }
        })
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [router])

  // Auto-save a single field
  const saveField = useCallback(async (key: string, value: unknown) => {
    // Clear any existing timer for this field
    const existingTimer = saveTimers.current.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set saving state
    setSavingFields(prev => new Set(prev).add(key))
    setSavedFields(prev => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    setErrorFields(prev => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })

    try {
      // Map field name for API
      const updates: Record<string, unknown> = {}
      if (key === 'default_notification_method') {
        updates['notification_method'] = value
      } else {
        updates[key] = value
      }

      const response = await authFetch('/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(updates)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Show success feedback
        setSavedFields(prev => new Set(prev).add(key))
        
        // Clear success indicator after 2 seconds
        setTimeout(() => {
          setSavedFields(prev => {
            const next = new Set(prev)
            next.delete(key)
            return next
          })
        }, 2000)
      } else {
        // Show error
        setErrorFields(prev => new Set(prev).add(key))
        toast.error('שגיאה בשמירה', {
          description: data.error || 'לא ניתן לשמור את השינוי',
          action: {
            label: 'נסה שוב',
            onClick: () => saveField(key, value)
          }
        })
      }
    } catch (error) {
      console.error('Save error:', error)
      setErrorFields(prev => new Set(prev).add(key))
      toast.error('שגיאה בשמירה', {
        description: 'בדוק את החיבור לאינטרנט',
        action: {
          label: 'נסה שוב',
          onClick: () => saveField(key, value)
        }
      })
    } finally {
      setSavingFields(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }, [])

  // Handle preference changes with debounced auto-save
  const handleChange = useCallback((key: string, value: unknown) => {
    // Update state immediately for responsive UI
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))

    // Clear any existing timer for this field
    const existingTimer = saveTimers.current.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer for debounced save (300ms delay)
    const timer = setTimeout(() => {
      saveField(key, value)
    }, 300)
    
    saveTimers.current.set(key, timer)
  }, [saveField])

  // Handle notification method change (may need to enable push)
  const handleMethodChange = async (method: NotificationMethod) => {
    // If switching to push or both, ensure push is enabled
    if ((method === 'push' || method === 'both') && !isPushSubscribed) {
      try {
        await subscribeToPush()
        toast.success('התראות Push הופעלו בהצלחה!')
      } catch (error) {
        toast.error('שגיאה בהפעלת Push', {
          description: (error as Error).message
        })
        return
      }
    }
    
    // Update and save immediately (no debounce for method change)
    setPreferences(prev => ({
      ...prev,
      default_notification_method: method
    }))
    saveField('default_notification_method', method)
  }

  // Cleanup timers on unmount
  useEffect(() => {
    const timersRef = saveTimers.current
    return () => {
      timersRef.forEach(timer => clearTimeout(timer))
    }
  }, [])

  // Get field status for visual feedback
  const getFieldStatus = (key: string): 'idle' | 'saving' | 'saved' | 'error' => {
    if (savingFields.has(key)) return 'saving'
    if (savedFields.has(key)) return 'saved'
    if (errorFields.has(key)) return 'error'
    return 'idle'
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
    <div className="min-h-full bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
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
                <p className="text-xs text-muted-foreground">שינויים נשמרים אוטומטית</p>
              </div>
            </div>
            
            {/* Auto-save indicator */}
            <div className="flex items-center gap-2">
              {savingFields.size > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>שומר...</span>
                </div>
              )}
              {savedFields.size > 0 && savingFields.size === 0 && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>נשמר</span>
                </div>
              )}
            </div>
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
            disabled={savingFields.has('default_notification_method')}
            pushAvailable={pushAvailable || isPushSubscribed}
            status={getFieldStatus('default_notification_method')}
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
            getFieldStatus={getFieldStatus}
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
            getFieldStatus={getFieldStatus}
          />
        </section>

        <hr className="border-black/5 dark:border-white/5" />

        {/* Section: Quiet Hours Only (removed preferred hours) */}
        <section className="space-y-4">
          <QuietHoursSettings
            values={{
              quiet_hours_start: preferences.quiet_hours_start,
              quiet_hours_end: preferences.quiet_hours_end,
            }}
            onChange={handleChange}
            getFieldStatus={getFieldStatus}
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
      </div>
    </div>
  )
}
