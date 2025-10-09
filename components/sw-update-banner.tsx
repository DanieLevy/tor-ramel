"use client"

import { useSwUpdate } from '@/hooks/use-sw-update'
import { Button } from '@/components/ui/button'
import { RefreshCw, Sparkles, X } from 'lucide-react'
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
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed top-0 left-0 right-0 z-[100] mx-auto max-w-lg px-4 pt-4"
      >
        <div className="relative overflow-hidden rounded-xl border-2 border-purple-500 bg-gradient-to-r from-purple-600 to-blue-600 p-4 shadow-2xl backdrop-blur-sm">
          {/* Sparkle animation background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),rgba(255,255,255,0))]" />
          
          <div className="relative flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white mb-1">
                גרסה חדשה זמינה!
              </h3>
              <p className="text-sm text-purple-50 mb-3">
                עדכון חדש של האפליקציה מוכן. לחץ לעדכון כדי ליהנות מהשיפורים האחרונים.
              </p>

              {/* Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={applyUpdate}
                  disabled={isUpdating}
                  size="sm"
                  className="bg-white text-purple-700 hover:bg-purple-50 font-semibold shadow-lg"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                      מעדכן...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 ml-2" />
                      עדכן עכשיו
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => setDismissed(true)}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                >
                  מאוחר יותר
                </Button>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setDismissed(true)}
              className="flex-shrink-0 rounded-full p-1 hover:bg-white/20 transition-colors"
              aria-label="סגור"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

