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
    <>
      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-20" />
      
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
        {/* Container with safe area padding */}
        <div className="pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around items-center h-16">
            <Link href="/" className={cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-colors",
              pathname === '/' ? 'text-primary' : 'text-muted-foreground'
            )}>
              <Home className="h-5 w-5" />
              <span className="text-xs mt-1">בית</span>
            </Link>

            <Link href="/search" className={cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-colors",
              pathname === '/search' ? 'text-primary' : 'text-muted-foreground'
            )}>
              <Search className="h-5 w-5" />
              <span className="text-xs mt-1">חיפוש</span>
            </Link>

            <Link href="/subscribe" className={cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-colors",
              pathname === '/subscribe' ? 'text-primary' : 'text-muted-foreground'
            )}>
              <Bell className="h-5 w-5" />
              <span className="text-xs mt-1">התראות</span>
            </Link>
          </div>
        </div>
      </nav>
    </>
  )
} 