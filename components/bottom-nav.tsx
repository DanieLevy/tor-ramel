"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

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

  // Don't show bottom nav on auth pages
  if (pathname === '/login' || pathname === '/verify-otp') {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe px-safe pointer-events-none">
      {/* Bubble container with floating effect */}
      <div className="flex justify-center px-4 pb-3 px-safe-landscape">
        <nav className="pointer-events-auto bg-background/95 backdrop-blur-xl rounded-full shadow-lg border border-border/50 px-1">
          <ul className="flex items-center gap-0.5 p-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center justify-center rounded-full transition-all duration-300",
                      "w-12 h-12 touch-manipulation", // 48x48px - still good for touch
                      "hover:bg-accent/20",
                      "active:scale-95"
                    )}
                  >
                    {/* Active indicator background */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-primary/10 rounded-full"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Icon */}
                    <div className="relative flex flex-col items-center">
                      <Icon
                        className={cn(
                          "h-5 w-5 transition-all duration-300",
                          isActive 
                            ? "text-primary scale-110" 
                            : "text-muted-foreground"
                        )}
                      />
                      
                      {/* Active dot indicator */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Ripple effect on tap */}
                    <span className="absolute inset-0 rounded-full" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
} 