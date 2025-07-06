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
  login: (user: User) => void
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
          const expiryDate = new Date(authExpiry)
          const now = new Date()
          
          if (expiryDate > now) {
            setUser(JSON.parse(storedUser))
            // Ensure cookie is set
            document.cookie = `tor-ramel-auth=true; path=/; expires=${expiryDate.toUTCString()}`
          } else {
            // Session expired, clear storage
            localStorage.removeItem('tor-ramel-user')
            localStorage.removeItem('tor-ramel-auth-expiry')
            document.cookie = 'tor-ramel-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC'
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkStoredAuth()
  }, [])

  const login = (userData: User) => {
    // Store user data in localStorage with 7 days expiry
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 7)
    
    localStorage.setItem('tor-ramel-user', JSON.stringify(userData))
    localStorage.setItem('tor-ramel-auth-expiry', expiryDate.toISOString())
    
    // Set cookie for middleware
    document.cookie = `tor-ramel-auth=true; path=/; expires=${expiryDate.toUTCString()}`
    
    setUser(userData)
    router.push('/')
  }

  const logout = () => {
    localStorage.removeItem('tor-ramel-user')
    localStorage.removeItem('tor-ramel-auth-expiry')
    
    // Clear cookie
    document.cookie = 'tor-ramel-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC'
    
    setUser(null)
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