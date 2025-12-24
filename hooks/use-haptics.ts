/**
 * iOS 26 Haptic Feedback Hook
 * Provides native-feeling tactile feedback for PWA interactions
 */

import { useCallback, useMemo } from 'react'

type HapticPattern = VibratePattern

interface HapticFeedback {
  /** Light tap - for subtle confirmations */
  light: () => void
  /** Medium tap - for standard interactions */
  medium: () => void
  /** Heavy tap - for important actions */
  heavy: () => void
  /** Success pattern - for positive confirmations */
  success: () => void
  /** Error pattern - for errors and warnings */
  error: () => void
  /** Warning pattern - for caution states */
  warning: () => void
  /** Selection changed - for picker/toggle changes */
  selection: () => void
  /** Impact - for button presses */
  impact: () => void
  /** Notification arrived - for push notifications */
  notification: () => void
  /** Custom pattern */
  custom: (pattern: HapticPattern) => void
  /** Check if haptics are supported */
  isSupported: boolean
}

// Haptic patterns (in milliseconds)
const PATTERNS: Record<string, HapticPattern> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  error: [50, 100, 50],
  warning: [30, 50, 30],
  selection: 8,
  impact: 15,
  notification: [15, 100, 15, 100, 30],
}

/**
 * Hook for haptic feedback on iOS and Android devices
 * Falls back gracefully on unsupported devices
 * Returns a stable object reference to prevent unnecessary re-renders
 */
export const useHaptics = (): HapticFeedback => {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator

  const vibrate = useCallback((pattern: HapticPattern): void => {
    if (!isSupported) return
    
    try {
      navigator.vibrate(pattern)
    } catch (e) {
      // Silently fail - haptics are enhancement only
      console.debug('Haptic feedback failed:', e)
    }
  }, [isSupported])

  const light = useCallback(() => vibrate(PATTERNS.light), [vibrate])
  const medium = useCallback(() => vibrate(PATTERNS.medium), [vibrate])
  const heavy = useCallback(() => vibrate(PATTERNS.heavy), [vibrate])
  const success = useCallback(() => vibrate(PATTERNS.success), [vibrate])
  const error = useCallback(() => vibrate(PATTERNS.error), [vibrate])
  const warning = useCallback(() => vibrate(PATTERNS.warning), [vibrate])
  const selection = useCallback(() => vibrate(PATTERNS.selection), [vibrate])
  const impact = useCallback(() => vibrate(PATTERNS.impact), [vibrate])
  const notification = useCallback(() => vibrate(PATTERNS.notification), [vibrate])
  const custom = useCallback((pattern: HapticPattern) => vibrate(pattern), [vibrate])

  // Return a stable object reference using useMemo to prevent re-renders
  // when this hook's return value is used in dependency arrays
  return useMemo(() => ({
    light,
    medium,
    heavy,
    success,
    error,
    warning,
    selection,
    impact,
    notification,
    custom,
    isSupported,
  }), [light, medium, heavy, success, error, warning, selection, impact, notification, custom, isSupported])
}

/**
 * Standalone haptic functions for use outside of React components
 */
export const haptics = {
  light: () => navigator?.vibrate?.(PATTERNS.light),
  medium: () => navigator?.vibrate?.(PATTERNS.medium),
  heavy: () => navigator?.vibrate?.(PATTERNS.heavy),
  success: () => navigator?.vibrate?.(PATTERNS.success),
  error: () => navigator?.vibrate?.(PATTERNS.error),
  warning: () => navigator?.vibrate?.(PATTERNS.warning),
  selection: () => navigator?.vibrate?.(PATTERNS.selection),
  impact: () => navigator?.vibrate?.(PATTERNS.impact),
  notification: () => navigator?.vibrate?.(PATTERNS.notification),
  custom: (pattern: HapticPattern) => navigator?.vibrate?.(pattern),
}

export default useHaptics

