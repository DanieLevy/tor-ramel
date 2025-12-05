"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'
import { haptics } from '@/hooks/use-haptics'
import { useTheme } from 'next-themes'

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

// iOS-style spring configuration
const springConfig = {
  stiffness: 400,
  damping: 35,
  mass: 0.8,
}

// Velocity thresholds for smart hide/show
const VELOCITY_THRESHOLD = 300 // px/s
const DISTANCE_THRESHOLD = 50 // px
const IDLE_TIMEOUT = 2000 // ms

export function BottomNav() {
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [isScrolling, setIsScrolling] = useState(false)
  const [navScale, setNavScale] = useState(1)
  
  // Refs for scroll tracking
  const lastScrollY = useRef(0)
  const lastScrollTime = useRef(Date.now())
  const scrollVelocity = useRef(0)
  const scrollDirection = useRef<'up' | 'down' | null>(null)
  const accumulatedScroll = useRef(0)
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const rafRef = useRef<number | null>(null)
  
  // Motion values for fluid animations
  const y = useMotionValue(0)
  const blur = useTransform(y, [0, 100], [36, 0])
  const opacity = useTransform(y, [0, 80], [1, 0])
  const scale = useSpring(1, springConfig)

  // Smart scroll handling with velocity detection
  const handleScroll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }
    
    rafRef.current = requestAnimationFrame(() => {
      const currentScrollY = window.scrollY
      const currentTime = Date.now()
      const timeDelta = currentTime - lastScrollTime.current
      const scrollDelta = currentScrollY - lastScrollY.current
      
      // Calculate velocity (px/s)
      if (timeDelta > 0) {
        scrollVelocity.current = Math.abs(scrollDelta / timeDelta) * 1000
      }
      
      // Determine scroll direction
      const newDirection = scrollDelta > 0 ? 'down' : scrollDelta < 0 ? 'up' : null
      
      // Track accumulated scroll in current direction
      if (newDirection === scrollDirection.current) {
        accumulatedScroll.current += Math.abs(scrollDelta)
      } else {
        accumulatedScroll.current = Math.abs(scrollDelta)
      }
      
      scrollDirection.current = newDirection
      setIsScrolling(true)
      
      // Clear existing idle timeout
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current)
      }
      
      // Smart visibility logic
      if (currentScrollY < 50) {
        // Always show at top
        setIsVisible(true)
        setNavScale(1)
      } else if (newDirection === 'down') {
        // Scrolling down - hide based on velocity and distance
        if (scrollVelocity.current > VELOCITY_THRESHOLD || accumulatedScroll.current > DISTANCE_THRESHOLD) {
          setIsVisible(false)
          // Slight scale down when scrolling fast
          const scaleValue = Math.max(0.95, 1 - (scrollVelocity.current / 5000))
          setNavScale(scaleValue)
        }
      } else if (newDirection === 'up') {
        // Scrolling up - show immediately
        setIsVisible(true)
        setNavScale(1)
        // Haptic feedback on reveal (subtle)
        if (!isVisible && scrollVelocity.current > VELOCITY_THRESHOLD) {
          haptics.selection()
        }
      }
      
      // Set idle timeout to show nav after scrolling stops
      idleTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false)
        setIsVisible(true)
        setNavScale(1)
        accumulatedScroll.current = 0
      }, IDLE_TIMEOUT)
      
      lastScrollY.current = currentScrollY
      lastScrollTime.current = currentTime
    })
  }, [isVisible])

  useEffect(() => {
    // Use passive listener for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Touch events for rubber-band feel
    let touchStartY = 0
    let touchStartTime = 0
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
      touchStartTime = Date.now()
    }
    
    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY
      const delta = touchY - touchStartY
      const velocity = Math.abs(delta / (Date.now() - touchStartTime)) * 1000
      
      // Slight scale effect based on scroll velocity
      if (velocity > 800) {
        scale.set(0.98)
      }
    }
    
    const handleTouchEnd = () => {
      scale.set(1)
    }
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [handleScroll, scale])

  // Don't show bottom nav on auth pages
  if (pathname === '/login' || pathname === '/verify-otp' || pathname === '/register') {
    return null
  }

  const handleNavClick = (index: number) => {
    haptics.impact()
    setHoveredIndex(index)
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-24" />
      
      {/* Floating navbar container - no background, just positions the pill */}
      <motion.nav 
        className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
        initial={{ y: 0, scale: 1 }}
        animate={{ 
          y: isVisible ? 0 : 120,
          scale: navScale,
        }}
        transition={{ 
          type: "spring",
          ...springConfig,
        }}
        style={{ scale }}
      >
        {/* Container with safe area padding - no background */}
        <div 
          className="relative"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)'
          }}
        >
          <div className="flex items-center justify-center h-16 px-6">
            {/* Floating glass pill - Apple iOS 18 style */}
            <motion.div 
              className="flex items-center gap-1 px-2.5 py-2 rounded-[26px] pointer-events-auto"
              style={{
                background: isDark 
                  ? 'rgba(40, 40, 45, 0.75)' 
                  : 'rgba(255, 255, 255, 0.65)',
                backdropFilter: 'blur(40px) saturate(200%)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                boxShadow: isDark
                  ? (isScrolling 
                      ? '0 4px 24px rgba(0, 0, 0, 0.3), 0 0 0 0.5px rgba(255, 255, 255, 0.1) inset' 
                      : '0 8px 40px rgba(0, 0, 0, 0.4), 0 0 0 0.5px rgba(255, 255, 255, 0.15) inset')
                  : (isScrolling 
                      ? '0 4px 24px rgba(0, 0, 0, 0.12), 0 0 0 0.5px rgba(255, 255, 255, 0.5) inset' 
                      : '0 8px 40px rgba(0, 0, 0, 0.15), 0 0 0 0.5px rgba(255, 255, 255, 0.6) inset'),
                border: isDark 
                  ? '1px solid rgba(255, 255, 255, 0.1)' 
                  : '1px solid rgba(255, 255, 255, 0.3)',
              }}
              layout
              transition={{ type: "spring", ...springConfig }}
            >
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
                    <Link 
                      href={item.href}
                      onClick={() => handleNavClick(index)}
                    >
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.92 }}
                        className={cn(
                          "relative flex items-center gap-2.5 px-4 py-2.5 rounded-[18px] transition-all duration-200",
                          "touch-manipulation"
                        )}
                      >
                        {/* Active background indicator - iOS 26 style pill */}
                        <AnimatePresence mode="wait">
                          {isActive && (
                            <motion.div
                              layoutId="activeNavBackground"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="absolute inset-0 rounded-[18px]"
                              style={{
                                background: 'var(--foreground)',
                                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.18)',
                              }}
                              transition={{ 
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                              }}
                            />
                          )}
                        </AnimatePresence>

                        {/* Icon with subtle animation */}
                        <motion.div
                          animate={{
                            y: isHovered && !isActive ? -1 : 0,
                            rotate: isHovered && !isActive ? -3 : 0,
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className="relative z-10"
                        >
                          <item.icon 
                            className={cn(
                              "h-[18px] w-[18px] transition-all duration-200",
                              isActive 
                                ? "text-background" 
                                : "text-muted-foreground"
                            )} 
                          />
                        </motion.div>

                        {/* Label - only show for active item with smooth expand */}
                        <AnimatePresence mode="wait">
                          {isActive && (
                            <motion.span 
                              initial={{ opacity: 0, width: 0, x: -10 }}
                              animate={{ opacity: 1, width: "auto", x: 0 }}
                              exit={{ opacity: 0, width: 0, x: -10 }}
                              className={cn(
                                "text-sm font-semibold whitespace-nowrap relative z-10 overflow-hidden",
                                "text-background"
                              )}
                              transition={{ 
                                type: "spring",
                                stiffness: 400,
                                damping: 25,
                              }}
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {/* Subtle hover glass effect */}
                        <AnimatePresence>
                          {isHovered && !isActive && (
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                              className="absolute inset-0 rounded-[18px]"
                              style={{
                                background: 'var(--glass-bg-subtle)',
                              }}
                              transition={{ duration: 0.15 }}
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </div>
      </motion.nav>
    </>
  )
} 