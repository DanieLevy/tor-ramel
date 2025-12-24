"use client"

import { Calendar, CalendarDays, Loader2, Smartphone as PhoneIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { NativeDatePicker, NativeDateRangePicker } from '@/components/ui/native-date-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import type { DateMode, DateRange } from './types'
import { isDateDisabled } from './utils'

interface SubscriptionFormProps {
  mounted: boolean
  dateMode: DateMode
  selectedDate: Date | undefined
  dateRange: DateRange
  loading: boolean
  isTouchDevice: boolean
  useNativePicker: boolean
  onDateModeChange: (mode: DateMode) => void
  onSelectedDateChange: (date: Date | undefined) => void
  onDateRangeChange: (range: DateRange) => void
  onNativePickerToggle: () => void
  onSubmit: () => void
}

export const SubscriptionForm = ({
  mounted,
  dateMode,
  selectedDate,
  dateRange,
  loading,
  isTouchDevice,
  useNativePicker,
  onDateModeChange,
  onSelectedDateChange,
  onDateRangeChange,
  onNativePickerToggle,
  onSubmit
}: SubscriptionFormProps) => {
  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from || range?.to) {
      onDateRangeChange({
        from: range.from || undefined,
        to: range.to || undefined
      })
    } else {
      onDateRangeChange({ from: undefined, to: undefined })
    }
  }

  const handleDateModeSwitch = (mode: DateMode) => {
    onDateModeChange(mode)
    if (mode === 'single') {
      onDateRangeChange({ from: undefined, to: undefined })
    } else {
      onSelectedDateChange(undefined)
    }
  }

  const isSubmitDisabled = loading || (dateMode === 'single' ? !selectedDate : !dateRange.from || !dateRange.to)

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <div className="p-3 space-y-3">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block">
          תאריכים
        </label>
        
        {/* Date Mode Toggle */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'single' as const, label: 'תאריך בודד', icon: Calendar },
            { value: 'range' as const, label: 'טווח', icon: CalendarDays }
          ].map((mode) => {
            const isSelected = dateMode === mode.value
            const Icon = mode.icon
            return (
              <button
                key={mode.value}
                onClick={() => handleDateModeSwitch(mode.value)}
                className={cn(
                  "p-2 rounded text-xs font-medium transition-all border flex items-center justify-center gap-1.5",
                  isSelected
                    ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {mode.label}
              </button>
            )
          })}
        </div>

        {/* Native/Custom Picker Toggle - iOS optimization */}
        {isTouchDevice && (
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <PhoneIcon className="h-3 w-3" />
              לוח שנה של המכשיר
            </span>
            <button
              type="button"
              onClick={onNativePickerToggle}
              className={cn(
                "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none touch-manipulation",
                useNativePicker ? "bg-black dark:bg-white" : "bg-gray-200 dark:bg-gray-700"
              )}
              role="switch"
              aria-checked={useNativePicker}
              aria-label="השתמש בלוח שנה של המכשיר"
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-black shadow ring-0 transition duration-200 ease-in-out",
                  useNativePicker ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>
        )}
        
        {/* Date Picker */}
        <AnimatePresence mode="wait">
          {dateMode === 'single' ? (
            <motion.div
              key="single"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {useNativePicker ? (
                <NativeDatePicker
                  value={selectedDate}
                  onChange={onSelectedDateChange}
                  minDate={new Date()}
                  placeholder="בחר תאריך"
                  label="תאריך להתראה"
                />
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-center h-10 text-sm font-normal align-middle",
                        selectedDate && "border-black dark:border-white"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {mounted && selectedDate ? (
                        format(selectedDate, "dd/MM/yyyy")
                      ) : (
                        <span className="text-gray-400">בחר תאריך</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={onSelectedDateChange}
                      disabled={isDateDisabled}
                      locale={he}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="range"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {useNativePicker ? (
                <NativeDateRangePicker
                  value={dateRange}
                  onChange={(range) => onDateRangeChange(range)}
                  minDate={new Date()}
                />
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-center h-10 text-sm font-normal align-middle",
                        dateRange.from && "border-black dark:border-white"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {mounted && dateRange.from ? (
                        dateRange.to ? (
                          `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM/yyyy")}`
                        ) : (
                          format(dateRange.from, "dd/MM/yyyy")
                        )
                      ) : (
                        <span className="text-gray-400">בחר טווח</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={dateRange}
                      onSelect={handleDateRangeSelect}
                      disabled={isDateDisabled}
                      locale={he}
                      initialFocus
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <Button
          onClick={onSubmit}
          disabled={isSubmitDisabled}
          className="w-full h-10 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black text-sm font-medium"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'צור התראה'
          )}
        </Button>
      </div>
    </div>
  )
}








