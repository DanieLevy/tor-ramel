"use client"

import { useEffect, ReactNode } from 'react'
import { useServiceWorker } from '@/hooks/use-service-worker'
import { usePWAInstall } from '@/hooks/use-pwa-install'
import { Button } from '@/components/ui/button'
import { Download, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface PWAProviderProps {
  children: ReactNode
}

export function PWAProvider({ children }: PWAProviderProps) {
  const { isUpdateAvailable, isOffline, skipWaiting } = useServiceWorker()
  const { isInstallable, promptInstall } = usePWAInstall()

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
    }
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
                onClick={skipWaiting}
                className="mr-4"
              >
                עדכן עכשיו
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Install Prompt */}
      {isInstallable && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <Alert className="bg-primary text-primary-foreground border-primary">
            <Download className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
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