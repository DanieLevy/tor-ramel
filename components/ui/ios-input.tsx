"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * iOS-optimized input component
 * Provides proper inputMode, autocomplete, and keyboard optimizations for iOS Safari
 * Reference: https://developer.apple.com/documentation/webkitjs
 */

type InputVariant = 
  | 'email' 
  | 'tel' 
  | 'number' 
  | 'decimal' 
  | 'search' 
  | 'url' 
  | 'text'
  | 'password'
  | 'otp'

interface IOSInputProps extends Omit<React.ComponentProps<"input">, 'type'> {
  /**
   * Input variant determines the optimal keyboard type and autocomplete
   * - email: Shows @ and . on iOS keyboard
   * - tel: Numeric phone pad
   * - number: Numeric keyboard (integers)
   * - decimal: Numeric keyboard with decimal point
   * - search: Search keyboard with "Search" return key
   * - url: URL keyboard with / and .com
   * - text: Standard text keyboard
   * - password: Secure text entry
   * - otp: One-time password with numeric keyboard
   */
  variant: InputVariant
  /** Label for accessibility */
  label?: string
}

const variantConfig: Record<InputVariant, {
  type: string
  inputMode: React.HTMLAttributes<HTMLInputElement>['inputMode']
  autoComplete: string
  autoCapitalize: 'none' | 'off' | 'on' | 'sentences' | 'words' | 'characters'
  autoCorrect: 'on' | 'off'
  spellCheck: boolean
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'
}> = {
  email: {
    type: 'email',
    inputMode: 'email',
    autoComplete: 'email',
    autoCapitalize: 'none',
    autoCorrect: 'off',
    spellCheck: false,
    enterKeyHint: 'next',
  },
  tel: {
    type: 'tel',
    inputMode: 'tel',
    autoComplete: 'tel',
    autoCapitalize: 'none',
    autoCorrect: 'off',
    spellCheck: false,
    enterKeyHint: 'done',
  },
  number: {
    type: 'text', // Use text to allow inputMode control
    inputMode: 'numeric',
    autoComplete: 'off',
    autoCapitalize: 'none',
    autoCorrect: 'off',
    spellCheck: false,
    enterKeyHint: 'done',
  },
  decimal: {
    type: 'text',
    inputMode: 'decimal',
    autoComplete: 'off',
    autoCapitalize: 'none',
    autoCorrect: 'off',
    spellCheck: false,
    enterKeyHint: 'done',
  },
  search: {
    type: 'search',
    inputMode: 'search',
    autoComplete: 'off',
    autoCapitalize: 'none',
    autoCorrect: 'on',
    spellCheck: true,
    enterKeyHint: 'search',
  },
  url: {
    type: 'url',
    inputMode: 'url',
    autoComplete: 'url',
    autoCapitalize: 'none',
    autoCorrect: 'off',
    spellCheck: false,
    enterKeyHint: 'go',
  },
  text: {
    type: 'text',
    inputMode: 'text',
    autoComplete: 'off',
    autoCapitalize: 'sentences',
    autoCorrect: 'on',
    spellCheck: true,
    enterKeyHint: 'done',
  },
  password: {
    type: 'password',
    inputMode: 'text',
    autoComplete: 'current-password',
    autoCapitalize: 'none',
    autoCorrect: 'off',
    spellCheck: false,
    enterKeyHint: 'done',
  },
  otp: {
    type: 'text',
    inputMode: 'numeric',
    autoComplete: 'one-time-code',
    autoCapitalize: 'none',
    autoCorrect: 'off',
    spellCheck: false,
    enterKeyHint: 'done',
  },
}

const IOSInput = React.forwardRef<HTMLInputElement, IOSInputProps>(
  ({ className, variant, label, ...props }, ref) => {
    const config = variantConfig[variant]
    
    return (
      <input
        ref={ref}
        type={config.type}
        inputMode={config.inputMode}
        autoComplete={config.autoComplete}
        autoCapitalize={config.autoCapitalize}
        autoCorrect={config.autoCorrect}
        spellCheck={config.spellCheck}
        enterKeyHint={config.enterKeyHint}
        aria-label={label}
        data-slot="input"
        className={cn(
          // Base styles
          "flex h-11 w-full min-w-0 rounded-xl border bg-background/50 backdrop-blur-sm px-4 py-3 text-base",
          // Focus styles
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
          // Transition
          "transition-all duration-200",
          // iOS-specific optimizations
          "touch-manipulation",
          // Prevent zoom on iOS (16px minimum)
          "text-base md:text-sm",
          // RTL support
          "[&[dir=ltr]]:text-left [&[dir=rtl]]:text-right",
          // File input styles
          "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          // Placeholder
          "placeholder:text-muted-foreground",
          // Selection
          "selection:bg-primary selection:text-primary-foreground",
          // Disabled
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          // Invalid
          "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
          className
        )}
        {...props}
      />
    )
  }
)
IOSInput.displayName = "IOSInput"

/**
 * Specialized password input with visibility toggle
 */
interface IOSPasswordInputProps extends Omit<React.ComponentProps<"input">, 'type'> {
  /** Whether this is for a new password (affects autocomplete) */
  isNewPassword?: boolean
  /** Label for accessibility */
  label?: string
}

const IOSPasswordInput = React.forwardRef<HTMLInputElement, IOSPasswordInputProps>(
  ({ className, isNewPassword = false, label, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)
    
    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          autoComplete={isNewPassword ? "new-password" : "current-password"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-label={label}
          data-slot="input"
          className={cn(
            // Base styles
            "flex h-11 w-full min-w-0 rounded-xl border bg-background/50 backdrop-blur-sm px-4 py-3 text-base",
            // Focus styles
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
            // Transition
            "transition-all duration-200",
            // iOS-specific optimizations
            "touch-manipulation",
            // Prevent zoom on iOS (16px minimum)
            "text-base md:text-sm",
            // Placeholder
            "placeholder:text-muted-foreground",
            // Selection
            "selection:bg-primary selection:text-primary-foreground",
            // Disabled
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            // Invalid
            "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
            // Extra padding for toggle button
            "pr-16",
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-sm touch-manipulation"
          tabIndex={-1}
          aria-label={visible ? "הסתר סיסמה" : "הצג סיסמה"}
        >
          {visible ? "הסתר" : "הצג"}
        </button>
      </div>
    )
  }
)
IOSPasswordInput.displayName = "IOSPasswordInput"

export { IOSInput, IOSPasswordInput, type IOSInputProps, type InputVariant }

