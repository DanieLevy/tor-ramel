"use client"

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UpdateModalProps {
  isOpen: boolean
  isUpdating: boolean
  onUpdate: () => void
}

export function UpdateModal({ isOpen, isUpdating, onUpdate }: UpdateModalProps) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) return null
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm"
            style={{ WebkitBackdropFilter: 'blur(20px)' }}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="relative w-full max-w-sm"
            >
              {/* Glass card with Apple-style design */}
              <div className="relative overflow-hidden rounded-3xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50">
                {/* Gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                
                {/* Content */}
                <div className="p-8 text-center space-y-6">
                  {/* Icon with gradient background */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1, damping: 20, stiffness: 300 }}
                    className="relative mx-auto w-20 h-20"
                  >
                    {/* Pulsing background effect */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 opacity-20 animate-pulse" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 opacity-10 animate-ping" />
                    
                    {/* Main icon container */}
                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <Sparkles className="w-10 h-10 text-white" strokeWidth={2} />
                    </div>
                  </motion.div>
                  
                  {/* Title */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      עדכון זמין
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      גרסה חדשה של האפליקציה מוכנה להתקנה עם שיפורים ותכונות חדשות
                    </p>
                  </motion.div>
                  
                  {/* Features list - Apple style */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2 text-right"
                  >
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <svg className="w-3 h-3 text-green-600 dark:text-green-400" viewBox="0 0 12 12" fill="none">
                          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span>ביצועים משופרים</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <svg className="w-3 h-3 text-green-600 dark:text-green-400" viewBox="0 0 12 12" fill="none">
                          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span>תיקוני באגים</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <svg className="w-3 h-3 text-green-600 dark:text-green-400" viewBox="0 0 12 12" fill="none">
                          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span>תכונות חדשות</span>
                    </div>
                  </motion.div>
                  
                  {/* Update button - Apple style */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="pt-2"
                  >
                    <Button
                      onClick={onUpdate}
                      disabled={isUpdating}
                      className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isUpdating ? (
                        <>
                          <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                          מעדכן...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="ml-2 h-4 w-4" />
                          עדכן עכשיו
                        </>
                      )}
                    </Button>
                    
                    {/* Subtle hint text */}
                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                      העדכון ייקח רגע אחד בלבד
                    </p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

