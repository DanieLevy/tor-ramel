"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Mail, KeyRound, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/auth-provider'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailValid, setEmailValid] = useState<boolean | null>(null)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const { login } = useAuth()

  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'password'>('email')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  const validateEmail = (value: string) => {
    const emailRegex = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i
    
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
    if (!emailValid || !password) return
    
    setIsLoading(true)
    
    try {
      await login(email, password)
      toast.success('התחברת בהצלחה!')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'שגיאה בהתחברות'
      
      // Check if this might be a user without password
      if (errorMessage.includes('שגיאה') || errorMessage.includes('סיסמה')) {
        toast.error(
          <div>
            <p>{errorMessage}</p>
            <p className="text-xs mt-1">אם נרשמת בעבר ללא סיסמה, עבור להרשמה להגדרת סיסמה</p>
          </div>
        )
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Forgot password handlers
  const handleSendOTP = async () => {
    if (!resetEmail) return
    
    setIsResetting(true)
    
    try {
      const response = await fetch('/api/auth/send-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success('קוד אימות נשלח לאימייל שלך')
        setResetStep('otp')
      } else {
        toast.error(data.error || 'שגיאה בשליחת קוד אימות')
      }
    } catch {
      toast.error('שגיאה בשליחת קוד אימות')
    } finally {
      setIsResetting(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return
    
    setIsResetting(true)
    
    try {
      const response = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success('קוד האימות אומת בהצלחה')
        setResetToken(data.resetToken)
        setResetStep('password')
      } else {
        toast.error(data.error || 'קוד אימות שגוי')
      }
    } catch {
      toast.error('שגיאה באימות הקוד')
    } finally {
      setIsResetting(false)
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('הסיסמאות אינן תואמות')
      return
    }
    
    setIsResetting(true)
    
    try {
      const response = await fetch('/api/auth/reset-password-with-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success('הסיסמה שונתה בהצלחה!')
        resetForgotPasswordDialog()
        setEmail(resetEmail) // Set email in login form
      } else {
        toast.error(data.error || 'שגיאה בשינוי הסיסמה')
      }
    } catch {
      toast.error('שגיאה בשינוי הסיסמה')
    } finally {
      setIsResetting(false)
    }
  }

  const resetForgotPasswordDialog = () => {
    setShowForgotPassword(false)
    setResetEmail('')
    setResetStep('email')
    setOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setResetToken('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
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
          <h1 className="text-3xl font-bold text-foreground">
            ברוכים הבאים
          </h1>
          <p className="text-muted-foreground mt-2">הזן את פרטי ההתחברות שלך</p>
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
              inputMode="email"
              value={email}
              onChange={handleEmailChange}
              className={cn(
                "w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-900",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500",
                "transition-all duration-200 touch-manipulation text-base",
                emailValid === false && "border-red-500 focus:ring-red-500/50"
              )}
              placeholder="your@email.com"
              dir="ltr"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              required
            />
            {emailValid === false && (
              <p className="text-xs text-red-500 mt-1">כתובת אימייל לא תקינה</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                סיסמה
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                שכחתי סיסמה
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-900",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500",
                  "transition-all duration-200 touch-manipulation text-base"
                )}
                placeholder="הזן סיסמה"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
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
          </div>

          <Button
            type="submit"
            disabled={!emailValid || !password || isLoading}
            className="w-full py-6 rounded-xl text-base font-medium shadow-lg bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                מתחבר...
              </>
            ) : (
              'התחבר'
            )}
          </Button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center">
          <Link 
            href="/register" 
            className="text-sm text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            אין לך חשבון? הירשם כאן
          </Link>
        </div>

        {/* Forgot Password Dialog */}
        <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">איפוס סיסמה</DialogTitle>
              <DialogDescription className="text-center">
                {resetStep === 'email' && 'הזן את כתובת האימייל שלך ונשלח לך קוד אימות'}
                {resetStep === 'otp' && 'הזן את קוד האימות שנשלח לאימייל שלך'}
                {resetStep === 'password' && 'הגדר סיסמה חדשה לחשבון שלך'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {resetStep === 'email' && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="reset-email" className="text-sm font-medium">
                      כתובת אימייל
                    </label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        id="reset-email"
                        type="email"
                        inputMode="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full px-10 py-3 rounded-xl border bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 touch-manipulation text-base"
                        placeholder="your@email.com"
                        dir="ltr"
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="send"
                        disabled={isResetting}
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleSendOTP}
                    disabled={!resetEmail || isResetting}
                    className="w-full"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        שולח...
                      </>
                    ) : (
                      'שלח קוד אימות'
                    )}
                  </Button>
                </>
              )}
              
              {resetStep === 'otp' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-center block">
                      הזן קוד אימות
                    </label>
                    <div className="flex justify-center">
                      <InputOTP
                        value={otp}
                        onChange={setOtp}
                        maxLength={6}
                        disabled={isResetting}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      הקוד נשלח אל: {resetEmail}
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleVerifyOTP}
                    disabled={otp.length !== 6 || isResetting}
                    className="w-full"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        מאמת...
                      </>
                    ) : (
                      'אמת קוד'
                    )}
                  </Button>
                  
                  <button
                    type="button"
                    onClick={() => setResetStep('email')}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
                    disabled={isResetting}
                  >
                    חזור
                  </button>
                </>
              )}
              
              {resetStep === 'password' && (
                <>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="new-password" className="text-sm font-medium">
                        סיסמה חדשה
                      </label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-10 py-3 rounded-xl border bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 touch-manipulation text-base"
                          placeholder="הזן סיסמה חדשה"
                          autoComplete="new-password"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          enterKeyHint="next"
                          minLength={6}
                          disabled={isResetting}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="confirm-password" className="text-sm font-medium">
                        אימות סיסמה
                      </label>
                      <div className="relative">
                        <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-10 py-3 rounded-xl border bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 touch-manipulation text-base"
                          placeholder="הזן סיסמה שוב"
                          autoComplete="new-password"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          enterKeyHint="done"
                          minLength={6}
                          disabled={isResetting}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleResetPassword}
                    disabled={!newPassword || !confirmPassword || isResetting}
                    className="w-full"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        משנה סיסמה...
                      </>
                    ) : (
                      'שנה סיסמה'
                    )}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
