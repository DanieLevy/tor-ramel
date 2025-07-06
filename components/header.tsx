"use client"

import React from 'react'
import { Menu, Sun, Moon, Search, Bell, Info, Home } from 'lucide-react'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHeaderContext } from './header-context'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export function Header() {
  const { config } = useHeaderContext()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Don't show header on auth pages
  if (pathname === '/login' || pathname === '/verify-otp') {
    return null
  }

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      config.className
    )}>
      <div className="container flex h-14 items-center">
        <div className="flex flex-1 items-center justify-between">
          {/* Left section - Hamburger Menu */}
          <div className="flex items-center gap-2">
            {config.showMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden hover:bg-accent/50 transition-colors"
                    aria-label="פתח תפריט"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start" 
                  className="w-48 rounded-xl border-border/50 shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
                >
                  <DropdownMenuItem className="flex flex-row-reverse text-right gap-3 py-2.5 px-3 cursor-pointer hover:bg-accent/50 focus:bg-accent/50 transition-colors rounded-lg mx-1 my-0.5" asChild>
                    <Link href="/">
                      <Home className="h-4 w-4 opacity-60" />
                      <span className="flex-1">דף הבית</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-row-reverse text-right gap-3 py-2.5 px-3 cursor-pointer hover:bg-accent/50 focus:bg-accent/50 transition-colors rounded-lg mx-1 my-0.5" asChild>
                    <Link href="/search">
                      <Search className="h-4 w-4 opacity-60" />
                      <span className="flex-1">חיפוש תורים</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-row-reverse text-right gap-3 py-2.5 px-3 cursor-pointer hover:bg-accent/50 focus:bg-accent/50 transition-colors rounded-lg mx-1 my-0.5" asChild>
                    <Link href="/subscribe">
                      <Bell className="h-4 w-4 opacity-60" />
                      <span className="flex-1">התראות</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem className="flex flex-row-reverse text-right gap-3 py-2.5 px-3 cursor-pointer hover:bg-accent/50 focus:bg-accent/50 transition-colors rounded-lg mx-1 my-0.5">
                    <Info className="h-4 w-4 opacity-60" />
                    <span className="flex-1">אודות</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Center section - App Icon & Title */}
          <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
            {/* Proper App Icon */}
            <img 
              src="/icons/icon-96x96.png" 
              alt="תור רם-אל" 
              className="w-8 h-8 rounded-lg shadow-sm"
            />
            <h1 className="text-lg font-semibold">{config.title}</h1>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2 justify-end">
            {config.customActions}
            
            {/* Theme Toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
                className="hover:bg-accent/50 transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 transition-all" />
                ) : (
                  <Moon className="h-5 w-5 transition-all" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 