'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mail, Smartphone, Bell, CheckCircle, AlertCircle, Sparkles, Flame } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { Switch } from '@/components/ui/switch'

type NotificationMethod = 'email' | 'push' | 'both'

async function pwaFetch(url: string, options: RequestInit = {}) {
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
  })
}

interface NotificationSettingsContentProps {
  isOpen?: boolean
}

export function NotificationSettingsContent({ isOpen = true }: NotificationSettingsContentProps) {
  const [notificationMethod, setNotificationMethod] = useState<NotificationMethod>('email')
  const [hotAlertsEnabled, setHotAlertsEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [testingPush, setTestingPush] = useState(false)
  const [savingHotAlerts, setSavingHotAlerts] = useState(false)
  
  // Push notifications hook
  const { 
    isSupported: pushSupported, 
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

  // Load current preference
  useEffect(() => {
    if (isOpen) {
      loadPreference()
      loadUserPreferences()
    }
  }, [isOpen])

  const loadPreference = async () => {
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
      console.error('Failed to load notification preference:', error)
    }
  }

  const loadUserPreferences = async () => {
    try {
      const response = await pwaFetch('/api/user/preferences', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.preferences?.hot_alerts_enabled !== undefined) {
          setHotAlertsEnabled(data.preferences.hot_alerts_enabled)
        }
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error)
    }
  }

  const handleHotAlertsToggle = async (enabled: boolean) => {
    setSavingHotAlerts(true)
    try {
      const response = await pwaFetch('/api/user/preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hot_alerts_enabled: enabled })
      })
      
      if (response.ok) {
        setHotAlertsEnabled(enabled)
        toast.success(enabled ? 'התראות דחופות הופעלו' : 'התראות דחופות כובו')
      } else {
        toast.error('שגיאה בשמירת העדפות')
      }
    } catch (error) {
      console.error('Failed to save hot alerts preference:', error)
      toast.error('שגיאה בשמירת העדפות')
    } finally {
      setSavingHotAlerts(false)
    }
  }

  const handlePushSubscribe = async (): Promise<boolean> => {
    if (isIOS && !isPWA) {
      showIOSInstallPrompt()
      return false
    }
    
    setLoading(true)
    try {
      await subscribeToPush()
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success('✅ התראות Push הופעלו!')
      setLoading(false)
      return true
    } catch (error) {
      console.error('Push subscription failed:', error)
      toast.error('שגיאה בהפעלת התראות Push: ' + (error as Error).message)
      setLoading(false)
      return false
    }
  }

  const handleMethodChange = async (method: NotificationMethod) => {
    if ((method === 'push' || method === 'both') && !isPushSubscribed) {
      const subscribed = await handlePushSubscribe()
      if (!subscribed) return
    }
    
    setLoading(true)
    try {
      const response = await pwaFetch('/api/notifications/preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_method: method })
      })
      
      if (response.ok) {
        setNotificationMethod(method)
        toast.success('העדפת ההתראות נשמרה')
        window.dispatchEvent(new CustomEvent('notificationPreferenceChanged', { 
          detail: { notificationMethod: method } 
        }))
      } else {
        const error = await response.json()
        toast.error(error.message || 'שגיאה בשמירת העדפות')
      }
    } catch (error) {
      console.error('Failed to save notification preference:', error)
      toast.error('שגיאה בשמירת העדפות')
    } finally {
      setLoading(false)
    }
  }

  const handleTestPush = async () => {
    setTestingPush(true)
    try {
      const response = await pwaFetch('/api/push/test', {
        method: 'POST',
        credentials: 'include'
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        toast.success('✅ התראת בדיקה נשלחה!')
      } else {
        toast.error('❌ שגיאה בשליחת התראת בדיקה: ' + (result.error || result.details))
      }
    } catch (error) {
      console.error('Failed to send test push:', error)
      toast.error('שגיאה בשליחת התראת בדיקה')
    } finally {
      setTestingPush(false)
    }
  }

  return (
    <div className="space-y-4 py-2">
      {/* Notification Method Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground">אופן התראה</label>
        
        <div className="grid grid-cols-1 gap-2">
          {[
            { value: 'email' as NotificationMethod, icon: Mail, label: 'מייל', desc: 'התראות בדוא״ל', available: true },
            { value: 'push' as NotificationMethod, icon: Smartphone, label: 'Push', desc: 'התראות למכשיר', available: pushSupported && (isPWA || !isIOS) },
            { value: 'both' as NotificationMethod, icon: Bell, label: 'שניהם', desc: 'מייל + Push', available: pushSupported && (isPWA || !isIOS) }
          ].map((method) => {
            const isSelected = notificationMethod === method.value
            const Icon = method.icon
            return (
              <button
                key={method.value}
                onClick={() => method.available && !loading && handleMethodChange(method.value)}
                disabled={!method.available || loading || pushLoading}
                className={cn(
                  "relative p-3 rounded-xl transition-all text-right border flex items-center gap-3",
                  isSelected 
                    ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white" 
                    : "bg-black/5 dark:bg-white/5 border-transparent hover:bg-black/10 dark:hover:bg-white/10",
                  !method.available && "opacity-40 cursor-not-allowed"
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 left-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                )}
                <Icon className={cn("h-5 w-5 flex-shrink-0", isSelected ? "text-white dark:text-black" : "text-muted-foreground")} />
                <div className="flex-1">
                  <div className={cn("font-semibold text-sm", isSelected ? "text-white dark:text-black" : "text-foreground")}>{method.label}</div>
                  <div className={cn("text-xs", isSelected ? "text-white/70 dark:text-black/70" : "text-muted-foreground")}>{method.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Push Subscription Status */}
      {pushSupported && (isPWA || !isIOS) && (
        <div className="space-y-2">
          {!isPushSubscribed ? (
            <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-200/50 dark:border-orange-800/50">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  <span className="font-semibold">התראות Push לא מופעלות</span>
                </p>
              </div>
              <Button
                onClick={handlePushSubscribe}
                disabled={loading || pushLoading}
                className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90"
                size="sm"
              >
                {loading || pushLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin ml-2" />
                    מפעיל...
                  </>
                ) : (
                  <>
                    <Smartphone className="h-4 w-4 ml-2" />
                    הפעל התראות Push
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="p-3 bg-green-500/10 rounded-xl border border-green-200/50 dark:border-green-800/50">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-700 dark:text-green-300">
                  <span className="font-semibold">התראות Push פעילות</span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* iOS PWA Notice */}
      {isIOS && !isPWA && (
        <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-200/50 dark:border-orange-800/50">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-foreground mb-1">דרוש התקנת אפליקציה</p>
              <p className="text-muted-foreground">התקן מהדפדפר כדי לקבל התראות Push</p>
            </div>
          </div>
        </div>
      )}

      {/* Hot Alerts Toggle */}
      <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-2">
        <div className="flex items-center justify-between p-3 bg-orange-500/5 rounded-xl border border-orange-200/30 dark:border-orange-800/30">
          <div className="flex items-start gap-2">
            <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">התראות דחופות</p>
              <p className="text-xs text-muted-foreground">
                קבל התראה מיידית כשמתפנה תור היום או מחר
              </p>
            </div>
          </div>
          <Switch
            checked={hotAlertsEnabled}
            onCheckedChange={handleHotAlertsToggle}
            disabled={savingHotAlerts}
            aria-label="Toggle hot alerts"
          />
        </div>
      </div>

      {/* Test Push Button */}
      {isPushSubscribed && (
        <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-2">
          <Button
            onClick={handleTestPush}
            disabled={testingPush}
            variant="outline"
            className="w-full rounded-xl"
            size="sm"
          >
            {testingPush ? (
              <>
                <div className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin ml-2" />
                שולח...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 ml-2" />
                שלח התראת בדיקה
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

