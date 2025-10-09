'use client'

import { useEffect, useState } from 'react'
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn, pwaFetch } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'
import { toast } from 'sonner'

interface InAppNotification {
  id: string
  title: string
  body: string
  notification_type: 'appointment' | 'system' | 'subscription'
  is_read: boolean
  created_at: string
  data?: any
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
      toast.success('כל ההתראות סומנו כנקראו')
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('שגיאה בעדכון ההתראות')
    }
  }

  const deleteNotification = async (notificationId: string) => {
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
      toast.success('ההתראה נמחקה')
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('שגיאה במחיקת ההתראה')
    }
  }

  const clearAllRead = async () => {
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
      toast.success('ההתראות הנקראות נמחקו')
    } catch (error) {
      console.error('Error clearing read notifications:', error)
      toast.error('שגיאה במחיקת ההתראות')
    }
  }

  const handleNotificationClick = (notification: InAppNotification) => {
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

  // Initial fetch of unread count on mount
  useEffect(() => {
    fetchUnreadCount()
  }, [])

  // Poll for unread count every 30 seconds in background
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Fetch full notifications when sheet opens
  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open])

  // Poll for full notifications every 30 seconds when sheet is open
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label="התראות"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>התראות</SheetTitle>
          <SheetDescription>
            {unreadCount > 0 ? `${unreadCount} התראות חדשות` : 'אין התראות חדשות'}
          </SheetDescription>
        </SheetHeader>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 mb-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="h-4 w-4 ml-1" />
              סמן הכל כנקרא
            </Button>
          )}
          {notifications.some(n => n.is_read) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllRead}
              className="text-xs"
            >
              <Trash2 className="h-4 w-4 ml-1" />
              מחק נקראות
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[calc(100vh-200px)] mt-4">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">אין התראות</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'relative border rounded-lg p-4 transition-all active:scale-[0.98] cursor-pointer touch-manipulation',
                    !notification.is_read && 'bg-primary/5 border-primary/20'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Unread indicator */}
                  {!notification.is_read && (
                    <div className="absolute top-3 left-3 w-2 h-2 bg-primary rounded-full"></div>
                  )}

                  {/* Delete button - Always visible for mobile */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 touch-manipulation active:bg-destructive/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotification(notification.id)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  {/* Content */}
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.notification_type)}
                    </span>
                    <div className="flex-1 min-w-0 pl-6">
                      <h4 className="font-semibold text-sm mb-1 line-clamp-1">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {notification.body}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <time>
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: he
                          })}
                        </time>
                        {!notification.is_read && (
                          <>
                            <span>•</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead([notification.id])
                              }}
                              className="flex items-center gap-1 hover:text-primary transition-colors"
                            >
                              <Check className="h-3 w-3" />
                              <span>סמן כנקרא</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {hasMore && (
          <div className="text-center mt-4">
            <Button
              variant="link"
              size="sm"
              onClick={() => fetchNotifications()}
              className="text-xs"
            >
              טען עוד
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

