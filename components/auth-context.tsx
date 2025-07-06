"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  lastLogin: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, userId: string) => Promise<void>
  logout: () => void
  checkAuth: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check if user is logged in on mount
  useEffect(() => {
    const checkStoredAuth = () => {
      try {
        const storedUser = localStorage.getItem('tor-ramel-user')
        const authExpiry = localStorage.getItem('tor-ramel-auth-expiry')
        
        if (storedUser && authExpiry) {
          // Validate stored user is valid JSON
          if (storedUser === 'undefined' || storedUser === 'null') {
            console.warn('Invalid stored user data, clearing auth')
            localStorage.removeItem('tor-ramel-user')
            localStorage.removeItem('tor-ramel-auth-expiry')
            document.cookie = 'tor-ramel-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC'
            return
          }
          
          const expiryDate = new Date(authExpiry)
          const now = new Date()
          
          if (expiryDate > now) {
            try {
              const userData = JSON.parse(storedUser)
              setUser(userData)
              // Ensure cookie is set
              document.cookie = `tor-ramel-auth=true; path=/; expires=${expiryDate.toUTCString()}`
            } catch (parseError) {
              console.error('Error parsing stored user:', parseError)
              // Clear invalid data
              localStorage.removeItem('tor-ramel-user')
              localStorage.removeItem('tor-ramel-auth-expiry')
              document.cookie = 'tor-ramel-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC'
            }
          } else {
            // Session expired, clear storage
            localStorage.removeItem('tor-ramel-user')
            localStorage.removeItem('tor-ramel-auth-expiry')
            document.cookie = 'tor-ramel-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC'
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        // Clear potentially corrupted data
        localStorage.removeItem('tor-ramel-user')
        localStorage.removeItem('tor-ramel-auth-expiry')
        document.cookie = 'tor-ramel-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC'
      } finally {
        setIsLoading(false)
      }
    }

    checkStoredAuth()
  }, [])

  const login = async (email: string, userId: string) => {
    const userData: User = { 
      email, 
      id: userId,
      lastLogin: new Date().toISOString()
    }
    setUser(userData)
    
    // Set expiry for 7 days
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 7)
    
    // Store in localStorage for PWA persistence
    localStorage.setItem('tor-ramel-user', JSON.stringify(userData))
    localStorage.setItem('tor-ramel-auth-expiry', expiryDate.toISOString())
    
    // Set cookie manually for better PWA compatibility
    // Using Lax instead of Strict for better cross-context compatibility
    const cookieValue = JSON.stringify({ email, userId })
    const cookieString = `tor-ramel-auth=${encodeURIComponent(cookieValue)}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`
    document.cookie = cookieString
    
    console.log('✅ Auth set in localStorage and cookie')
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('tor-ramel-user')
    localStorage.removeItem('tor-ramel-auth-expiry')
    
    // Clear cookie with proper attributes
    document.cookie = 'tor-ramel-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax'
    
    router.push('/login')
  }

  const checkAuth = () => {
    return !!user
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, checkAuth }}>
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

// HOC for protecting pages
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedComponent(props: P) {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!isLoading && !user) {
        router.push('/login')
      }
    }, [user, isLoading, router])

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">טוען...</p>
          </div>
        </div>
      )
    }

    if (!user) {
      return null
    }

    return <Component {...props} />
  }
} 