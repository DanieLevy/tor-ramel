"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/auth-provider'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailValid, setEmailValid] = useState<boolean | null>(null)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const { register } = useAuth()

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
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailValid || !password || password !== confirmPassword) return
    
    setIsLoading(true)
    
    try {
      const response = await register(email, password, confirmPassword)
      toast.success(response.message || 'נרשמת בהצלחה!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה בהרשמה')
    } finally {
      setIsLoading(false)
    }
  }

  const passwordsMatch = password && confirmPassword && password === confirmPassword
  const passwordError = password && confirmPassword && !passwordsMatch

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative inline-block mb-6">
            <Image 
              src="/icons/icon-96x96.png" 
              alt="תור רם-אל" 
              width={80}
              height={80}
              priority
              className="rounded-3xl mx-auto transform hover:scale-105 transition-transform duration-300 shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            הרשמה למערכת
          </h1>
          <p className="text-muted-foreground mt-2">צור חשבון חדש או הגדר סיסמה לחשבון קיים</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              כתובת אימייל
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              className={cn(
                "w-full px-4 py-3 rounded-xl border bg-background/50 backdrop-blur-sm",
                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                "transition-all duration-200",
                emailValid === false && "border-destructive focus:ring-destructive/50"
              )}
              placeholder="your@email.com"
              dir="ltr"
              autoComplete="email"
              required
            />
            {emailValid === false && (
              <p className="text-xs text-destructive mt-1">כתובת אימייל לא תקינה</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              סיסמה
            </label>
            <div className="relative">
              <input
                id="password"
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border bg-background/50 backdrop-blur-sm",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                  "transition-all duration-200"
                )}
                placeholder="לפחות 6 תווים, אות וספרה"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setPasswordVisible(!passwordVisible)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {passwordVisible ? "הסתר" : "הצג"}
              </button>
            </div>
            {password && password.length < 6 && (
              <p className="text-xs text-muted-foreground">הסיסמה חייבת להכיל לפחות 6 תווים</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              אימות סיסמה
            </label>
            <input
              id="confirmPassword"
              type={passwordVisible ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-xl border bg-background/50 backdrop-blur-sm",
                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                "transition-all duration-200",
                passwordError && "border-destructive focus:ring-destructive/50"
              )}
              placeholder="הזן שוב את הסיסמה"
              required
            />
            {passwordError && (
              <p className="text-xs text-destructive mt-1">הסיסמאות אינן תואמות</p>
            )}
            {passwordsMatch && (
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">הסיסמאות תואמות ✓</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={!emailValid || password.length < 6 || !passwordsMatch || isLoading}
            className="w-full py-6 rounded-xl text-base font-medium shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                נרשם...
              </>
            ) : (
              'הרשם'
            )}
          </Button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center space-y-3">
          <Link 
            href="/login" 
            className="text-sm text-muted-foreground hover:text-primary transition-colors block"
          >
            יש לך כבר חשבון? התחבר כאן
          </Link>
          <div className="text-xs text-muted-foreground px-4">
            <p className="font-medium">נרשמת בעבר ללא סיסמה?</p>
            <p>השתמש בטופס זה כדי להגדיר סיסמה לחשבון שלך</p>
          </div>
        </div>
      </div>
    </div>
  )
} 