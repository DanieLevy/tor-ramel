"use client"

import { CheckCircle, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import type { Subscription } from './types'
import { formatSubscriptionDate, getNotificationMethodIcon, getNotificationMethodLabel } from './utils'

interface CompletedSubscriptionsListProps {
  subscriptions: Subscription[]
  mounted: boolean
  deletingIds: Set<string>
  onDelete: (id: string) => void
}

export const CompletedSubscriptionsList = ({
  subscriptions,
  mounted,
  deletingIds,
  onDelete
}: CompletedSubscriptionsListProps) => {
  if (subscriptions.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          הושלמו
        </h3>
        <Badge variant="outline" className="h-5 text-xs">
          {subscriptions.length}
        </Badge>
      </div>
      <div className="space-y-2">
        <AnimatePresence>
          {subscriptions.map((sub, index) => {
            const MethodIcon = getNotificationMethodIcon(sub.notification_method)
            const method = sub.notification_method || 'email'
            
            return (
              <motion.div
                key={sub.id}
                initial={mounted ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: mounted ? index * 0.05 : 0 }}
              >
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2.5 border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate block">
                          {formatSubscriptionDate(sub)}
                        </span>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "h-5 text-xs mt-1 font-medium opacity-70",
                            method === 'email' && "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
                            method === 'push' && "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
                            method === 'both' && "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          )}
                        >
                          <MethodIcon className="h-2.5 w-2.5 mr-1" />
                          {getNotificationMethodLabel(method)}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(sub.id)}
                      className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0"
                      disabled={deletingIds.has(sub.id)}
                    >
                      {deletingIds.has(sub.id) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}



