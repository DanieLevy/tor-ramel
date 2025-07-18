"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

interface NavItem {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}

const navItems: NavItem[] = [
  { href: '/', icon: Home, label: 'בית' },
  { href: '/search', icon: Search, label: 'חיפוש' },
  { href: '/subscribe', icon: Bell, label: 'התראות' },
]

export function BottomNav() {
  const pathname = usePathname()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Don't show bottom nav on auth pages
  if (pathname === '/login' || pathname === '/verify-otp' || pathname === '/register') {
    return null
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-20" />
      
      <nav className="fixed bottom-0 left-0 right-0 z-50">
        {/* Minimal background with subtle border */}
        <div className="absolute inset-0 bg-white/95 dark:bg-black/95 backdrop-blur-md border-t border-gray-200/20 dark:border-gray-800/20" />
        
        {/* Container with safe area padding */}
        <div className="relative pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-center h-16 px-8">
            {/* Navigation container */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/30 dark:border-gray-800/30">
              {navItems.map((item, index) => {
                const isActive = pathname === item.href
                const isHovered = hoveredIndex === index
                
                return (
                  <motion.div
                    key={item.href}
                    className="relative"
                    onHoverStart={() => setHoveredIndex(index)}
                    onHoverEnd={() => setHoveredIndex(null)}
                  >
                    <Link href={item.href}>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "relative flex items-center gap-3 px-4 py-2.5 rounded-full transition-all duration-300",
                          "hover:bg-white/80 dark:hover:bg-gray-800/80",
                          isActive && "bg-white dark:bg-gray-800 shadow-sm"
                        )}
                      >
                        {/* Active background indicator */}
                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              layoutId="activeNavBackground"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 rounded-full bg-black dark:bg-white"
                              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                            />
                          )}
                        </AnimatePresence>

                        {/* Icon */}
                        <motion.div
                          animate={{
                            rotate: isHovered ? 2 : 0,
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className="relative z-10"
                        >
                          <item.icon 
                            className={cn(
                              "h-4 w-4 transition-all duration-300",
                              isActive 
                                ? "text-white dark:text-black" 
                                : "text-gray-600 dark:text-gray-400"
                            )} 
                          />
                        </motion.div>

                        {/* Label - only show for active item */}
                        <AnimatePresence>
                          {isActive && (
                            <motion.span 
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              exit={{ opacity: 0, width: 0 }}
                              className={cn(
                                "text-sm font-medium whitespace-nowrap relative z-10 overflow-hidden",
                                "text-white dark:text-black"
                              )}
                              transition={{ duration: 0.3 }}
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {/* Subtle hover indicator */}
                        <AnimatePresence>
                          {isHovered && !isActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute inset-0 rounded-full bg-gray-200/50 dark:bg-gray-700/50"
                              transition={{ duration: 0.2 }}
                            />
                          )}
                        </AnimatePresence>

                        {/* Active dot indicator */}
                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full"
                              transition={{ type: "spring", bounce: 0.6, delay: 0.1 }}
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* Minimal bottom indicator */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: 32 }}
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-0.5 bg-gray-300 dark:bg-gray-700 rounded-t-full"
          transition={{ delay: 0.5, duration: 0.8 }}
        />
      </nav>
    </>
  )
} 