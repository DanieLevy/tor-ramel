/**
 * Centralized Animation Configuration
 * 
 * This module provides consistent, performant animations across the app.
 * All animations are GPU-optimized and respect reduced-motion preferences.
 */

import { Variants, Transition, useReducedMotion } from 'framer-motion'

// ============================================
// iOS-style Timing Functions
// ============================================

/** Standard iOS easing - smooth and natural */
export const easeOut = [0.22, 1, 0.36, 1] as const

/** iOS spring-like easing for bouncy effects */
export const easeSpring = [0.34, 1.56, 0.64, 1] as const

/** Quick ease for micro-interactions */
export const easeQuick = [0.4, 0, 0.2, 1] as const

// ============================================
// Standard Durations
// ============================================

export const durations = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  page: 0.25,
} as const

// ============================================
// Spring Configurations
// ============================================

export const springs = {
  /** Snappy spring for buttons and quick interactions */
  snappy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
  },
  /** Gentle spring for page transitions */
  gentle: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  },
  /** Bouncy spring for playful elements */
  bouncy: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 25,
  },
} as const

// ============================================
// Reduced Motion Safe Variants
// These automatically disable animations when user prefers reduced motion
// ============================================

/** Creates a reduced-motion safe variant */
export const createSafeVariant = (
  full: Variants,
  reduced: Variants = { initial: {}, animate: {}, exit: {} }
): Variants => {
  return full // Reduced motion is handled via CSS media query
}

// ============================================
// Fade Variants
// ============================================

export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: durations.normal, ease: easeOut }
  },
  exit: { 
    opacity: 0,
    transition: { duration: durations.fast, ease: easeOut }
  }
}

export const fadeUpVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: durations.normal, ease: easeOut }
  },
  exit: { 
    opacity: 0, 
    y: -8,
    transition: { duration: durations.fast, ease: easeOut }
  }
}

export const fadeDownVariants: Variants = {
  initial: { opacity: 0, y: -12 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: durations.normal, ease: easeOut }
  },
  exit: { 
    opacity: 0, 
    y: 8,
    transition: { duration: durations.fast, ease: easeOut }
  }
}

// ============================================
// Scale Variants
// ============================================

export const scaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: durations.fast, ease: easeOut }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: durations.instant, ease: easeOut }
  }
}

export const popVariants: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: springs.bouncy
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    transition: { duration: durations.fast }
  }
}

// ============================================
// Slide Variants
// ============================================

export const slideRightVariants: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: durations.normal, ease: easeOut }
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: { duration: durations.fast, ease: easeOut }
  }
}

export const slideLeftVariants: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: durations.normal, ease: easeOut }
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: { duration: durations.fast, ease: easeOut }
  }
}

export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: '100%' },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: springs.gentle
  },
  exit: { 
    opacity: 0, 
    y: '100%',
    transition: { duration: durations.fast }
  }
}

// ============================================
// Stagger Container Variants
// ============================================

export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    }
  },
  exit: {
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    }
  }
}

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: durations.fast, ease: easeOut }
  },
  exit: { 
    opacity: 0, 
    y: -5,
    transition: { duration: durations.instant }
  }
}

// Faster stagger for lists
export const fastStaggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.02,
    }
  },
  exit: {}
}

// ============================================
// Interactive Element Variants
// ============================================

/** For buttons and clickable cards - use CSS instead when possible */
export const tapVariants = {
  tap: { scale: 0.97 },
  hover: { scale: 1.02 },
}

/** Subtle press effect */
export const pressVariants = {
  tap: { scale: 0.98 },
}

// ============================================
// Transition Presets
// ============================================

export const transitions = {
  /** Default transition for most animations */
  default: {
    duration: durations.normal,
    ease: easeOut,
  } as Transition,
  
  /** Fast transition for micro-interactions */
  fast: {
    duration: durations.fast,
    ease: easeQuick,
  } as Transition,
  
  /** Spring transition for natural movement */
  spring: springs.snappy as Transition,
  
  /** Gentle spring for larger elements */
  gentleSpring: springs.gentle as Transition,
}

// ============================================
// Hook: useAnimationConfig
// Returns animation-safe configurations based on reduced motion preference
// ============================================

export const useAnimationConfig = () => {
  const prefersReducedMotion = useReducedMotion()
  
  return {
    prefersReducedMotion,
    
    /** Get appropriate variants based on motion preference */
    getVariants: (fullVariants: Variants): Variants => {
      if (prefersReducedMotion) {
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        }
      }
      return fullVariants
    },
    
    /** Get appropriate transition based on motion preference */
    getTransition: (transition: Transition): Transition => {
      if (prefersReducedMotion) {
        return { duration: 0.01 }
      }
      return transition
    },
  }
}

// ============================================
// CSS Animation Class Names
// Use these for simple animations instead of Framer Motion
// ============================================

export const cssAnimations = {
  fadeIn: 'animate-in fade-in duration-200',
  fadeOut: 'animate-out fade-out duration-150',
  slideInUp: 'animate-in slide-in-from-bottom-2 duration-200',
  slideInDown: 'animate-in slide-in-from-top-2 duration-200',
  slideInLeft: 'animate-in slide-in-from-left-2 duration-200',
  slideInRight: 'animate-in slide-in-from-right-2 duration-200',
  scaleIn: 'animate-in zoom-in-95 duration-150',
  scaleOut: 'animate-out zoom-out-95 duration-100',
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
} as const

// ============================================
// GPU Optimization Styles
// Apply these to animated elements for better performance
// ============================================

export const gpuStyles = {
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden' as const,
  willChange: 'transform',
} as const

export const blurGpuStyles = {
  ...gpuStyles,
  willChange: 'transform, backdrop-filter',
} as const
