"use client"

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { 
  fadeVariants, 
  fadeUpVariants, 
  scaleVariants,
  slideRightVariants,
  durations,
  easeOut
} from '@/lib/animations'

// ============================================
// Animation Variants (using centralized config)
// ============================================

const variants = {
  fadeUp: fadeUpVariants,
  fadeScale: scaleVariants,
  slideFromRight: slideRightVariants,
  fade: fadeVariants,
} as const

// ============================================
// Page Transition Component
// ============================================

interface PageTransitionProps {
  children: ReactNode
  variant?: keyof typeof variants
  className?: string
}

/**
 * Wraps page content with smooth transitions
 * Uses the current pathname as a key to trigger animations on navigation
 * Optimized: No mode="wait" to prevent flash/delay
 */
export function PageTransition({ 
  children, 
  variant = 'fade',
  className 
}: PageTransitionProps) {
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()
  
  // Simple fade for reduced motion
  const animationVariant = prefersReducedMotion ? fadeVariants : variants[variant]

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={animationVariant}
        className={className}
        style={{
          // GPU acceleration
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================
// Staggered Children Animation
// ============================================

interface StaggerContainerProps {
  children: ReactNode
  staggerDelay?: number
  className?: string
}

/**
 * Container for staggered child animations
 * Optimized with faster stagger timing
 */
export function StaggerContainer({ 
  children, 
  staggerDelay = 0.04,
  className 
}: StaggerContainerProps) {
  const prefersReducedMotion = useReducedMotion()
  
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.05,
          }
        },
        exit: {}
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Item to be animated within a StaggerContainer
 * Optimized with faster animation
 */
export function StaggerItem({ 
  children, 
  className 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <motion.div 
      variants={{
        initial: { opacity: 0, y: 8 },
        animate: { 
          opacity: 1, 
          y: 0,
          transition: { duration: durations.fast, ease: easeOut }
        },
        exit: { opacity: 0 }
      }}
      className={className}
      style={{ transform: 'translateZ(0)' }}
    >
      {children}
    </motion.div>
  )
}

// ============================================
// Fade In When Visible
// ============================================

interface FadeInWhenVisibleProps {
  children: ReactNode
  delay?: number
  className?: string
}

/**
 * Fades in content when it becomes visible in viewport
 * GPU-optimized
 */
export function FadeInWhenVisible({ 
  children, 
  delay = 0,
  className 
}: FadeInWhenVisibleProps) {
  const prefersReducedMotion = useReducedMotion()
  
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        duration: durations.normal, 
        delay,
        ease: easeOut
      }}
      className={className}
      style={{ transform: 'translateZ(0)' }}
    >
      {children}
    </motion.div>
  )
}

// ============================================
// Hover/Tap Interactions
// ============================================

interface InteractiveProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
}

/**
 * Adds micro-interaction animations to interactive elements
 * Use sparingly - prefer CSS :active/:hover for simple effects
 */
export function Interactive({ 
  children, 
  className,
  onClick,
  disabled = false
}: InteractiveProps) {
  const prefersReducedMotion = useReducedMotion()
  
  if (prefersReducedMotion || disabled) {
    return (
      <div 
        className={className} 
        onClick={disabled ? undefined : onClick}
        style={{ cursor: disabled ? 'default' : onClick ? 'pointer' : 'default' }}
      >
        {children}
      </div>
    )
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: durations.instant }}
      className={className}
      onClick={disabled ? undefined : onClick}
      style={{ 
        cursor: disabled ? 'default' : onClick ? 'pointer' : 'default',
        transform: 'translateZ(0)',
      }}
    >
      {children}
    </motion.div>
  )
}

// ============================================
// Scale on Hover (for cards, buttons)
// Prefer CSS .interactive-scale class when possible
// ============================================

export function ScaleOnHover({ 
  children, 
  className 
}: { 
  children: ReactNode
  className?: string 
}) {
  const prefersReducedMotion = useReducedMotion()
  
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: durations.instant }}
      className={className}
      style={{ transform: 'translateZ(0)' }}
    >
      {children}
    </motion.div>
  )
}

// ============================================
// Pulse Animation (for notifications, alerts)
// Prefer CSS .animate-pulse class when possible
// ============================================

export function Pulse({ 
  children, 
  className 
}: { 
  children: ReactNode
  className?: string 
}) {
  const prefersReducedMotion = useReducedMotion()
  
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      animate={{ 
        scale: [1, 1.02, 1],
        opacity: [1, 0.85, 1]
      }}
      transition={{ 
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Re-export animation utilities
export { variants as animations }