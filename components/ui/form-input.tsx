"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// ============================================
// Form Input Component
// ============================================

interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onBlur'> {
  /** Label text */
  label?: string
  /** Error message to display */
  error?: string
  /** Success state */
  success?: boolean
  /** Helper text below input */
  helperText?: string
  /** Icon to show on the right side */
  icon?: React.ReactNode
  /** Whether the field is required */
  required?: boolean
  /** Called on value change */
  onChange?: (value: string) => void
  /** Called on blur */
  onBlur?: () => void
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ 
    className,
    label,
    error,
    success,
    helperText,
    icon,
    required,
    type = "text",
    onChange,
    onBlur,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)
    
    const isPassword = type === "password"
    const inputType = isPassword && showPassword ? "text" : type
    
    const hasError = !!error
    const hasSuccess = success && !hasError

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value)
    }

    const handleBlur = () => {
      setIsFocused(false)
      onBlur?.()
    }

    return (
      <div className="space-y-1.5">
        {/* Label */}
        {label && (
          <label 
            className={cn(
              "block text-sm font-medium transition-colors",
              hasError ? "text-destructive" : "text-foreground"
            )}
          >
            {label}
            {required && <span className="text-destructive mr-1">*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          <input
            type={inputType}
            className={cn(
              // Base styles
              "flex h-11 w-full rounded-xl border px-4 py-2 text-sm",
              "bg-background transition-all duration-200",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              "disabled:cursor-not-allowed disabled:opacity-50",
              
              // Right padding for icons
              (icon || isPassword || hasError || hasSuccess) && "pl-11",
              
              // State styles
              hasError && [
                "border-destructive",
                "focus:border-destructive focus:ring-destructive/20",
                "dark:focus:ring-destructive/30"
              ],
              hasSuccess && [
                "border-emerald-500",
                "focus:border-emerald-500 focus:ring-emerald-500/20"
              ],
              !hasError && !hasSuccess && [
                "border-input",
                "focus:border-primary focus:ring-primary/20"
              ],
              
              // Focus highlight
              isFocused && !hasError && !hasSuccess && "ring-2 ring-primary/20",
              
              className
            )}
            ref={ref}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={() => setIsFocused(true)}
            aria-invalid={hasError}
            aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
            {...props}
          />

          {/* Right side icons */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Password toggle */}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                tabIndex={-1}
                aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}

            {/* Custom icon */}
            {icon && !isPassword && (
              <span className="text-muted-foreground">{icon}</span>
            )}

            {/* Error indicator */}
            <AnimatePresence mode="wait">
              {hasError && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success indicator */}
            <AnimatePresence mode="wait">
              {hasSuccess && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence mode="wait">
          {hasError && (
            <motion.p
              id={props.id ? `${props.id}-error` : undefined}
              initial={{ opacity: 0, height: 0, y: -5 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-destructive flex items-center gap-1"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Helper Text */}
        {helperText && !hasError && (
          <p 
            id={props.id ? `${props.id}-helper` : undefined}
            className="text-xs text-muted-foreground"
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

FormInput.displayName = "FormInput"

// ============================================
// OTP Input Component
// ============================================

interface OTPInputProps {
  /** Number of OTP digits */
  length?: number
  /** Current OTP value */
  value: string
  /** Called when OTP changes */
  onChange: (value: string) => void
  /** Error state */
  error?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Auto-focus first input */
  autoFocus?: boolean
}

export const OTPInput = ({
  length = 6,
  value,
  onChange,
  error = false,
  disabled = false,
  autoFocus = true
}: OTPInputProps) => {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return // Only digits

    const newValue = value.split('')
    newValue[index] = char.slice(-1) // Take only last character
    const newOtp = newValue.join('').slice(0, length)
    
    onChange(newOtp)

    // Auto-advance to next input
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pastedData)
    
    // Focus appropriate input after paste
    const focusIndex = Math.min(pastedData.length, length - 1)
    inputRefs.current[focusIndex]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center" dir="ltr">
      {Array.from({ length }).map((_, index) => (
        <motion.input
          key={index}
          ref={(el) => { inputRefs.current[index] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.05 }}
          className={cn(
            "w-11 h-14 text-center text-xl font-bold rounded-xl border",
            "bg-background transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-destructive focus:border-destructive focus:ring-destructive/20"
              : value[index]
                ? "border-primary focus:ring-primary/20"
                : "border-input focus:border-primary focus:ring-primary/20"
          )}
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  )
}

export default FormInput

