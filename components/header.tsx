"use client"

import React from 'react'
import { Menu, Sun, Moon, Search, Bell, Info, Home, Trash2, LogOut, User, Settings } from 'lucide-react'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useHeaderContext } from './header-context'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { NotificationCenter } from '@/components/notification-center'
import { NotificationSettingsContent } from '@/components/notification-settings-content'

export function Header() {
  const { config } = useHeaderContext()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const [mounted, setMounted] = React.useState(false)
  const [notificationSettingsOpen, setNotificationSettingsOpen] = React.useState(false)
  const { user, logout } = useAuth()

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Don't show header on auth pages
  if (pathname === '/login' || pathname === '/verify-otp' || pathname === '/register') {
    return null
  }

  const clearAllCache = async () => {
    try {
      toast.info('מנקה את כל הנתונים...', { duration: 2000 })

      // 1. Clear all caches (including API caches)
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log(`Deleting cache: ${cacheName}`)
            return caches.delete(cacheName)
          })
        )
      }

      // 2. Clear localStorage with specific keys
      const localStorageKeys = Object.keys(localStorage)
      localStorageKeys.forEach(key => {
        console.log(`Removing localStorage: ${key}`)
        localStorage.removeItem(key)
      })

      // 3. Clear sessionStorage
      const sessionStorageKeys = Object.keys(sessionStorage)
      sessionStorageKeys.forEach(key => {
        console.log(`Removing sessionStorage: ${key}`)
        sessionStorage.removeItem(key)
      })

      // 4. Clear all cookies more aggressively
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=")
        const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim()
        // Clear for all possible paths
        const paths = ['/', '/login', '/verify-otp', '/search', '/subscribe']
        const domains = [window.location.hostname, `.${window.location.hostname}`, '']
        
        paths.forEach(path => {
          domains.forEach(domain => {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=${domain}`
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}`
          })
        })
      })

      // 5. Clear IndexedDB
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases?.() || []
        await Promise.all(
          databases.map(db => {
            if (db.name) {
              console.log(`Deleting IndexedDB: ${db.name}`)
              return indexedDB.deleteDatabase(db.name)
            }
          })
        )
      }

      // 6. Clear WebSQL (for older browsers)
      if ('openDatabase' in window) {
        try {
          const db = (window as any).openDatabase('', '', '', '')
          db.transaction((tx: any) => {
            tx.executeSql('DROP TABLE IF EXISTS cache')
          })
        } catch (e) {
          // WebSQL might not be available
        }
      }

      // 7. Unregister all service workers and clear their caches
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(
          registrations.map(async (registration) => {
            console.log(`Unregistering SW: ${registration.scope}`)
            // Send message to SW to clear its internal caches
            if (registration.active) {
              registration.active.postMessage({ type: 'CLEAR_ALL_CACHES' })
            }
            return registration.unregister()
          })
        )
      }

      // 8. Clear any custom storage (iOS specific)
      if ('localStorage' in window && window.localStorage) {
        // Force clear iOS WebKit data
        try {
          (window as any).webkit?.messageHandlers?.clearData?.postMessage('clear')
        } catch (e) {
          // Not in iOS WebView
        }
      }

      // 9. Clear push subscriptions
      if ('PushManager' in window && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready
          const subscription = await registration.pushManager.getSubscription()
          if (subscription) {
            await subscription.unsubscribe()
          }
        } catch (e) {
          // Push not available
        }
      }

      // 10. Clear any notification permissions
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'notifications' as PermissionName })
          if (result.state === 'granted') {
            // Note: Can't programmatically revoke, but we've cleared the subscription
          }
        } catch (e) {
          // Permissions API not available
        }
      }

      // 11. Force clear auth-related data
      const authPaths = [
        'tor-ramel-user',
        'tor-ramel-auth',
        'tor-ramel-auth-expiry',
        'tor-ramel-search-cache'
      ]
      authPaths.forEach(key => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      })

      toast.success('כל הנתונים נוקו בהצלחה! האפליקציה תיטען מחדש...', { duration: 2000 })
      
      // Force hard reload with cache bypass
      setTimeout(() => {
        // Try multiple reload methods for maximum compatibility
        if ('location' in window) {
          // Method 1: Hard reload
          window.location.href = window.location.origin
          // Method 2: Force reload (backup)
          setTimeout(() => {
            window.location.reload()
          }, 100)
        }
      }, 2000)
    } catch (error) {
      console.error('Error clearing cache:', error)
      toast.error('שגיאה בניקוי הנתונים - נסה שוב')
    }
  }

  // Get username without @gmail.com
  const username = user?.email?.split('@')[0] || ''

  return (
    <header 
      className="sticky top-0 z-50 w-full glass-nav transition-all duration-300"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)'
      }}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Right section (RTL) - App Icon & Title */}
          <div className="flex items-center gap-3 mr-2">
            <div className="relative">
              <Image 
                src="/icons/icon-96x96.png" 
                alt="תור רם-אל" 
                width={36}
                height={36}
                className="rounded-xl shadow-md ring-1 ring-white/20"
              />
              {/* Subtle glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
            </div>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">{config.title}</h1>
          </div>

          {/* Center section - empty for spacing */}
          <div className="flex-1" />

          {/* Left section (RTL) - Hamburger Menu, User & Theme Toggle */}
          <div className="flex items-center gap-1.5">
            {/* Theme Toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
                className="glass-button h-9 w-9 hover:scale-105 active:scale-95 transition-all"
              >
                {theme === 'dark' ? (
                  <Sun className="h-[18px] w-[18px] transition-all" />
                ) : (
                  <Moon className="h-[18px] w-[18px] transition-all" />
                )}
              </Button>
            )}
            
            {/* Notification Center - Only show for authenticated users */}
            {user && <NotificationCenter />}
            
            {/* User dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 glass-button px-2.5 h-9 hover:scale-105 active:scale-95 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{username}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-52 glass-modal p-1.5 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
                >
                  <div className="px-3 py-2.5 mb-1 rounded-xl bg-muted/30">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                  </div>
                  <DropdownMenuItem 
                    className="flex flex-row-reverse text-right gap-3 py-2.5 px-3 cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 focus:bg-white/10 dark:focus:bg-white/5 transition-colors rounded-xl"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4 opacity-60" />
                    <span className="flex-1">התנתק</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Hamburger Menu */}
            {config.showMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="glass-button h-9 w-9 hover:scale-105 active:scale-95 transition-all"
                    aria-label="פתח תפריט"
                  >
                    <Menu className="h-[18px] w-[18px]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-52 glass-modal p-1.5 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
                >
                  <DropdownMenuItem className="flex flex-row-reverse text-right gap-3 py-2.5 px-3 cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 focus:bg-white/10 dark:focus:bg-white/5 transition-colors rounded-xl" asChild>
                    <Link href="/">
                      <Home className="h-4 w-4 opacity-60" />
                      <span className="flex-1">דף הבית</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-row-reverse text-right gap-3 py-2.5 px-3 cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 focus:bg-white/10 dark:focus:bg-white/5 transition-colors rounded-xl" asChild>
                    <Link href="/search">
                      <Search className="h-4 w-4 opacity-60" />
                      <span className="flex-1">חיפוש תורים</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-row-reverse text-right gap-3 py-2.5 px-3 cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 focus:bg-white/10 dark:focus:bg-white/5 transition-colors rounded-xl" asChild>
                    <Link href="/subscribe">
                      <Bell className="h-4 w-4 opacity-60" />
                      <span className="flex-1">התראות</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="flex flex-row-reverse text-right gap-3 py-2.5 px-3 cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 focus:bg-white/10 dark:focus:bg-white/5 transition-colors rounded-xl"
                    onClick={() => setNotificationSettingsOpen(true)}
                  >
                    <Settings className="h-4 w-4 opacity-60" />
                    <span className="flex-1">הגדרות התראות</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-row-reverse text-right gap-3 py-2.5 px-3 cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 focus:bg-white/10 dark:focus:bg-white/5 transition-colors rounded-xl" asChild>
                    <Link href="/notifications">
                      <Trash2 className="h-4 w-4 opacity-60" />
                      <span className="flex-1">זמנים שהתעלמתי</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1.5 bg-white/10" />
                  <DropdownMenuItem className="flex flex-row-reverse text-right gap-3 py-2.5 px-3 cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 focus:bg-white/10 dark:focus:bg-white/5 transition-colors rounded-xl" asChild>
                    <Link href="/about">
                      <Info className="h-4 w-4 opacity-60" />
                      <span className="flex-1">אודות</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1.5 bg-white/10" />
                  <DropdownMenuItem 
                    className="flex flex-row-reverse text-right gap-3 py-2.5 px-3 cursor-pointer hover:bg-destructive/20 focus:bg-destructive/20 transition-colors rounded-xl text-destructive"
                    onClick={clearAllCache}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="flex-1">איפוס מלא</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
      
      {/* Notification Settings Dialog */}
      <Dialog open={notificationSettingsOpen} onOpenChange={setNotificationSettingsOpen}>
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
          <NotificationSettingsContent isOpen={notificationSettingsOpen} />
        </DialogContent>
      </Dialog>
    </header>
  )
} 