"use client"

import { useSwUpdate } from '@/hooks/use-sw-update'
import { Button } from '@/components/ui/button'
import { RefreshCw, X } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function SwUpdateBanner() {
  const { updateAvailable, isUpdating, applyUpdate } = useSwUpdate()
  const [dismissed, setDismissed] = useState(false)

  if (!updateAvailable || dismissed) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-0 left-0 right-0 z-[100] mx-auto max-w-lg px-4 pt-4"
      >
        <div className="relative bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
                <RefreshCw className="h-4 w-4 text-gray-900 dark:text-gray-100" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                גרסה חדשה זמינה
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                לחץ לעדכון כדי ליהנות מהשיפורים
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={applyUpdate}
                disabled={isUpdating}
                size="sm"
                className="h-8 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 font-medium text-xs"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-3 w-3 ml-1.5 animate-spin" />
                    מעדכן
                  </>
                ) : (
                  'עדכן'
                )}
              </Button>
              
              <button
                onClick={() => setDismissed(true)}
                className="flex-shrink-0 rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                aria-label="סגור"
              >
                <X className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

