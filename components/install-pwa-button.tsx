"use client"

import { Download, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePWAInstall } from '@/hooks/use-pwa-install'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function InstallPWAButton() {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall()
  
  // Don't show if already installed
  if (isInstalled) return null
  
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  
  if (isIOS) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">התקן אפליקציה</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>התקנת האפליקציה</DialogTitle>
            <DialogDescription className="text-right">
              כדי להתקין את האפליקציה במכשיר iOS:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm">לחץ על כפתור השיתוף</p>
                <Share className="h-5 w-5 mt-1 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm">גלול למטה ובחר &quot;הוסף למסך הבית&quot;</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm">לחץ על &quot;הוסף&quot; בפינה הימנית העליונה</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }
  
  if (!isInstallable) return null
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="gap-2"
      onClick={promptInstall}
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">התקן אפליקציה</span>
    </Button>
  )
} 