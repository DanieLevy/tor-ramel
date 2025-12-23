"use client"

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { Skeleton } from './skeleton'

// ============================================
// Spinner Component
// ============================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Spinner = ({ size = 'md', className }: SpinnerProps) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <Loader2 
      className={cn(
        "animate-spin text-primary",
        sizes[size],
        className
      )} 
    />
  )
}

// ============================================
// Full Page Loading
// ============================================

interface PageLoadingProps {
  message?: string
}

export const PageLoading = ({ message = 'טוען...' }: PageLoadingProps) => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-4"
    >
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-2 border-primary/20 mx-auto" />
        <Loader2 className="h-12 w-12 animate-spin text-primary absolute inset-0 mx-auto" />
      </div>
      <p className="text-muted-foreground text-sm">{message}</p>
    </motion.div>
  </div>
)

// ============================================
// Button Loading State
// ============================================

interface ButtonLoadingProps {
  children: React.ReactNode
  isLoading: boolean
  loadingText?: string
}

export const ButtonLoading = ({ 
  children, 
  isLoading, 
  loadingText 
}: ButtonLoadingProps) => (
  <>
    {isLoading ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        {loadingText && <span>{loadingText}</span>}
      </>
    ) : (
      children
    )}
  </>
)

// ============================================
// Card Skeleton
// ============================================

interface CardSkeletonProps {
  className?: string
  lines?: number
  showAvatar?: boolean
  showAction?: boolean
}

export const CardSkeleton = ({ 
  className,
  lines = 2,
  showAvatar = false,
  showAction = false
}: CardSkeletonProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className={cn(
      "rounded-2xl border border-border bg-card p-4 space-y-3",
      className
    )}
  >
    <div className="flex items-start gap-3">
      {showAvatar && (
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
      )}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              "h-3",
              i === lines - 1 ? "w-1/2" : "w-full"
            )} 
          />
        ))}
      </div>
      {showAction && (
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
      )}
    </div>
  </motion.div>
)

// ============================================
// Stats Card Skeleton
// ============================================

export const StatsCardSkeleton = ({ className }: { className?: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className={cn(
      "rounded-2xl border border-border bg-card p-4",
      className
    )}
  >
    <div className="flex items-center gap-3">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  </motion.div>
)

// ============================================
// Subscription List Skeleton
// ============================================

export const SubscriptionListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        className="rounded-xl p-3 flex items-center gap-3 border bg-card"
      >
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </motion.div>
    ))}
  </div>
)

// ============================================
// Appointment Banner Skeleton
// ============================================

export const AppointmentBannerSkeleton = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-border bg-card p-4 space-y-3"
  >
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-28 rounded-full" />
      <Skeleton className="h-4 w-4 rounded-full" />
    </div>
    <div className="flex items-start gap-3">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-7 w-14 rounded-lg" />
      <Skeleton className="h-7 w-14 rounded-lg" />
      <Skeleton className="h-7 w-14 rounded-lg" />
    </div>
    <Skeleton className="h-12 w-full rounded-xl" />
  </motion.div>
)

// ============================================
// Inline Loading
// ============================================

export const InlineLoading = ({ text }: { text?: string }) => (
  <span className="inline-flex items-center gap-2 text-muted-foreground">
    <Loader2 className="h-3 w-3 animate-spin" />
    {text && <span className="text-sm">{text}</span>}
  </span>
)

// ============================================
// Pulse Dot (for live indicators)
// ============================================

interface PulseDotProps {
  color?: 'green' | 'orange' | 'red' | 'blue'
  size?: 'sm' | 'md'
}

export const PulseDot = ({ color = 'green', size = 'sm' }: PulseDotProps) => {
  const colors = {
    green: 'bg-emerald-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500'
  }

  const sizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2'
  }

  return (
    <span className="relative flex">
      <span className={cn(
        "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
        colors[color]
      )} />
      <span className={cn(
        "relative inline-flex rounded-full",
        sizes[size],
        colors[color]
      )} />
    </span>
  )
}

// ============================================
// Empty State
// ============================================

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export const EmptyState = ({ 
  icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      "flex flex-col items-center justify-center py-12 text-center",
      className
    )}
  >
    {icon && (
      <div className="mb-4 p-3 rounded-2xl bg-muted/50">
        {icon}
      </div>
    )}
    <h3 className="font-semibold text-base mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">
        {description}
      </p>
    )}
    {action}
  </motion.div>
)

