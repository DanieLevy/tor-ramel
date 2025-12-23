"use client"

import { useState, useCallback, useMemo } from 'react'
import { z } from 'zod'

// ============================================
// Types
// ============================================

interface FieldError {
  message: string
  code?: string
}

interface ValidationState<T> {
  /** Current form values */
  values: T
  /** Field-level errors */
  errors: Partial<Record<keyof T, FieldError>>
  /** Whether form has been touched/submitted */
  touched: Partial<Record<keyof T, boolean>>
  /** Whether form is currently valid */
  isValid: boolean
  /** Whether form has any errors */
  hasErrors: boolean
  /** Whether a specific field has been touched */
  isTouched: (field: keyof T) => boolean
  /** Whether a specific field has an error */
  hasError: (field: keyof T) => boolean
  /** Get error message for a field */
  getError: (field: keyof T) => string | undefined
}

interface FormActions<T> {
  /** Set a single field value (with validation) */
  setValue: (field: keyof T, value: T[keyof T]) => void
  /** Set multiple values at once */
  setValues: (values: Partial<T>) => void
  /** Mark a field as touched */
  setTouched: (field: keyof T) => void
  /** Mark all fields as touched */
  touchAll: () => void
  /** Validate entire form */
  validate: () => boolean
  /** Validate a single field */
  validateField: (field: keyof T) => boolean
  /** Reset form to initial values */
  reset: () => void
  /** Clear all errors */
  clearErrors: () => void
  /** Set a manual error for a field */
  setError: (field: keyof T, message: string) => void
  /** Handle form submission with validation */
  handleSubmit: (onValid: (values: T) => void | Promise<void>) => (e?: React.FormEvent) => Promise<void>
}

interface UseFormValidationReturn<T> extends ValidationState<T>, FormActions<T> {}

interface UseFormValidationOptions<T> {
  /** Whether to validate on every change (default: true) */
  validateOnChange?: boolean
  /** Whether to validate on blur (default: true) */
  validateOnBlur?: boolean
  /** Custom error messages */
  errorMessages?: Partial<Record<keyof T, Record<string, string>>>
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Powerful form validation hook with Zod schema support
 * Provides real-time validation feedback and error handling
 * 
 * @example
 * const loginSchema = z.object({
 *   email: z.string().email('אימייל לא תקין'),
 *   password: z.string().min(6, 'סיסמה חייבת להכיל לפחות 6 תווים')
 * })
 * 
 * const form = useFormValidation(loginSchema, {
 *   email: '',
 *   password: ''
 * })
 * 
 * <input 
 *   value={form.values.email}
 *   onChange={(e) => form.setValue('email', e.target.value)}
 *   onBlur={() => form.setTouched('email')}
 * />
 * {form.hasError('email') && <span>{form.getError('email')}</span>}
 */
export function useFormValidation<T extends Record<string, unknown>>(
  schema: z.ZodSchema<T>,
  initialValues: T,
  options: UseFormValidationOptions<T> = {}
): UseFormValidationReturn<T> {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    errorMessages = {} as Partial<Record<keyof T, Record<string, string>>>
  } = options

  const [values, setValuesState] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, FieldError>>>({})
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({})

  // Parse Zod errors into our format
  const parseZodError = useCallback((
    error: z.ZodError,
    fieldFilter?: keyof T
  ): Partial<Record<keyof T, FieldError>> => {
    const parsedErrors: Partial<Record<keyof T, FieldError>> = {}
    
    for (const issue of error.issues) {
      const field = issue.path[0] as keyof T
      
      // Skip if filtering by field and this isn't it
      if (fieldFilter && field !== fieldFilter) continue
      
      // Check for custom error message
      const customMessage = errorMessages[field]?.[issue.code]
      
      parsedErrors[field] = {
        message: customMessage || issue.message,
        code: issue.code
      }
    }
    
    return parsedErrors
  }, [errorMessages])

  // Validate entire form
  const validate = useCallback((): boolean => {
    const result = schema.safeParse(values)
    
    if (result.success) {
      setErrors({})
      return true
    }
    
    setErrors(parseZodError(result.error))
    return false
  }, [schema, values, parseZodError])

  // Validate a single field
  const validateField = useCallback((field: keyof T): boolean => {
    const result = schema.safeParse(values)
    
    if (result.success) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
      return true
    }
    
    const fieldErrors = parseZodError(result.error, field)
    
    if (fieldErrors[field]) {
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }))
      return false
    }
    
    // No error for this specific field
    setErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
    return true
  }, [schema, values, parseZodError])

  // Set a single field value
  const setValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValuesState(prev => ({ ...prev, [field]: value }))
    
    if (validateOnChange) {
      // Validate after state update
      setTimeout(() => {
        const result = schema.safeParse({ ...values, [field]: value })
        
        if (result.success) {
          setErrors(prev => {
            const next = { ...prev }
            delete next[field]
            return next
          })
        } else {
          const fieldErrors = parseZodError(result.error, field)
          if (fieldErrors[field]) {
            setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }))
          } else {
            setErrors(prev => {
              const next = { ...prev }
              delete next[field]
              return next
            })
          }
        }
      }, 0)
    }
  }, [validateOnChange, schema, values, parseZodError])

  // Set multiple values at once
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }))
  }, [])

  // Mark a field as touched
  const setTouched = useCallback((field: keyof T) => {
    setTouchedState(prev => ({ ...prev, [field]: true }))
    
    if (validateOnBlur) {
      validateField(field)
    }
  }, [validateOnBlur, validateField])

  // Touch all fields
  const touchAll = useCallback(() => {
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key as keyof T] = true
      return acc
    }, {} as Partial<Record<keyof T, boolean>>)
    
    setTouchedState(allTouched)
  }, [values])

  // Reset form
  const reset = useCallback(() => {
    setValuesState(initialValues)
    setErrors({})
    setTouchedState({})
  }, [initialValues])

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  // Set manual error
  const setError = useCallback((field: keyof T, message: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: { message, code: 'custom' }
    }))
  }, [])

  // Handle form submission
  const handleSubmit = useCallback((
    onValid: (values: T) => void | Promise<void>
  ) => async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    touchAll()
    
    if (validate()) {
      await onValid(values)
    }
  }, [values, validate, touchAll])

  // Computed state
  const isValid = useMemo(() => {
    const result = schema.safeParse(values)
    return result.success
  }, [schema, values])

  const hasErrors = useMemo(() => {
    return Object.keys(errors).length > 0
  }, [errors])

  const isTouched = useCallback((field: keyof T): boolean => {
    return touched[field] === true
  }, [touched])

  const hasError = useCallback((field: keyof T): boolean => {
    return touched[field] === true && errors[field] !== undefined
  }, [touched, errors])

  const getError = useCallback((field: keyof T): string | undefined => {
    if (touched[field] && errors[field]) {
      return errors[field]?.message
    }
    return undefined
  }, [touched, errors])

  return {
    // State
    values,
    errors,
    touched,
    isValid,
    hasErrors,
    isTouched,
    hasError,
    getError,
    // Actions
    setValue,
    setValues,
    setTouched,
    touchAll,
    validate,
    validateField,
    reset,
    clearErrors,
    setError,
    handleSubmit
  }
}

// ============================================
// Common Validation Schemas
// ============================================

export const commonSchemas = {
  email: z.string()
    .min(1, 'שדה חובה')
    .email('כתובת אימייל לא תקינה'),
  
  password: z.string()
    .min(6, 'סיסמה חייבת להכיל לפחות 6 תווים')
    .max(100, 'סיסמה ארוכה מדי'),
  
  username: z.string()
    .min(2, 'שם משתמש חייב להכיל לפחות 2 תווים')
    .max(50, 'שם משתמש ארוך מדי'),
  
  phone: z.string()
    .regex(/^0[2-9]\d{7,8}$/, 'מספר טלפון לא תקין'),
  
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'פורמט תאריך לא תקין'),
  
  otp: z.string()
    .length(6, 'קוד אימות חייב להכיל 6 ספרות')
    .regex(/^\d+$/, 'קוד אימות חייב להכיל ספרות בלבד')
}

export default useFormValidation

