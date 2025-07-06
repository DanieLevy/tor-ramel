"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-context'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function VerifyOTPPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [canResend, setCanResend] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const [error, setError] = useState('')
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()
  const { login } = useAuth()

  useEffect(() => {
    // Get email from session storage
    const pendingEmail = sessionStorage.getItem('tor-ramel-pending-email')
    if (!pendingEmail) {
      router.push('/login')
      return
    }
    setEmail(pendingEmail)
    // Focus first input on mount
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }, [router])

  // Resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [resendTimer])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste of multiple digits
      const digits = value.slice(0, 6).split('').filter(char => /\d/.test(char))
      const newOtp = [...otp]
      digits.forEach((digit, idx) => {
        if (index + idx < 6) newOtp[index + idx] = digit
      })
      setOtp(newOtp)
      // Focus last filled input or next empty one
      const nextIndex = Math.min(index + digits.length, 5)
      inputRefs.current[nextIndex]?.focus()
      
      // Auto-submit if all filled
      if (newOtp.every(digit => digit)) {
        handleSubmit(newOtp.join(''))
      }
      return
    }
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits entered
    if (newOtp.every(digit => digit) && newOtp.join('').length === 6) {
      handleSubmit(newOtp.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    const digits = pastedData.split('').filter(char => /\d/.test(char))
    
    const newOtp = [...otp]
    digits.forEach((digit, idx) => {
      if (idx < 6) newOtp[idx] = digit
    })
    setOtp(newOtp)

    // Focus last filled input
    const lastFilledIndex = Math.min(digits.length - 1, 5)
    inputRefs.current[lastFilledIndex]?.focus()

    if (digits.length === 6) {
      handleSubmit(digits.join(''))
    }
  }

  const handleSubmit = async (otpCode?: string) => {
    const code = otpCode || otp.join('')
    if (code.length !== 6) {
      toast.error('נא להזין קוד בן 6 ספרות')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה באימות קוד')
      }

      if (data.success && data.user) {
        // Store auth in context and redirect
        await login(data.user.email, data.user.id)
        
        toast.success('התחברת בהצלחה!')
        
        // Small delay to ensure auth is properly set
        setTimeout(() => {
          router.push('/')
        }, 100)
      } else {
        setError(data.error || 'קוד שגוי או פג תוקף')
      }

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה לא צפויה')
      // Shake animation on error
      inputRefs.current.forEach((input, idx) => {
        if (input) {
          input.classList.add('animate-shake')
          setTimeout(() => input.classList.remove('animate-shake'), 500)
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setCanResend(false)
    setResendTimer(60)

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'שגיאה בשליחת קוד')
      }

      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      toast.success('קוד חדש נשלח לדוא"ל שלך')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בשליחת קוד חדש')
      setCanResend(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative inline-block mb-6">
            <img 
              src="/icons/icon-96x96.png" 
              alt="תור רם-אל" 
              className="w-20 h-20 rounded-3xl mx-auto transform hover:scale-105 transition-transform duration-300 shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            הזן קוד אימות
          </h1>
          <p className="text-muted-foreground mt-2">
            שלחנו קוד בן 6 ספרות לכתובת
          </p>
          <p className="font-medium text-foreground mt-1" dir="ltr">{email}</p>
        </div>

        {/* OTP Input */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="flex justify-center gap-2" dir="ltr">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => {inputRefs.current[index] = el}}
                type="text"
                inputMode="numeric"
                pattern="\d{1}"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={cn(
                  "w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold",
                  "rounded-xl border-0 bg-background",
                  "shadow-sm hover:shadow-md focus:shadow-lg",
                  "transition-all duration-300 ease-out",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20",
                  "transform focus:scale-105",
                  "placeholder:text-muted-foreground/30",
                  digit && "bg-primary/5"
                )}
                placeholder="0"
                disabled={isLoading}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={() => handleSubmit()}
              className={cn(
                "w-full h-12 rounded-2xl font-medium text-base",
                "bg-gradient-to-r from-primary to-primary/90",
                "hover:from-primary/90 hover:to-primary/80",
                "shadow-md hover:shadow-lg hover:shadow-primary/25",
                "transform transition-all duration-300",
                "hover:-translate-y-0.5",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              )}
              disabled={isLoading || otp.join('').length !== 6}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  מאמת...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  אמת וכנס
                  <ArrowLeft className="mr-2 h-4 w-4" />
                </span>
              )}
            </Button>

            {/* Resend Code */}
            <div className="text-center">
              {canResend ? (
                <Button
                  variant="ghost"
                  onClick={handleResend}
                  className="text-sm hover:bg-transparent hover:text-primary transition-colors"
                >
                  <RefreshCw className="ml-2 h-3 w-3" />
                  שלח קוד חדש
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  ניתן לשלוח קוד חדש בעוד{' '}
                  <span className="font-medium text-foreground tabular-nums">
                    {resendTimer}
                  </span>
                  {' '}שניות
                </p>
              )}
            </div>

            {/* Back to Login */}
            <Button
              variant="ghost"
              onClick={() => router.push('/login')}
              className="w-full text-sm hover:bg-muted/50"
            >
              <ArrowRight className="ml-2 h-3 w-3" />
              חזור לדף הכניסה
            </Button>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-sm text-muted-foreground mt-8 animate-in fade-in duration-500 delay-200">
          הקוד תקף ל-10 דקות
        </p>
      </div>
    </div>
  )
} 