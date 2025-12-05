"use client"

import * as React from 'react'
import Link from 'next/link'
import { LucideIcon, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/hooks/use-haptics'
import { motion } from 'framer-motion'

interface QuickActionCardProps {
  /** Icon component from lucide-react */
  icon: LucideIcon
  /** Main title text */
  title: string
  /** Subtitle/description text */
  subtitle: string
  /** Link destination (if clickable) */
  href?: string
  /** Card variant for different styling */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'purple' | 'indigo' | 'rose' | 'teal' | 'orange'
  /** Whether this card shows live updating data */
  live?: boolean
  /** Custom click handler (for non-link cards) */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
  /** Animation delay for staggered entrance */
  delay?: number
}

// Clean, solid color variants - Apple-style
const variantStyles = {
  default: {
    bg: 'bg-gray-50 dark:bg-gray-900',
    border: 'border-gray-200 dark:border-gray-800',
    iconBg: 'bg-gray-500',
    iconColor: 'text-white',
    titleColor: 'text-gray-900 dark:text-gray-100',
    subtitleColor: 'text-gray-500 dark:text-gray-400',
    ring: 'ring-gray-300 dark:ring-gray-700',
  },
  primary: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    iconBg: 'bg-blue-500',
    iconColor: 'text-white',
    titleColor: 'text-blue-900 dark:text-blue-100',
    subtitleColor: 'text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-300 dark:ring-blue-700',
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    iconBg: 'bg-emerald-500',
    iconColor: 'text-white',
    titleColor: 'text-emerald-900 dark:text-emerald-100',
    subtitleColor: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-300 dark:ring-emerald-700',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    iconBg: 'bg-amber-500',
    iconColor: 'text-white',
    titleColor: 'text-amber-900 dark:text-amber-100',
    subtitleColor: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-300 dark:ring-amber-700',
  },
  purple: {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-200 dark:border-violet-800',
    iconBg: 'bg-violet-500',
    iconColor: 'text-white',
    titleColor: 'text-violet-900 dark:text-violet-100',
    subtitleColor: 'text-violet-600 dark:text-violet-400',
    ring: 'ring-violet-300 dark:ring-violet-700',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-200 dark:border-indigo-800',
    iconBg: 'bg-indigo-500',
    iconColor: 'text-white',
    titleColor: 'text-indigo-900 dark:text-indigo-100',
    subtitleColor: 'text-indigo-600 dark:text-indigo-400',
    ring: 'ring-indigo-300 dark:ring-indigo-700',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    iconBg: 'bg-rose-500',
    iconColor: 'text-white',
    titleColor: 'text-rose-900 dark:text-rose-100',
    subtitleColor: 'text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-300 dark:ring-rose-700',
  },
  teal: {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-200 dark:border-teal-800',
    iconBg: 'bg-teal-500',
    iconColor: 'text-white',
    titleColor: 'text-teal-900 dark:text-teal-100',
    subtitleColor: 'text-teal-600 dark:text-teal-400',
    ring: 'ring-teal-300 dark:ring-teal-700',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-200 dark:border-orange-800',
    iconBg: 'bg-orange-500',
    iconColor: 'text-white',
    titleColor: 'text-orange-900 dark:text-orange-100',
    subtitleColor: 'text-orange-600 dark:text-orange-400',
    ring: 'ring-orange-300 dark:ring-orange-700',
  },
}

export const QuickActionCard = React.forwardRef<HTMLDivElement, QuickActionCardProps>(
  ({ icon: Icon, title, subtitle, href, variant = 'default', live = false, onClick, className, delay = 0 }, ref) => {
    const haptics = useHaptics()
    const styles = variantStyles[variant]
    const isClickable = !!href || !!onClick
    
    const handleClick = () => {
      haptics.light()
      onClick?.()
    }
    
    const CardContent = (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.3 }}
        whileTap={isClickable ? { scale: 0.97 } : undefined}
        whileHover={isClickable ? { scale: 1.02 } : undefined}
        onClick={!href ? handleClick : undefined}
        className={cn(
          // Base styling
          'relative overflow-hidden rounded-2xl p-4',
          'border transition-all duration-200 ease-out',
          'touch-manipulation',
          // Variant colors
          styles.bg,
          styles.border,
          // Interactive states for clickable cards
          isClickable && [
            'cursor-pointer',
            'shadow-sm hover:shadow-md',
            `hover:ring-2 ${styles.ring}`,
          ],
          className
        )}
      >
        <div className="relative flex items-center gap-3">
          {/* Icon with solid background */}
          <div className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl',
            'shadow-sm',
            'transition-all duration-200',
            styles.iconBg
          )}>
            <Icon className={cn('h-5 w-5', styles.iconColor)} />
          </div>
          
          {/* Text content */}
          <div className="flex-1 min-w-0">
            <p className={cn('font-semibold text-sm truncate', styles.titleColor)}>
              {title}
            </p>
            <p className={cn('text-xs truncate flex items-center gap-1.5 mt-0.5', styles.subtitleColor)}>
              {live && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
              {subtitle}
            </p>
          </div>
          
          {/* Clickable indicator arrow */}
          {isClickable && (
            <motion.div
              initial={{ opacity: 0.5, x: 4 }}
              whileHover={{ opacity: 1, x: 0 }}
              className={cn('flex-shrink-0', styles.subtitleColor)}
            >
              <ChevronLeft className="h-4 w-4" />
            </motion.div>
          )}
        </div>
      </motion.div>
    )
    
    if (href) {
      return (
        <Link href={href} onClick={() => haptics.light()} className="group block">
          {CardContent}
        </Link>
      )
    }
    
    return CardContent
  }
)
QuickActionCard.displayName = 'QuickActionCard'

/**
 * Grid container for QuickActionCards
 */
export const QuickActionGrid = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('grid grid-cols-2 gap-3', className)}>
    {children}
  </div>
)
