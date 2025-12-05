'use client'

import { RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PullToRefreshIndicatorProps {
  pullDistance: number
  pullProgress: number
  isRefreshing: boolean
  isPulling: boolean
  threshold: number
}

export function PullToRefreshIndicator({
  pullDistance,
  pullProgress,
  isRefreshing,
  isPulling: _isPulling,
  threshold: _threshold
}: PullToRefreshIndicatorProps) {
  // Only show when there's some pull distance or refreshing
  if (pullDistance === 0 && !isRefreshing) return null

  return (
    <motion.div
      className={cn(
        'fixed left-0 right-0 flex items-center justify-center z-40 pointer-events-none',
        'transition-opacity duration-200'
      )}
      style={{
        top: `calc(env(safe-area-inset-top, 0px) + 60px)`,
        height: `${Math.max(0, pullDistance)}px`,
        opacity: pullProgress > 0.1 ? 1 : 0
      }}
    >
      <motion.div
        className={cn(
          'flex items-center justify-center rounded-full',
          'bg-white/90 dark:bg-gray-800/90',
          'backdrop-blur-lg',
          'shadow-lg shadow-black/10 dark:shadow-black/30',
          'border border-black/5 dark:border-white/10'
        )}
        style={{
          width: 44,
          height: 44,
          scale: Math.min(1, pullProgress),
          opacity: Math.min(1, pullProgress * 2)
        }}
        animate={isRefreshing ? { rotate: 360 } : { rotate: pullProgress * 180 }}
        transition={isRefreshing ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
      >
        <RefreshCw 
          className={cn(
            'h-5 w-5 transition-colors',
            pullProgress >= 1 || isRefreshing
              ? 'text-emerald-500 dark:text-emerald-400'
              : 'text-gray-400 dark:text-gray-500'
          )}
        />
      </motion.div>
    </motion.div>
  )
}

