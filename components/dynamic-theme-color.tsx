'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Dynamic theme color for PWA status bar and notch area
 * Matches the page background color for seamless iOS experience
 */
export function DynamicThemeColor() {
  const pathname = usePathname()

  useEffect(() => {
    // Update theme color based on page and theme
    const updateThemeColor = () => {
      // Get computed background color
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--background')
      const isDark = document.documentElement.classList.contains('dark')
      
      // Get or create theme-color meta tags
      let lightMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]')
      let darkMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]')
      let defaultMeta = document.querySelector('meta[name="theme-color"]:not([media])')
      
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
      
      // Always use light color for notch - even when device is in dark mode
      // This ensures the notch area stays light regardless of system theme
      const lightColor = '#ffffff' // Always white for notch area
      
      lightMeta.setAttribute('content', lightColor)
      darkMeta.setAttribute('content', lightColor) // Force light even in dark mode
      defaultMeta.setAttribute('content', lightColor) // Always light
      
      // Also update apple-mobile-web-app-status-bar-style for iOS
      let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
      if (!statusBarMeta) {
        statusBarMeta = document.createElement('meta')
        statusBarMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style')
        document.head.appendChild(statusBarMeta)
      }
      statusBarMeta.setAttribute('content', 'black-translucent')
    }

    // Initial update
    updateThemeColor()
    
    // Update on theme change
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateThemeColor()
        }
      })
    })
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [pathname])

  return null // This component doesn't render anything
}

