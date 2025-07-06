import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// PWA-safe fetch wrapper that ensures cookies are properly included
export function pwaFetch(url: string, options: RequestInit = {}) {
  // Always include credentials for PWA compatibility
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }
  
  return fetch(url, { ...defaultOptions, ...options })
}

// Helper to check if running as installed PWA
export function isRunningAsPWA() {
  if (typeof window === 'undefined') return false
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as any).standalone === true) ||
    document.referrer.includes('android-app://') ||
    window.navigator.userAgent.includes('PWA')
  )
}
