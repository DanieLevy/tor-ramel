"use client"

import { useEffect, useState } from 'react'

// TypeScript interface for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent

      // Detect platform
      const iosMatch = ua.match(/iPhone|iPad|iPod/)
      const androidMatch = ua.match(/Android/)
      
      setIsIOS(!!iosMatch)
      setIsAndroid(!!androidMatch)

      // Detect if running as installed app
      const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches
      const standaloneNavigator = 'standalone' in navigator && (navigator as any).standalone === true
      const iosTWA = iosMatch && !ua.match(/Safari/)
      
      const installed = !!(standaloneMedia || standaloneNavigator || iosTWA)
      
      setIsInstalled(installed)
      setIsStandalone(standaloneMedia || standaloneNavigator)
    }
  }, [])

  useEffect(() => {
    // iOS doesn't support beforeinstallprompt, check if it's iOS
    if (isIOS) {
      // Check if it's Safari
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
      if (isSafari && !(window.navigator as any).standalone) {
        setIsInstallable(true)
      }
      return
    }

    // Handle install prompt for other browsers
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
      console.log('PWA install prompt ready')
    }

    // Handle app installed
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      console.log('PWA installed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) {
      // For iOS, show instructions
      if (isIOS) {
        alert('להתקנת האפליקציה:\n1. לחץ על כפתור השיתוף\n2. בחר "הוסף למסך הבית"')
        return { outcome: 'dismissed' as const }
      }
      return { outcome: 'dismissed' as const }
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      
      setDeferredPrompt(null)
      return { outcome }
    } catch (error) {
      console.error('Error showing install prompt:', error)
      return { outcome: 'dismissed' as const }
    }
  }

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isStandalone,
    platform: isIOS ? 'ios' : isAndroid ? 'android' : 'unknown',
    promptInstall,
  }
} 