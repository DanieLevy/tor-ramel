"use client"

import { Sparkles, CheckCircle2 } from 'lucide-react'

interface SubscriptionStatsProps {
  activeCount: number
  completedCount: number
}

export const SubscriptionStats = ({ activeCount, completedCount }: SubscriptionStatsProps) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-green-50 dark:bg-green-950/40 p-3 rounded-xl border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Sparkles className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          <span className="text-xs text-green-700 dark:text-green-300 font-medium">פעילים</span>
        </div>
        <span className="text-2xl font-bold text-green-900 dark:text-green-100">
          {activeCount}
        </span>
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
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
