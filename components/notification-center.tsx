'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Bell, Check, CheckCheck, Trash2, X, Sparkles, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn, pwaFetch } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useHaptics } from '@/hooks/use-haptics'
import { setAppBadge, clearAppBadge, isBadgeSupported } from '@/hooks/use-push-notifications'

interface InAppNotification {
  id: string
  title: string
  body: string
  notification_type: 'appointment' | 'system' | 'subscription'
  is_read: boolean
  created_at: string
  data?: Record<string, unknown>
}

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const haptics = useHaptics()

  // Sync app badge with unread count
  const syncBadge = useCallback(async (count: number) => {
    if (!isBadgeSupported()) return
    
    if (count > 0) {
      await setAppBadge(count)
    } else {
      await clearAppBadge()
    }
  }, [])

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden' // Prevent background scroll
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = '' // Restore scroll
    }
  }, [open])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  // Fetch only unread count (lightweight) for badge
  const fetchUnreadCount = async () => {
    try {
      const response = await pwaFetch('/api/notifications/in-app?unread_only=true&limit=1')
      
      if (!response.ok) {
        throw new Error('Failed to fetch unread count')
      }
      
      const data = await response.json()
      setUnreadCount(data.unread || 0)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  // Fetch full notifications list (heavier) only when needed
  const fetchNotifications = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      
      const response = await pwaFetch('/api/notifications/in-app?limit=50')
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }
      
      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unread || 0)
      setHasMore(data.hasMore || false)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast.error('שגיאה בטעינת ההתראות')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationIds: string[]) => {
    haptics.light()
    try {
      const response = await pwaFetch('/api/notifications/in-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: notificationIds })
      })

      if (!response.ok) {
        throw new Error('Failed to mark as read')
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          notificationIds.includes(n.id) ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
    } catch (error) {
      console.error('Error marking as read:', error)
      toast.error('שגיאה בעדכון ההתראה')
    }
  }

  const markAllAsRead = async () => {
    haptics.medium()
    try {
      const response = await pwaFetch('/api/notifications/in-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true })
      })

      if (!response.ok) {
        throw new Error('Failed to mark all as read')
      }

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      
      // Clear app badge
      await clearAppBadge()
      
      haptics.success()
      toast.success('כל ההתראות סומנו כנקראו')
    } catch (error) {
      console.error('Error marking all as read:', error)
      haptics.error()
      toast.error('שגיאה בעדכון ההתראות')
    }
  }

  const deleteNotification = async (notificationId: string) => {
    haptics.medium()
    try {
      const response = await pwaFetch('/api/notifications/in-app', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: [notificationId] })
      })

      if (!response.ok) {
        throw new Error('Failed to delete notification')
      }

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      const notification = notifications.find(n => n.id === notificationId)
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      haptics.success()
      toast.success('ההתראה נמחקה')
    } catch (error) {
      console.error('Error deleting notification:', error)
      haptics.error()
      toast.error('שגיאה במחיקת ההתראה')
    }
  }

  const clearAllRead = async () => {
    haptics.medium()
    try {
      const response = await pwaFetch('/api/notifications/in-app', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delete_all_read: true })
      })

      if (!response.ok) {
        throw new Error('Failed to clear read notifications')
      }

      // Update local state
      setNotifications(prev => prev.filter(n => !n.is_read))
      haptics.success()
      toast.success('ההתראות הנקראות נמחקו')
    } catch (error) {
      console.error('Error clearing read notifications:', error)
      haptics.error()
      toast.error('שגיאה במחיקת ההתראות')
    }
  }

  const handleNotificationClick = (notification: InAppNotification) => {
    haptics.light()
    // Mark as read if not already
    if (!notification.is_read) {
      markAsRead([notification.id])
    }

    // Handle navigation based on notification type
    if (notification.notification_type === 'appointment' && notification.data) {
      if (notification.data.appointments) {
        // Multiple dates - navigate to home
        setOpen(false)
        window.location.href = '/'
      } else if (notification.data.appointment_date) {
        // Single date - could navigate to specific date view
        setOpen(false)
        window.location.href = '/'
      }
    }
  }

  const handleToggle = () => {
    haptics.light()
    setOpen(!open)
  }

  // Initial fetch of unread count on mount
  useEffect(() => {
    fetchUnreadCount()
  }, [])

  // Sync app badge whenever unread count changes
  useEffect(() => {
    syncBadge(unreadCount)
  }, [unreadCount, syncBadge])

  // Poll for unread count every 30 seconds in background
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Fetch full notifications when panel opens
  useEffect(() => {
    if (open) {
      fetchNotifications()
      
      // Also tell service worker to clear badge (in case it's out of sync)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_BADGE' })
      }
    }
  }, [open])

  // Poll for full notifications every 30 seconds when panel is open
  useEffect(() => {
    if (open) {
      const interval = setInterval(() => {
        fetchNotifications(false)
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [open])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return '🎉'
      case 'subscription':
        return '📋'
      case 'system':
        return 'ℹ️'
      default:
        return '🔔'
    }
  }

  const getNotificationColor = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-white/50 dark:bg-white/5 border-white/20 dark:border-white/10'
    
    switch (type) {
      case 'appointment':
        return 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-700/30'
      case 'subscription':
        return 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-700/30'
      case 'system':
        return 'bg-amber-50/80 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-700/30'
      default:
        return 'bg-violet-50/80 dark:bg-violet-900/20 border-violet-200/50 dark:border-violet-700/30'
    }
  }

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn('relative', className)}
        aria-label="התראות"
        onClick={handleToggle}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs animate-pulse"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Floating Modal Overlay + Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 gpu-accelerated"
              onClick={() => setOpen(false)}
            />
            
            {/* Floating Panel - iOS PWA safe positioning */}
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'fixed z-50 gpu-accelerated',
                // Position: Below header with safe area margin on mobile
                'left-3 right-3',
                'sm:left-auto sm:right-4 sm:w-96',
                // Glass design - Apple style
                'bg-white/90 dark:bg-gray-900/90',
                'backdrop-blur-2xl',
                'border border-black/5 dark:border-white/10',
                'rounded-2xl',
                'shadow-2xl shadow-black/20 dark:shadow-black/50',
                // Proper overflow handling
                'overflow-hidden',
                'flex flex-col'
              )}
              style={{
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                // Position below header with safe area consideration
                top: 'calc(env(safe-area-inset-top, 0px) + 70px)',
                // Max height accounting for both safe areas
                maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 160px)',
              }}
            >
              {/* Header - Clean Apple style */}
              <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/10">
                    <Bell className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-base">התראות</h2>
                    <p className="text-xs text-muted-foreground">
                      {unreadCount > 0 ? `${unreadCount} חדשות` : 'אין התראות חדשות'}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick Actions - Always visible when there are notifications */}
              {notifications.length > 0 && (
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-gray-50/80 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="text-xs h-8 px-3 gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg font-medium"
                      >
                        <CheckCheck className="h-4 w-4" />
                        סמן הכל כנקרא
                      </Button>
                    )}
                  </div>
                  {notifications.some(n => n.is_read) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllRead}
                      className="text-xs h-8 px-3 gap-1.5 text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      נקה
                    </Button>
                  )}
                </div>
              )}

              {/* Notifications List */}
              <ScrollArea className="flex-1 p-3">
                {loading && notifications.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="h-8 w-8 text-primary/50" />
                    </motion.div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 rounded-2xl bg-muted/50 mb-4">
                      <BellOff className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <p className="font-medium text-muted-foreground">אין התראות</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      כשיהיו תורים זמינים, תקבל התראה כאן
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {notifications.map((notification, index) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12 }}
                          transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.1) }}
                          className={cn(
                            'relative rounded-xl p-3 transition-all cursor-pointer',
                            'border backdrop-blur-sm',
                            'active:scale-[0.98] touch-manipulation',
                            'hover:shadow-md',
                            getNotificationColor(notification.notification_type, notification.is_read)
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          {/* Unread dot */}
                          {!notification.is_read && (
                            <div className="absolute top-3 left-3 w-2 h-2 bg-primary rounded-full animate-pulse" />
                          )}

                          {/* Content */}
                          <div className="flex items-start gap-3">
                            <span className="text-xl flex-shrink-0">
                              {getNotificationIcon(notification.notification_type)}
                            </span>
                            <div className="flex-1 min-w-0 pr-6">
                              <h4 className="font-semibold text-sm line-clamp-1">
                                {notification.title}
                              </h4>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {notification.body}
                              </p>
                              <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                                <time>
                                  {formatDistanceToNow(new Date(notification.created_at), {
                                    addSuffix: true,
                                    locale: he
                                  })}
                                </time>
                                {!notification.is_read && (
                                  <>
                                    <span className="text-muted-foreground/30">•</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        markAsRead([notification.id])
                                      }}
                                      className="flex items-center gap-0.5 hover:text-primary transition-colors touch-manipulation"
                                    >
                                      <Check className="h-3 w-3" />
                                      <span>סמן</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {/* Delete button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-7 w-7 opacity-60 hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 rounded-lg touch-manipulation"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </ScrollArea>

              {/* Load More */}
              {hasMore && (
                <div className="p-3 border-t border-white/10 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchNotifications()}
                    className="text-xs w-full hover:bg-primary/10"
                  >
                    טען עוד
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
