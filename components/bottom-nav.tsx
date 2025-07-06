"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      {/* Glass effect background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t" />
      
      {/* Navigation container */}
      <nav className="relative">
        <ul className="flex items-center justify-around h-16">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href
            const isMiddle = index === 1
            const Icon = item.icon

            return (
              <li key={item.href} className="flex-1 flex justify-center">
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex flex-col items-center justify-center transition-all duration-300",
                    isMiddle ? "mb-4" : "p-2",
                    isActive && !isMiddle && "text-primary"
                  )}
                >
                  {isMiddle ? (
                    // Middle circular button
                    <div
                      className={cn(
                        "absolute -top-6 flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300",
                        "bg-primary text-primary-foreground shadow-lg",
                        "hover:scale-110 hover:shadow-xl",
                        isActive && "ring-4 ring-primary/20 scale-110"
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                  ) : (
                    // Regular nav items
                    <>
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
                      </div>
                      <span
                        className={cn(
                          "mt-1 text-xs font-medium transition-all duration-300",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {item.label}
                      </span>
                    </>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
} 