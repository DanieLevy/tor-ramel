/**
 * iOS 26 Liquid Glass Design System
 * Translucent, frosted glass aesthetic with soft shadows and large radii
 */

// Blur values for different glass intensities
export const glassBlur = {
  subtle: '8px',
  light: '12px',
  medium: '16px',
  strong: '20px',
  intense: '24px',
} as const

// Background colors with transparency
export const glassBackground = {
  light: {
    subtle: 'rgba(255, 255, 255, 0.5)',
    medium: 'rgba(255, 255, 255, 0.7)',
    strong: 'rgba(255, 255, 255, 0.85)',
    solid: 'rgba(255, 255, 255, 0.95)',
  },
  dark: {
    subtle: 'rgba(30, 30, 30, 0.5)',
    medium: 'rgba(30, 30, 30, 0.7)',
    strong: 'rgba(30, 30, 30, 0.85)',
    solid: 'rgba(20, 20, 20, 0.95)',
  },
} as const

// Border colors for glass effect
export const glassBorder = {
  light: {
    subtle: 'rgba(255, 255, 255, 0.2)',
    medium: 'rgba(255, 255, 255, 0.3)',
    strong: 'rgba(255, 255, 255, 0.4)',
  },
  dark: {
    subtle: 'rgba(255, 255, 255, 0.08)',
    medium: 'rgba(255, 255, 255, 0.12)',
    strong: 'rgba(255, 255, 255, 0.18)',
  },
} as const

// Shadow system for depth
export const glassShadow = {
  subtle: '0 2px 8px rgba(0, 0, 0, 0.06)',
  medium: '0 4px 16px rgba(0, 0, 0, 0.08)',
  strong: '0 8px 32px rgba(0, 0, 0, 0.12)',
  elevated: '0 12px 48px rgba(0, 0, 0, 0.16)',
} as const

// iOS 26 uses larger border radii
export const glassRadius = {
  sm: '12px',
  md: '16px',
  lg: '20px',
  xl: '24px',
  '2xl': '28px',
  '3xl': '32px',
  full: '9999px',
} as const

// Animation timing for glass transitions
export const glassTransition = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  spring: '400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

// Tailwind class utilities for glass effects
export const glassClasses = {
  // Base glass effect
  base: 'backdrop-blur-lg bg-white/70 dark:bg-black/70 border border-white/30 dark:border-white/10',
  
  // Subtle glass (lighter blur, more transparent)
  subtle: 'backdrop-blur-md bg-white/50 dark:bg-black/50 border border-white/20 dark:border-white/8',
  
  // Strong glass (heavier blur, less transparent)
  strong: 'backdrop-blur-xl bg-white/85 dark:bg-black/85 border border-white/40 dark:border-white/15',
  
  // Elevated glass with shadow
  elevated: 'backdrop-blur-xl bg-white/80 dark:bg-black/80 border border-white/30 dark:border-white/12 shadow-lg',
  
  // Navigation bar style
  nav: 'backdrop-blur-2xl bg-white/75 dark:bg-black/75 border-b border-white/20 dark:border-white/10',
  
  // Card style
  card: 'backdrop-blur-lg bg-white/60 dark:bg-black/60 border border-white/25 dark:border-white/10 rounded-2xl shadow-md',
  
  // Modal/Dialog overlay
  overlay: 'backdrop-blur-sm bg-black/30 dark:bg-black/50',
  
  // Modal content
  modal: 'backdrop-blur-2xl bg-white/90 dark:bg-gray-900/90 border border-white/30 dark:border-white/10 rounded-3xl shadow-2xl',
} as const

// CSS custom properties for glass effects
export const glassCSSVars = `
  --glass-blur: 20px;
  --glass-blur-subtle: 12px;
  --glass-blur-strong: 28px;
  
  --glass-bg-light: rgba(255, 255, 255, 0.7);
  --glass-bg-light-subtle: rgba(255, 255, 255, 0.5);
  --glass-bg-light-strong: rgba(255, 255, 255, 0.85);
  
  --glass-bg-dark: rgba(30, 30, 30, 0.7);
  --glass-bg-dark-subtle: rgba(30, 30, 30, 0.5);
  --glass-bg-dark-strong: rgba(30, 30, 30, 0.85);
  
  --glass-border-light: rgba(255, 255, 255, 0.3);
  --glass-border-dark: rgba(255, 255, 255, 0.1);
  
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  --glass-shadow-elevated: 0 12px 48px rgba(0, 0, 0, 0.15);
  
  --glass-radius-sm: 12px;
  --glass-radius-md: 16px;
  --glass-radius-lg: 20px;
  --glass-radius-xl: 24px;
  --glass-radius-2xl: 28px;
  --glass-radius-3xl: 32px;
`

// Type exports
export type GlassBlur = keyof typeof glassBlur
export type GlassBackgroundLight = keyof typeof glassBackground.light
export type GlassBackgroundDark = keyof typeof glassBackground.dark
export type GlassBorder = keyof typeof glassBorder.light
export type GlassShadow = keyof typeof glassShadow
export type GlassRadius = keyof typeof glassRadius
export type GlassTransition = keyof typeof glassTransition
export type GlassClass = keyof typeof glassClasses



