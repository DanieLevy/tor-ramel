"use client"

import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

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

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })
      
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
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
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
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 