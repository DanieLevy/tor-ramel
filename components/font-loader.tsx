'use client'

import { useEffect } from 'react'

export function FontLoader() {
  useEffect(() => {
    // Font loading optimization for PWA
    const loadFonts = async () => {
      try {
        // Check if Font Loading API is available
        if (!('fonts' in document)) {
          console.warn('[FontLoader] Font Loading API not supported')
          return
        }
        
        // Define fonts to load
        const fontDefinitions = [
          { weight: '400', name: 'Ploni', file: '/fonts/ploni-regular-aaa.otf' },
          { weight: '300', name: 'Ploni', file: '/fonts/ploni-light-aaa.otf' },
          { weight: '200', name: 'Ploni', file: '/fonts/ploni-ultralight-aaa.otf' }
        ]
        
        // Check if fonts are already loaded
        let allLoaded = true
        for (const font of fontDefinitions) {
          if (!document.fonts.check(`${font.weight} 1em ${font.name}`)) {
            allLoaded = false
            break
          }
        }
        
        if (allLoaded) {
          console.log('[FontLoader] All fonts already loaded from cache')
          document.body.classList.add('fonts-loaded')
          return
        }
        
        // Load fonts
        const fontPromises = fontDefinitions.map(font => 
          document.fonts.load(`${font.weight} 1em ${font.name}`)
            .catch(err => {
              console.error(`[FontLoader] Failed to load ${font.file}:`, err)
              return null
            })
        )
        
        const results = await Promise.all(fontPromises)
        const successCount = results.filter(r => r !== null).length
        
        if (successCount > 0) {
          console.log(`[FontLoader] ${successCount}/${fontDefinitions.length} fonts loaded successfully`)
          document.body.classList.add('fonts-loaded')
        } else {
          console.error('[FontLoader] All fonts failed to load')
          document.body.classList.add('fonts-failed')
        }
        
        // Log font status for debugging
        if (process.env.NODE_ENV === 'development') {
          document.fonts.ready.then(() => {
            console.log('[FontLoader] Font loading complete. Status:')
            fontDefinitions.forEach(font => {
              const loaded = document.fonts.check(`${font.weight} 1em ${font.name}`)
              console.log(`  ${font.file}: ${loaded ? '✅ Loaded' : '❌ Not loaded'}`)
            })
          })
        }
      } catch (error) {
        console.error('[FontLoader] Error in font loading process:', error)
        document.body.classList.add('fonts-failed')
      }
    }
    
    // Start loading fonts
    loadFonts()
    
    // PWA-specific font loading check
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Request font pre-caching if not already done
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_FONTS',
        fonts: [
          '/fonts/ploni-regular-aaa.otf',
          '/fonts/ploni-light-aaa.otf',
          '/fonts/ploni-ultralight-aaa.otf'
        ]
      })
    }
  }, [])
  
  return null
} 