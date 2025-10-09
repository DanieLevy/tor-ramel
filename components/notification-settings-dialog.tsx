'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Settings, Mail, Smartphone, Bell, CheckCircle, AlertCircle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { usePushNotifications } from '@/hooks/use-push-notifications'

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

export function NotificationSettingsDialog() {
  const [open, setOpen] = useState(false)
  const [notificationMethod, setNotificationMethod] = useState<NotificationMethod>('email')
  const [loading, setLoading] = useState(false)
  const [testingPush, setTestingPush] = useState(false)
  
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

  // Load current preference
  useEffect(() => {
    if (open) {
      loadPreference()
    }
  }, [open])

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

  const handlePushSubscribe = async (): Promise<boolean> => {
    if (isIOS && !isPWA) {
      showIOSInstallPrompt()
      return false
    }
    
    setLoading(true)
    try {
      console.log('🚀 [Settings Dialog] Starting push subscription...')
      await subscribeToPush()
      
      // Check if subscription was actually successful
      // The subscribe function might throw or might just update state
      // We need to wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log('✅ [Settings Dialog] Push subscription successful')
      toast.success('✅ התראות Push הופעלו!')
      setLoading(false)
      return true
    } catch (error) {
      console.error('❌ [Settings Dialog] Push subscription failed:', error)
      toast.error('שגיאה בהפעלת התראות Push: ' + (error as Error).message)
      setLoading(false)
      return false
    }
  }

  const handleMethodChange = async (method: NotificationMethod) => {
    console.log('🔔 [Settings Dialog] Changing method to:', method)
    
    // If switching to push or both, need to subscribe first
    if ((method === 'push' || method === 'both') && !isPushSubscribed) {
      console.log('⚠️ [Settings Dialog] Push not subscribed, triggering subscription...')
      const subscribed = await handlePushSubscribe()
      
      // Check if subscription was successful
      if (!subscribed) {
        console.error('❌ [Settings Dialog] Push subscription failed, aborting method change')
        return
      }
    }
    
    // Save preference to backend
    setLoading(true)
    try {
      const response = await pwaFetch('/api/notifications/preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notification_method: method })
      })
      
      if (response.ok) {
        setNotificationMethod(method)
        toast.success('העדפת ההתראות נשמרה')
        
        // Dispatch custom event to notify other components
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
        toast.success('✅ התראת בדיקה נשלחה! בדוק את ההתראות שלך')
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            הגדרות התראות
          </DialogTitle>
          <DialogDescription>
            בחר איך תרצה לקבל עדכונים על תורים פנויים
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Notification Method Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">אופן התראה</label>
            
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
                      "relative p-3 rounded-lg transition-all text-right border-2 flex items-center gap-3",
                      isSelected 
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white border-purple-600" 
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600",
                      !method.available && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-2 left-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <Icon className={cn("h-5 w-5 flex-shrink-0", isSelected ? "text-white" : "text-gray-600 dark:text-gray-400")} />
                    <div className="flex-1">
                      <div className={cn("font-semibold text-sm", isSelected ? "text-white" : "text-gray-900 dark:text-gray-100")}>{method.label}</div>
                      <div className={cn("text-xs", isSelected ? "text-purple-100" : "text-gray-500 dark:text-gray-400")}>{method.desc}</div>
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
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <span className="font-semibold">התראות Push לא מופעלות</span> - הפעל כדי לקבל התראות למכשיר
                    </p>
                  </div>
                  <Button
                    onClick={handlePushSubscribe}
                    disabled={loading || pushLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    size="sm"
                  >
                    {loading || pushLoading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
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
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-green-700 dark:text-green-300">
                      <span className="font-semibold">התראות Push פעילות</span> - המכשיר מוכן לקבל התראות
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Message */}
          <div className="p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-700 dark:text-gray-300">
                <span className="font-semibold">ההגדרה נשמרת אוטומטית</span> ותחול על כל ההתראות החדשות
              </p>
            </div>
          </div>

          {/* iOS PWA Notice */}
          {isIOS && !isPWA && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    דרוש התקנת אפליקציה
                  </p>
                  <p className="text-amber-700 dark:text-amber-300">
                    התקן את האפליקציה מהדפדפן כדי לקבל התראות Push
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Test Push Notification Button */}
          {isPushSubscribed && (
            <div className="pt-2 border-t space-y-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block">
                בדיקת התראות
              </label>
              <Button
                onClick={handleTestPush}
                disabled={testingPush}
                variant="outline"
                className="w-full"
              >
                {testingPush ? (
                  <>
                    <div className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin ml-2" />
                    שולח התראת בדיקה...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 ml-2" />
                    שלח התראת Push לבדיקה
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                התראה תופיע על המסך תוך שניות
              </p>
            </div>
          )}
          
          {/* Show help if push not subscribed */}
          {!isPushSubscribed && pushSupported && (isPWA || !isIOS) && (
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                הפעל התראות Push למעלה כדי לבדוק אותן
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

