"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { RefreshCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Version changelog - update this with each release
const CHANGELOG = {
  '2025-01-29-v4.0': {
    date: '29 בינואר 2025',
    changes: [
      '🔐 מערכת הזדהות פשוטה יותר - תישארו מחוברים לשנה שלמה',
      '🚀 ביצועים משופרים ללא רענון טוקנים אוטומטי',
      '📧 תבנית אימייל חדשה ומותאמת למובייל',
      '🎨 עיצוב מונוכרומטי נקי יותר בהתראות'
    ]
  },
  '2025-01-29-v3.16': {
    date: '29 בינואר 2025',
    changes: [
      '🔧 תיקון בעיות הידרציה בדף המנויים',
      '📱 שיפורי PWA'
    ]
  }
}

export function SWUpdateNotification() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [newVersion, setNewVersion] = useState<string>('')
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) return

    // Listen for service worker updates
    const checkForUpdates = async () => {
      const registration = await navigator.serviceWorker.ready
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is ready to activate
            setWaitingWorker(newWorker)
            
            // Extract version from SW
            // For now, we'll use the latest version
            const latestVersion = Object.keys(CHANGELOG)[0]
            setNewVersion(latestVersion)
            setShowUpdatePrompt(true)
          }
        })
      })
    }

    checkForUpdates()

    // Also check on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        navigator.serviceWorker?.ready.then(reg => reg.update())
      }
    })

    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', () => {})
    }
  }, [])

  const handleUpdate = () => {
    if (!waitingWorker) return

    // Tell waiting service worker to activate
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })

    // Reload once the new service worker takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }

  const handleShowChangelog = () => {
    setShowChangelog(true)
  }

  const handleDismiss = () => {
    setShowUpdatePrompt(false)
    // Store dismissal in localStorage with version
    localStorage.setItem('sw-update-dismissed', newVersion)
  }

  // Don't show if already dismissed this version
  useEffect(() => {
    const dismissed = localStorage.getItem('sw-update-dismissed')
    if (dismissed === newVersion) {
      setShowUpdatePrompt(false)
    }
  }, [newVersion])

  return (
    <>
      {/* Update prompt banner */}
      {showUpdatePrompt && !showChangelog && (
        <div className="fixed bottom-20 right-4 left-4 md:left-auto md:w-96 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  עדכון חדש זמין!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  גרסה {newVersion} מוכנה להתקנה
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleShowChangelog}
                    variant="outline"
                  >
                    מה חדש?
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUpdate}
                  >
                    עדכן עכשיו
                  </Button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Changelog modal */}
      <Dialog open={showChangelog} onOpenChange={setShowChangelog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">מה חדש בגרסה {newVersion}?</DialogTitle>
            <DialogDescription className="text-right">
              {newVersion && CHANGELOG[newVersion as keyof typeof CHANGELOG]?.date}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {newVersion && CHANGELOG[newVersion as keyof typeof CHANGELOG]?.changes.map((change, idx) => (
              <div key={idx} className="text-sm text-right text-gray-700 dark:text-gray-300">
                {change}
              </div>
            ))}
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={() => {
              setShowChangelog(false)
              handleUpdate()
            }}>
              עדכן עכשיו
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowChangelog(false)
                setShowUpdatePrompt(true)
              }}
            >
              אחר כך
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 