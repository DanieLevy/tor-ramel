'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth, fetchJSON } from '@/lib/auth/fetch-wrapper'

interface User {
  id: string
  email: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, confirmPassword: string) => Promise<any>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check auth status on mount
  useEffect(() => {
    checkAuth()
  }, [])

  // Set up periodic token refresh
  useEffect(() => {
    if (!user) {
      return
    }

    // Refresh token every 12 hours (before the 24-hour expiration)
    const refreshInterval = 12 * 60 * 60 * 1000 // 12 hours in milliseconds
    
    console.log('⏰ Setting up periodic token refresh (every 12 hours)')
    
    const intervalId = setInterval(() => {
      console.log('🔄 Performing periodic token refresh...')
      refreshAuth()
    }, refreshInterval)

    // Also refresh on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('👁️ Tab became visible, checking token freshness...')
        // Refresh if it's been more than 6 hours since last activity
        const lastRefresh = localStorage.getItem('lastTokenRefresh')
        const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000)
        
        if (!lastRefresh || parseInt(lastRefresh) < sixHoursAgo) {
          console.log('🔄 Token might be stale, refreshing...')
          refreshAuth()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  const checkAuth = async () => {
    try {
      const response = await fetchWithAuth('/api/auth/me')
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        // Not JSON response (probably HTML error page)
        setUser(null)
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        setUser({
          id: data.user.id,
          email: data.user.email
        })
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    // Use regular fetch for login to avoid refresh loops
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Login failed')
    }

    const data = await response.json()
    setUser({
      id: data.user.id,
      email: data.user.email
    })

    // Redirect to home or return URL
    const params = new URLSearchParams(window.location.search)
    const from = params.get('from') || '/'
    router.push(from)
  }

  const register = async (email: string, password: string, confirmPassword: string) => {
    // Use regular fetch for register to avoid refresh loops
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, confirmPassword }),
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Registration failed')
    }

    const data = await response.json()
    setUser({
      id: data.user.id,
      email: data.user.email
    })

    // Redirect to home after successful registration
    router.push('/')
    
    // Return the full response data including message
    return data
  }

  const logout = async () => {
    try {
      // Use regular fetch for logout
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' 
      })
      
      // Notify service worker to clear auth-sensitive caches
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'LOGOUT'
        })
        console.log('🧹 Notified service worker to clear auth caches')
      }
      
      // Clear local storage
      localStorage.removeItem('lastTokenRefresh')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      router.push('/login')
    }
  }

  const refreshAuth = async () => {
    try {
      // Use regular fetch for refresh to avoid loops
      const response = await fetch('/api/auth/refresh', { 
        method: 'POST',
        credentials: 'include'
      })
      if (response.ok) {
        // Store refresh timestamp
        localStorage.setItem('lastTokenRefresh', Date.now().toString())
        
        // Re-check auth status after refresh
        await checkAuth()
        console.log('✅ Token refreshed successfully')
      } else {
        // Refresh failed, user needs to login again
        console.error('❌ Token refresh failed')
        setUser(null)
        router.push('/login')
      }
    } catch (error) {
      console.error('Refresh error:', error)
      setUser(null)
      router.push('/login')
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      register,
      logout,
      refreshAuth
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
} 