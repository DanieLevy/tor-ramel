"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Calendar } from "lucide-react"
import { format, parseISO } from "date-fns"
import { he } from "date-fns/locale"

/**
 * Native date picker component optimized for iOS
 * Uses native <input type="date"> on mobile for iOS native date wheel
 * Provides styled wrapper for consistent design
 */

interface NativeDatePickerProps {
  /** Selected date value */
  value?: Date
  /** Callback when date changes */
  onChange?: (date: Date | undefined) => void
  /** Minimum selectable date */
  minDate?: Date
  /** Maximum selectable date */
  maxDate?: Date
  /** Placeholder text */
  placeholder?: string
  /** Whether the input is disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
  /** Whether to show the clear button */
  clearable?: boolean
  /** Label for accessibility */
  label?: string
  /** ID for the input */
  id?: string
}

// Format date for native input (YYYY-MM-DD)
const formatForInput = (date: Date | undefined): string => {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Parse date from native input
const parseFromInput = (value: string): Date | undefined => {
  if (!value) return undefined
  try {
    // Parse as local date (not UTC)
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  } catch {
    return undefined
  }
}

const NativeDatePicker = React.forwardRef<HTMLInputElement, NativeDatePickerProps>(
  ({ 
    value, 
    onChange, 
    minDate, 
    maxDate, 
    placeholder = "בחר תאריך",
    disabled = false,
    className,
    clearable = true,
    label,
    id,
  }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const combinedRef = React.useMemo(() => {
      return (node: HTMLInputElement) => {
        (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      }
    }, [ref])
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = parseFromInput(e.target.value)
      onChange?.(newDate)
    }
    
    const handleClear = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onChange?.(undefined)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
    
    const handleContainerClick = () => {
      inputRef.current?.showPicker?.()
      inputRef.current?.focus()
    }

    const displayValue = value 
      ? format(value, "dd/MM/yyyy", { locale: he })
      : placeholder

    return (
      <div 
        className={cn(
          "relative group",
          className
        )}
      >
        {/* Styled visible container */}
        <div
          onClick={handleContainerClick}
          className={cn(
            "flex items-center justify-between gap-2 h-11 w-full rounded-xl border bg-background/50 backdrop-blur-sm px-4 py-3",
            "cursor-pointer touch-manipulation",
            "transition-all duration-200",
            "hover:border-primary/50",
            "focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary",
            disabled && "pointer-events-none cursor-not-allowed opacity-50"
          )}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className={cn(
              "text-base truncate",
              !value && "text-muted-foreground"
            )}>
              {displayValue}
            </span>
          </div>
          
          {/* Clear button */}
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="flex-shrink-0 p-1 rounded-full hover:bg-muted/80 transition-colors touch-manipulation"
              aria-label="נקה תאריך"
            >
              <svg 
                className="h-4 w-4 text-muted-foreground" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Hidden native input - positioned to trigger native picker */}
        <input
          ref={combinedRef}
          type="date"
          id={id}
          value={formatForInput(value)}
          onChange={handleChange}
          min={minDate ? formatForInput(minDate) : undefined}
          max={maxDate ? formatForInput(maxDate) : undefined}
          disabled={disabled}
          aria-label={label || placeholder}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          // iOS Safari specific
          style={{
            WebkitAppearance: 'none',
            // Ensure native picker is triggered
            colorScheme: 'light dark',
          }}
        />
      </div>
    )
  }
)
NativeDatePicker.displayName = "NativeDatePicker"

/**
 * Native date range picker for iOS
 * Uses two native date inputs for start and end dates
 */
interface NativeDateRangePickerProps {
  /** Selected date range */
  value?: { from: Date | undefined; to: Date | undefined }
  /** Callback when range changes */
  onChange?: (range: { from: Date | undefined; to: Date | undefined }) => void
  /** Minimum selectable date */
  minDate?: Date
  /** Maximum selectable date */
  maxDate?: Date
  /** Whether the inputs are disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
}

const NativeDateRangePicker = React.forwardRef<HTMLDivElement, NativeDateRangePickerProps>(
  ({ 
    value = { from: undefined, to: undefined },
    onChange, 
    minDate, 
    maxDate, 
    disabled = false,
    className,
  }, ref) => {
    const handleFromChange = (date: Date | undefined) => {
      onChange?.({ 
        from: date, 
        to: value.to && date && date > value.to ? undefined : value.to 
      })
    }
    
    const handleToChange = (date: Date | undefined) => {
      onChange?.({ 
        from: value.from && date && date < value.from ? undefined : value.from, 
        to: date 
      })
    }

    return (
      <div ref={ref} className={cn("space-y-3", className)}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">מתאריך</label>
          <NativeDatePicker
            value={value.from}
            onChange={handleFromChange}
            minDate={minDate}
            maxDate={value.to || maxDate}
            disabled={disabled}
            placeholder="בחר תאריך התחלה"
            label="תאריך התחלה"
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">עד תאריך</label>
          <NativeDatePicker
            value={value.to}
            onChange={handleToChange}
            minDate={value.from || minDate}
            maxDate={maxDate}
            disabled={disabled}
            placeholder="בחר תאריך סיום"
            label="תאריך סיום"
          />
        </div>
      </div>
    )
  }
)
NativeDateRangePicker.displayName = "NativeDateRangePicker"

export { NativeDatePicker, NativeDateRangePicker, type NativeDatePickerProps, type NativeDateRangePickerProps }

