"use client"

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, BellRing, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { cn, pwaFetch } from '@/lib/utils'
import { useHaptics } from '@/hooks/use-haptics'

interface NotificationPreferenceBannerProps {
  className?: string
}

type NotificationMethod = 'email' | 'push' | 'both'

export function NotificationPreferenceBanner({ className }: NotificationPreferenceBannerProps) {
  const [method, setMethod] = useState<NotificationMethod | null>(null)
  const [loading, setLoading] = useState(true)
  const haptics = useHaptics()

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const response = await pwaFetch('/api/user/preferences', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setMethod(data.default_notification_method || 'email')
      }
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !method) {
    return null
  }

  const getMethodConfig = (method: NotificationMethod) => {
    switch (method) {
      case 'email':
        return {
          icon: Mail,
          text: 'התראות במייל',
          bgColor: 'bg-blue-50 dark:bg-blue-950/20',
          borderColor: 'border-blue-200 dark:border-blue-800/30',
          iconColor: 'text-blue-600 dark:text-blue-400',
          textColor: 'text-blue-900 dark:text-blue-100'
        }
      case 'push':
        return {
          icon: BellRing,
          text: 'התראות Push',
          bgColor: 'bg-purple-50 dark:bg-purple-950/20',
          borderColor: 'border-purple-200 dark:border-purple-800/30',
          iconColor: 'text-purple-600 dark:text-purple-400',
          textColor: 'text-purple-900 dark:text-purple-100'
        }
      case 'both':
        return {
          icon: null,
          text: 'התראות במייל + Push',
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
          borderColor: 'border-emerald-200 dark:border-emerald-800/30',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          textColor: 'text-emerald-900 dark:text-emerald-100'
        }
    }
  }

  const config = getMethodConfig(method)
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className={cn(className)}
    >
      <Link 
        href="/settings"
        onClick={() => haptics.light()}
        className={cn(
          "block rounded-xl p-3 border transition-all duration-200",
          "hover:shadow-sm active:scale-[0.98]",
          config.bgColor,
          config.borderColor
        )}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Icon and Text */}
          <div className="flex items-center gap-2.5 min-w-0">
            {method === 'both' ? (
              <div className="flex items-center -space-x-1">
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                  "bg-emerald-100 dark:bg-emerald-900/50"
                )}>
                  <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                  "bg-emerald-100 dark:bg-emerald-900/50"
                )}>
                  <BellRing className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            ) : Icon ? (
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                method === 'email' 
                  ? "bg-blue-100 dark:bg-blue-900/50"
                  : "bg-purple-100 dark:bg-purple-900/50"
              )}>
                <Icon className={cn("h-4 w-4", config.iconColor)} />
              </div>
            ) : null}
            
            <div className="flex flex-col min-w-0">
              <p className={cn(
                "text-xs font-medium truncate",
                config.textColor
              )}>
                {config.text}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                לחץ לשינוי
              </p>
            </div>
          </div>

          {/* Arrow */}
          <ChevronLeft className={cn(
            "h-4 w-4 flex-shrink-0",
            config.iconColor
          )} />
        </div>
      </Link>
    </motion.div>
  )
}

