"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
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

// Scroll thresholds
const SCROLL_THRESHOLD = 50 // px to start hiding
const HIDE_DISTANCE = 100 // px of scroll to fully hide

export function BottomNav() {
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [isVisible, setIsVisible] = useState(true)
  const [isScrolling, setIsScrolling] = useState(false)
  
  // Refs for scroll tracking
  const lastScrollY = useRef(0)
  const scrollDirection = useRef<'up' | 'down' | null>(null)
  const accumulatedScroll = useRef(0)
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Simplified debounced scroll handler
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY
    const scrollDelta = currentScrollY - lastScrollY.current
    
    // Track direction
    const newDirection = scrollDelta > 0 ? 'down' : scrollDelta < 0 ? 'up' : null
    
    // Accumulate scroll in same direction
    if (newDirection === scrollDirection.current) {
      accumulatedScroll.current += Math.abs(scrollDelta)
    } else {
      accumulatedScroll.current = Math.abs(scrollDelta)
    }
    
    scrollDirection.current = newDirection
    setIsScrolling(true)
    
    // Clear existing timeouts
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current)
    }
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // Simple visibility logic
    if (currentScrollY < SCROLL_THRESHOLD) {
      // Always show at top
      setIsVisible(true)
    } else if (newDirection === 'down' && accumulatedScroll.current > HIDE_DISTANCE) {
      // Hide when scrolling down significantly
      setIsVisible(false)
    } else if (newDirection === 'up') {
      // Show immediately when scrolling up
      setIsVisible(true)
    }
    
    // Set idle timeout to show nav after scrolling stops
    showTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
      setIsVisible(true)
      accumulatedScroll.current = 0
    }, 1500)
    
    // Mark scrolling as stopped
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, 100)
    
    lastScrollY.current = currentScrollY
  }, [])

  useEffect(() => {
    // Throttle scroll events for performance
    let ticking = false
    
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }
    
    window.addEventListener('scroll', throttledScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', throttledScroll)
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [handleScroll])

  // Don't show bottom nav on auth pages
  if (pathname === '/login' || pathname === '/verify-otp' || pathname === '/register') {
    return null
  }

  const handleNavClick = () => {
    haptics.impact()
  }

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 pointer-events-none",
        "transition-transform duration-300 ease-out",
        "gpu-accelerated"
      )}
      style={{
        transform: isVisible ? 'translateY(0) translateZ(0)' : 'translateY(120px) translateZ(0)',
      }}
    >
      {/* Container with safe area padding */}
      <div 
        className="relative"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)'
        }}
      >
        <div className="flex items-center justify-center h-16 px-6">
          {/* Floating glass pill - simplified */}
          <div 
            className={cn(
              "flex items-center gap-1 px-2.5 py-2 rounded-[26px] pointer-events-auto",
              "transition-shadow duration-200 ease-out",
              "gpu-accelerated"
            )}
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
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href
              
              return (
                <Link 
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    "relative flex items-center gap-2.5 px-4 py-2.5 rounded-[18px]",
                    "transition-all duration-200 ease-out",
                    "touch-manipulation active:scale-95"
                  )}
                >
                  {/* Active background indicator */}
                  {isActive && (
                    <div
                      className={cn(
                        "absolute inset-0 rounded-[18px]",
                        "animate-scale-in"
                      )}
                      style={{
                        background: 'var(--foreground)',
                        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.18)',
                      }}
                    />
                  )}

                  {/* Icon */}
                  <div className="relative z-10">
                    <item.icon 
                      className={cn(
                        "h-[18px] w-[18px] transition-colors duration-150",
                        isActive 
                          ? "text-background" 
                          : "text-muted-foreground"
                      )} 
                    />
                  </div>

                  {/* Label - only show for active item */}
                  {isActive && (
                    <span 
                      className={cn(
                        "text-sm font-semibold whitespace-nowrap relative z-10",
                        "text-background animate-fade-in"
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
