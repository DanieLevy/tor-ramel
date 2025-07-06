"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface HeaderConfig {
  title?: string
  showBackButton?: boolean
  showMenu?: boolean
  customActions?: ReactNode
  className?: string
}

interface HeaderContextType {
  config: HeaderConfig
  setConfig: (config: HeaderConfig) => void
  updateConfig: (updates: Partial<HeaderConfig>) => void
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined)

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<HeaderConfig>({
    title: 'תור רם-אל',
    showBackButton: false,
    showMenu: true,
  })

  // Memoize updateConfig to prevent infinite loops
  const updateConfig = useCallback((updates: Partial<HeaderConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  return (
    <HeaderContext.Provider value={{ config, setConfig, updateConfig }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeaderContext() {
  const context = useContext(HeaderContext)
  if (!context) {
    throw new Error('useHeaderContext must be used within HeaderProvider')
  }
  return context
}

// Hook for pages to use
export function useHeader() {
  const { updateConfig } = useHeaderContext()
  
  // Only run cleanup on unmount, not on updateConfig changes
  React.useEffect(() => {
    return () => {
      // Reset to defaults when component unmounts
      updateConfig({
        title: 'תור רם-אל',
        showBackButton: false,
        showMenu: true,
        customActions: undefined,
      })
    }
  }, []) // Empty dependency array - only run on mount/unmount
  
  return updateConfig
} 