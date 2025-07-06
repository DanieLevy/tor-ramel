"use client"

import { useEffect, ReactNode, useState } from 'react'
import { useServiceWorker } from '@/hooks/use-service-worker'
import { usePWAInstall } from '@/hooks/use-pwa-install'
import { Button } from '@/components/ui/button'
import { Download, RefreshCw, Wifi, WifiOff, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface PWAProviderProps {
  children: ReactNode
}

export function PWAProvider({ children }: PWAProviderProps) {
  const { isUpdateAvailable, isOffline, skipWaiting } = useServiceWorker()
  const { isInstallable, promptInstall } = usePWAInstall()
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  // Check if install banner should be shown
  useEffect(() => {
    if (isInstallable) {
      const dismissed = localStorage.getItem('tor-ramel-install-dismissed')
      if (!dismissed) {
        setShowInstallBanner(true)
      }
    }
  }, [isInstallable])

  // Show offline status
  useEffect(() => {
    if (isOffline) {
      toast.error("אין חיבור לאינטרנט", {
        description: "אתה עובד במצב לא מקוון",
      })
    }
  }, [isOffline])

  const handleInstall = async () => {
    const { outcome } = await promptInstall()
    if (outcome === 'accepted') {
      toast.success("האפליקציה הותקנה בהצלחה!", {
        description: "כעת תוכל לגשת לאפליקציה ממסך הבית",
      })
      setShowInstallBanner(false)
      localStorage.setItem('tor-ramel-install-dismissed', 'true')
    }
  }

  const dismissInstallBanner = () => {
    setShowInstallBanner(false)
    localStorage.setItem('tor-ramel-install-dismissed', 'true')
  }

  const handleUpdate = async () => {
    await skipWaiting()
    // Reload the page after updating
    window.location.reload()
  }

  return (
    <>
      {children}

      {/* Update Available Banner */}
      {isUpdateAvailable && (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <Alert className="border-primary">
            <RefreshCw className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>עדכון חדש זמין לאפליקציה</span>
              <Button
                size="sm"
                onClick={handleUpdate}
                className="mr-4"
              >
                עדכן עכשיו
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Install Prompt */}
      {showInstallBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <Alert className="bg-primary text-primary-foreground border-primary relative">
            <Download className="h-4 w-4" />
            <Button
              size="icon"
              variant="ghost"
              onClick={dismissInstallBanner}
              className="absolute top-2 left-2 h-6 w-6 text-primary-foreground hover:text-primary-foreground/80"
            >
              <X className="h-4 w-4" />
            </Button>
            <AlertDescription className="flex items-center justify-between pl-8">
              <span>התקן את האפליקציה למסך הבית</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleInstall}
                className="mr-4"
              >
                התקן
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Offline Indicator */}
      {isOffline && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-destructive text-destructive-foreground py-2 text-center text-sm">
          <WifiOff className="inline-block h-4 w-4 ml-2" />
          עובד במצב לא מקוון
        </div>
      )}
    </>
  )
} 