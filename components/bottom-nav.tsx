"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

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
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          const scrollDelta = currentScrollY - lastScrollY
          
          // Clear previous timeout
          clearTimeout(timeoutId)
          
          // Always visible at top of page
          if (currentScrollY < 50) {
            setIsVisible(true)
          } 
          // Hide on scroll down (threshold: 5px)
          else if (scrollDelta > 5 && currentScrollY > 100) {
            setIsVisible(false)
          } 
          // Show on scroll up (threshold: 5px)
          else if (scrollDelta < -5) {
            setIsVisible(true)
          }
          
          setLastScrollY(currentScrollY)
          
          // Auto-reveal after 1.5s of inactivity
          timeoutId = setTimeout(() => {
            setIsVisible(true)
          }, 1500)
          
          ticking = false
        })
        
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
    }
  }, [lastScrollY])

  // Don't show bottom nav on auth pages
  if (pathname === '/login' || pathname === '/verify-otp' || pathname === '/register') {
    return null
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-20" />
      
      <motion.nav 
        className="fixed bottom-0 left-0 right-0 z-50"
        initial={{ y: 0 }}
        animate={{ y: isVisible ? 0 : 100 }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 35,
          mass: 0.8,
          velocity: 2
        }}
      >
        {/* Ultra-transparent blurred background for seamless flow */}
        <div className="absolute inset-0" />
        
        {/* Container with safe area padding */}
        <div className="relative pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-center h-16 px-8">
            {/* Navigation container with subtle background */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-background/40 backdrop-blur-md border border-border/10">
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
      </motion.nav>
    </>
  )
} 