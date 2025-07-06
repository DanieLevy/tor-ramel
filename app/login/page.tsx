"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-context'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [emailValid, setEmailValid] = useState<boolean | null>(null)
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/')
    }
  }, [authLoading, user, router])

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">טוען...</p>
        </div>
      </div>
    )
  }

  const validateEmail = (value: string) => {
    const emailRegex = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
    
    if (!value) {
      setEmailValid(null)
      return
    }
    
    setEmailValid(emailRegex.test(value.trim()))
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    validateEmail(value)
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailValid) return
    
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בשליחת קוד')
      }

      setSuccess(true)
      // Store email for OTP verification page
      sessionStorage.setItem('tor-ramel-pending-email', email)
      
      // Redirect to OTP page after short delay
      setTimeout(() => {
        router.push('/verify-otp')
      }, 1500)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא צפויה')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-3xl flex items-center justify-center mx-auto transform hover:scale-105 transition-transform duration-300 shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-3xl">תר</span>
            </div>
            <div className="absolute -inset-1 bg-gradient-to-br from-primary to-primary/80 rounded-3xl blur-lg opacity-30 animate-pulse"></div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            ברוכים הבאים
          </h1>
          <p className="text-muted-foreground mt-2">הזן את כתובת הדוא"ל שלך להתחברות</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          {/* Email Input Container */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground/80">
              כתובת דוא"ל
            </label>
            <div className="relative group">
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={handleEmailChange}
                className={cn(
                  "w-full px-5 py-3.5 rounded-2xl border-0 bg-background",
                  "shadow-sm hover:shadow-md focus:shadow-lg",
                  "transition-all duration-300 ease-out",
                  "text-left placeholder:text-muted-foreground/50",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20",
                  "transform focus:-translate-y-0.5",
                  emailValid === true && "pr-12",
                  emailValid === false && "pr-12"
                )}
                dir="ltr"
                required
                disabled={isLoading || success}
              />
              
              {/* Validation Icons */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                {/* Check Icon */}
                <svg 
                  className={cn(
                    "w-5 h-5 absolute transition-all duration-300",
                    emailValid === true 
                      ? "opacity-100 scale-100 text-emerald-500" 
                      : "opacity-0 scale-50"
                  )}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                
                {/* X Icon */}
                <svg 
                  className={cn(
                    "w-5 h-5 absolute transition-all duration-300",
                    emailValid === false 
                      ? "opacity-100 scale-100 text-red-500" 
                      : "opacity-0 scale-50"
                  )}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="animate-in fade-in slide-in-from-top-2 duration-300 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900">
              <AlertDescription className="text-emerald-700 dark:text-emerald-400">
                ✓ קוד אימות נשלח לדוא"ל שלך! מעביר אותך...
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className={cn(
              "w-full h-12 rounded-2xl font-medium text-base",
              "bg-gradient-to-r from-primary to-primary/90",
              "hover:from-primary/90 hover:to-primary/80",
              "shadow-md hover:shadow-lg hover:shadow-primary/25",
              "transform transition-all duration-300",
              "hover:-translate-y-0.5",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            )}
            disabled={isLoading || success || !emailValid}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                שולח קוד...
              </span>
            ) : (
              'שלח קוד אימות'
            )}
          </Button>
        </form>

        {/* Footer Text */}
        <p className="text-center text-sm text-muted-foreground mt-8 animate-in fade-in duration-500 delay-200">
          מערכת זיהוי מאובטחת עם קוד חד-פעמי
        </p>
      </div>
    </div>
  )
} 