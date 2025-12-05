"use client"

import { Edit, X, Clock, AlertCircle, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import type { Subscription } from './types'
import { 
  formatSubscriptionDate, 
  getNotificationMethodIcon, 
  getNotificationMethodLabel,
  getDaysInfo, 
  hasDuplicateDates 
} from './utils'

interface ActiveSubscriptionsListProps {
  subscriptions: Subscription[]
  allSubscriptions: Subscription[]
  mounted: boolean
  deletingIds: Set<string>
  onEdit: (subscription: Subscription) => void
  onDelete: (id: string) => void
}

export const ActiveSubscriptionsList = ({
  subscriptions,
  allSubscriptions,
  mounted,
  deletingIds,
  onEdit,
  onDelete
}: ActiveSubscriptionsListProps) => {
  if (subscriptions.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          פעילים
        </h3>
        <Badge 
          variant="default" 
          className="h-6 px-3 text-xs font-bold bg-green-500 text-white border-0 shadow-sm"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          {subscriptions.length}
        </Badge>
      </div>
      
      <div className="space-y-3">
        <AnimatePresence>
          {subscriptions.map((sub, index) => {
            const MethodIcon = getNotificationMethodIcon(sub.notification_method)
            const daysInfo = getDaysInfo(sub)
            const isDuplicate = hasDuplicateDates(sub, allSubscriptions)
            const method = sub.notification_method || 'email'
            
            return (
              <motion.div
                key={sub.id}
                initial={mounted ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: mounted ? index * 0.05 : 0 }}
              >
                <div
                  className={cn(
                    "rounded-xl p-3 border transition-all hover:shadow-md",
                    daysInfo.bgColor || "bg-gray-50 dark:bg-gray-900",
                    daysInfo.borderColor || "border-gray-200 dark:border-gray-800"
                  )}
                >
                  {/* Duplicate Warning Banner */}
                  {isDuplicate && (
                    <div className="flex items-center gap-2 mb-2.5 px-2 py-1.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        ⚠️ תאריכים כפולים זוהו
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Date Info */}
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                        <p className="text-sm font-semibold truncate">
                          {formatSubscriptionDate(sub)}
                        </p>
                      </div>
                      
                      {/* Status Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Notification Method Badge */}
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "h-6 text-xs font-medium",
                            method === 'email' && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
                            method === 'push' && "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700",
                            method === 'both' && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                          )}
                        >
                          <MethodIcon className="h-3 w-3 mr-1" />
                          {getNotificationMethodLabel(method)}
                        </Badge>
                        
                        {/* Days Info Badge */}
                        {daysInfo.text && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "h-6 text-xs font-medium",
                              daysInfo.color
                            )}
                            suppressHydrationWarning
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {daysInfo.text}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(sub)}
                        className="h-8 w-8 hover:bg-white/50 dark:hover:bg-black/20"
                        disabled={deletingIds.has(sub.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(sub.id)}
                        className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400"
                        disabled={deletingIds.has(sub.id)}
                      >
                        {deletingIds.has(sub.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
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



