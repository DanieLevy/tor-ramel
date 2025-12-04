'use client'

import { useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'

/**
 * iOS 26 Dynamic Theme Color
 * Syncs PWA status bar and notch area with app theme
 * Provides smooth transitions for Liquid Glass aesthetic
 */

// iOS 26 Liquid Glass color palette
const THEME_COLORS = {
  light: {
    default: '#ffffff',
    translucent: 'rgba(255, 255, 255, 0.85)',
    // Slight warmth for Liquid Glass effect
    glass: '#f8f8fa',
  },
  dark: {
    default: '#000000',
    translucent: 'rgba(0, 0, 0, 0.85)',
    // Deep dark for Liquid Glass
    glass: '#0a0a0c',
  }
} as const

export function DynamicThemeColor() {
  const pathname = usePathname()
  const { theme, resolvedTheme } = useTheme()

  const updateThemeColor = useCallback(() => {
    // Determine if we're in dark mode
    const isDark = resolvedTheme === 'dark' || 
                   (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    const colors = isDark ? THEME_COLORS.dark : THEME_COLORS.light
    
    // Get or create theme-color meta tags
    let lightMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]') as HTMLMetaElement
    let darkMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]') as HTMLMetaElement
    let defaultMeta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement
    
    if (!lightMeta) {
      lightMeta = document.createElement('meta')
      lightMeta.setAttribute('name', 'theme-color')
      lightMeta.setAttribute('media', '(prefers-color-scheme: light)')
      document.head.appendChild(lightMeta)
    }
    
    if (!darkMeta) {
      darkMeta = document.createElement('meta')
      darkMeta.setAttribute('name', 'theme-color')
      darkMeta.setAttribute('media', '(prefers-color-scheme: dark)')
      document.head.appendChild(darkMeta)
    }
    
    if (!defaultMeta) {
      defaultMeta = document.createElement('meta')
      defaultMeta.setAttribute('name', 'theme-color')
      document.head.appendChild(defaultMeta)
    }
    
    // Set colors based on current theme
    // Use glass color for seamless Liquid Glass effect
    lightMeta.setAttribute('content', THEME_COLORS.light.glass)
    darkMeta.setAttribute('content', THEME_COLORS.dark.glass)
    defaultMeta.setAttribute('content', colors.glass)
    
    // Update apple-mobile-web-app-status-bar-style for iOS
    // 'black-translucent' allows content to flow under status bar for Liquid Glass effect
    let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement
    if (!statusBarMeta) {
      statusBarMeta = document.createElement('meta')
      statusBarMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style')
      document.head.appendChild(statusBarMeta)
    }
    statusBarMeta.setAttribute('content', 'black-translucent')
    
    // Ensure apple-mobile-web-app-capable is set
    let capableMeta = document.querySelector('meta[name="apple-mobile-web-app-capable"]') as HTMLMetaElement
    if (!capableMeta) {
      capableMeta = document.createElement('meta')
      capableMeta.setAttribute('name', 'apple-mobile-web-app-capable')
      capableMeta.setAttribute('content', 'yes')
      document.head.appendChild(capableMeta)
    }
    
    // Update CSS custom property for runtime access
    document.documentElement.style.setProperty('--status-bar-color', colors.glass)
    
  }, [theme, resolvedTheme])

  useEffect(() => {
    // Initial update
    updateThemeColor()
    
    // Update on theme change via class mutation
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' || mutation.attributeName === 'style') {
          updateThemeColor()
        }
      })
    })
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style']
    })
    
    // Also listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        updateThemeColor()
      }
    }
    
    mediaQuery.addEventListener('change', handleSystemThemeChange)
    
    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [pathname, updateThemeColor, theme])

  return null // This component doesn't render anything
}
