"use client"

import { useState, useEffect, useCallback } from 'react'

interface SWVersion {
  version: string
  buildTime: string
}

export function useSwUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<SWVersion | null>(null)
  const [newVersion, setNewVersion] = useState<SWVersion | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    let registration: ServiceWorkerRegistration | null = null

    // Check for updates periodically (every 10 minutes)
    const checkForUpdates = async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        registration = reg
        
        // Try to update
        await reg.update()
        
        console.log('🔄 [SW Update] Checked for updates')
      } catch (error) {
        console.error('❌ [SW Update] Error checking for updates:', error)
      }
    }

    // Listen for SW messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        console.log('🎉 [SW Update] New version available!', event.data)
        setNewVersion({
          version: event.data.version,
          buildTime: event.data.buildTime
        })
        setUpdateAvailable(true)
      }
    }

    // Listen for controller change (new SW activated)
    const handleControllerChange = () => {
      console.log('🔄 [SW Update] Controller changed, reloading page...')
      window.location.reload()
    }

    // Get current SW version
    const getCurrentVersion = async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        if (reg.active) {
          const messageChannel = new MessageChannel()
          
          messageChannel.port1.onmessage = (event) => {
            if (event.data) {
              console.log('📊 [SW Update] Current version:', event.data)
              setCurrentVersion({
                version: event.data.version,
                buildTime: event.data.buildTime
              })
            }
          }
          
          reg.active.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2])
        }
      } catch (error) {
        console.error('❌ [SW Update] Error getting version:', error)
      }
    }

    // Check for updates on mount
    checkForUpdates()
    getCurrentVersion()

    // Check for updates periodically
    const interval = setInterval(checkForUpdates, 10 * 60 * 1000) // Every 10 minutes

    // Listen for SW updates
    navigator.serviceWorker.addEventListener('message', handleMessage)
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    // Check for waiting service worker on load
    navigator.serviceWorker.ready.then(reg => {
      registration = reg
      
      if (reg.waiting) {
        console.log('⚠️ [SW Update] Service worker waiting to activate')
        setUpdateAvailable(true)
      }

      // Listen for new SW installing
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        console.log('🆕 [SW Update] New service worker installing...')

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✅ [SW Update] New service worker installed, update available!')
              setUpdateAvailable(true)
            }
          })
        }
      })
    })

    return () => {
      clearInterval(interval)
      navigator.serviceWorker.removeEventListener('message', handleMessage)
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  const applyUpdate = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    setIsUpdating(true)

    try {
      const reg = await navigator.serviceWorker.ready

      if (reg.waiting) {
        console.log('📤 [SW Update] Telling waiting SW to skip waiting...')
        
        // Tell the waiting service worker to skip waiting
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })

        // Wait for controller change, then reload
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('🔄 [SW Update] New service worker activated, reloading...')
          window.location.reload()
        })
      } else {
        console.log('ℹ️ [SW Update] No waiting service worker, reloading anyway...')
        window.location.reload()
      }
    } catch (error) {
      console.error('❌ [SW Update] Error applying update:', error)
      setIsUpdating(false)
      // Reload anyway
      window.location.reload()
    }
  }, [])

  return {
    updateAvailable,
    isUpdating,
    currentVersion,
    newVersion,
    applyUpdate
  }
}

