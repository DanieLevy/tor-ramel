"use client"

import { motion, AnimatePresence, Variants } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

// ============================================
// Animation Variants
// ============================================

const fadeUp: Variants = {
  initial: { opacity: 0, y: 20 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] // iOS spring-like easing
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { 
      duration: 0.2,
      ease: [0.22, 1, 0.36, 1]
    }
  }
}

const fadeScale: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  enter: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.25,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.98,
    transition: { 
      duration: 0.15,
      ease: [0.22, 1, 0.36, 1]
    }
  }
}

const slideFromRight: Variants = {
  initial: { opacity: 0, x: 30 },
  enter: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: { 
    opacity: 0, 
    x: -30,
    transition: { 
      duration: 0.2,
      ease: [0.22, 1, 0.36, 1]
    }
  }
}

const slideFromBottom: Variants = {
  initial: { opacity: 0, y: '100%' },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 30
    }
  },
  exit: { 
    opacity: 0, 
    y: '100%',
    transition: { 
      duration: 0.2
    }
  }
}

export const animations = {
  fadeUp,
  fadeScale,
  slideFromRight,
  slideFromBottom
} as const

// ============================================
// Page Transition Component
// ============================================

interface PageTransitionProps {
  children: ReactNode
  variant?: keyof typeof animations
  className?: string
}

/**
 * Wraps page content with smooth transitions
 * Uses the current pathname as a key to trigger animations on navigation
 */
export function PageTransition({ 
  children, 
  variant = 'fadeUp',
  className 
}: PageTransitionProps) {
  const pathname = usePathname()
  const animationVariant = animations[variant]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={animationVariant}
        className={className}
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

const staggerContainer: Variants = {
  initial: {},
  enter: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1
    }
  },
  exit: {
    transition: {
      staggerChildren: 0.04,
      staggerDirection: -1
    }
  }
}

const staggerItem: Variants = {
  initial: { opacity: 0, y: 15 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { 
      duration: 0.2
    }
  }
}

/**
 * Container for staggered child animations
 */
export function StaggerContainer({ 
  children, 
  staggerDelay = 0.06,
  className 
}: StaggerContainerProps) {
  const customVariants: Variants = {
    ...staggerContainer,
    enter: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1
      }
    }
  }

  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={customVariants}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Item to be animated within a StaggerContainer
 */
export function StaggerItem({ 
  children, 
  className 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
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
 */
export function FadeInWhenVisible({ 
  children, 
  delay = 0,
  className 
}: FadeInWhenVisibleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        duration: 0.4, 
        delay,
        ease: [0.22, 1, 0.36, 1]
      }}
      className={className}
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
 */
export function Interactive({ 
  children, 
  className,
  onClick,
  disabled = false
}: InteractiveProps) {
  return (
    <motion.div
      whileHover={disabled ? {} : { scale: 1.02, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
      onClick={disabled ? undefined : onClick}
      style={{ cursor: disabled ? 'default' : 'pointer' }}
    >
      {children}
    </motion.div>
  )
}

// ============================================
// Scale on Hover (for cards, buttons)
// ============================================

export function ScaleOnHover({ 
  children, 
  className 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ============================================
// Pulse Animation (for notifications, alerts)
// ============================================

export function Pulse({ 
  children, 
  className 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <motion.div
      animate={{ 
        scale: [1, 1.02, 1],
        opacity: [1, 0.8, 1]
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

