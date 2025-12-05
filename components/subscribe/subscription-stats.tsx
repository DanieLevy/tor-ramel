"use client"

import { Sparkles, CheckCircle2 } from 'lucide-react'

interface SubscriptionStatsProps {
  activeCount: number
  completedCount: number
}

export const SubscriptionStats = ({ activeCount, completedCount }: SubscriptionStatsProps) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/20 dark:to-green-950/10 p-3 rounded-xl border border-green-200/50 dark:border-green-800/30">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Sparkles className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          <span className="text-xs text-green-700 dark:text-green-300 font-medium">פעילים</span>
        </div>
        <span className="text-2xl font-bold text-green-900 dark:text-green-100">
          {activeCount}
        </span>
      </div>
      
      <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-950/10 p-3 rounded-xl border border-blue-200/50 dark:border-blue-800/30">
        <div className="flex items-center gap-1.5 mb-0.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">הושלמו</span>
        </div>
        <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
          {completedCount}
        </span>
      </div>
    </div>
  )
}



