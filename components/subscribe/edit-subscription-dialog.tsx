"use client"

import { useState, useEffect } from 'react'
import { Calendar, CalendarDays, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { AnimatePresence } from 'framer-motion'
import type { Subscription, DateMode, DateRange } from './types'
import { isDateDisabled } from './utils'

interface EditSubscriptionDialogProps {
  subscription: Subscription | null
  mounted: boolean
  onClose: () => void
  onUpdate: (payload: {
    subscription_date: string | null
    date_range_start: string | null
    date_range_end: string | null
  }) => Promise<void>
}

export const EditSubscriptionDialog = ({
  subscription,
  mounted,
  onClose,
  onUpdate
}: EditSubscriptionDialogProps) => {
  const [dateMode, setDateMode] = useState<DateMode>('single')
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined })
  const [loading, setLoading] = useState(false)

  // Initialize state when subscription changes
  useEffect(() => {
    if (subscription) {
      if (subscription.subscription_date) {
        setDateMode('single')
        setSelectedDate(new Date(subscription.subscription_date + 'T00:00:00'))
        setDateRange({ from: undefined, to: undefined })
      } else if (subscription.date_range_start && subscription.date_range_end) {
        setDateMode('range')
        setDateRange({
          from: new Date(subscription.date_range_start + 'T00:00:00'),
          to: new Date(subscription.date_range_end + 'T00:00:00')
        })
        setSelectedDate(undefined)
      }
    }
  }, [subscription])

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from || range?.to) {
      setDateRange({
        from: range.from || undefined,
        to: range.to || undefined
      })
    } else {
      setDateRange({ from: undefined, to: undefined })
    }
  }

  const handleDateModeSwitch = (mode: DateMode) => {
    setDateMode(mode)
    if (mode === 'single') {
      setDateRange({ from: undefined, to: undefined })
    } else {
      setSelectedDate(undefined)
    }
  }

  const handleUpdate = async () => {
    setLoading(true)
    
    try {
      const payload = dateMode === 'single' 
        ? { 
            subscription_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
            date_range_start: null,
            date_range_end: null
          }
        : { 
            subscription_date: null,
            date_range_start: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
            date_range_end: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : null
          }

      await onUpdate(payload)
    } finally {
      setLoading(false)
    }
  }

  const isSubmitDisabled = loading || (dateMode === 'single' ? !selectedDate : !dateRange.from || !dateRange.to)

  return (
    <Dialog open={!!subscription} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">עריכת התראה</DialogTitle>
          <DialogDescription className="text-xs">שנה תאריכים</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {/* Date Mode Toggle */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'single' as const, label: 'תאריך בודד', icon: Calendar },
              { value: 'range' as const, label: 'טווח תאריכים', icon: CalendarDays }
            ].map((mode) => {
              const isSelected = dateMode === mode.value
              const Icon = mode.icon
              return (
                <button
                  key={mode.value}
                  onClick={() => handleDateModeSwitch(mode.value)}
                  className={cn(
                    "p-2 rounded text-xs font-medium border flex items-center justify-center gap-1.5",
                    isSelected
                      ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                      : "border-gray-200 dark:border-gray-800"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {mode.label}
                </button>
              )
            })}
          </div>

          {/* Date Picker */}
          <AnimatePresence mode="wait">
            {dateMode === 'single' ? (
              <Popover key="edit-single">
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-right h-10 text-sm"
                  >
                    <Calendar className="ml-2 h-4 w-4" />
                    {mounted && selectedDate ? format(selectedDate, "dd/MM/yyyy") : "בחר תאריך"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={isDateDisabled}
                    locale={he}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <Popover key="edit-range">
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-right h-10 text-sm"
                  >
                    <CalendarDays className="ml-2 h-4 w-4" />
                    {mounted && dateRange.from ? (
                      dateRange.to ? (
                        `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM/yyyy")}`
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy")
                      )
                    ) : (
                      "בחר טווח"
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
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleUpdate}
              disabled={isSubmitDisabled}
              className="flex-1 h-9 text-sm bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'עדכן'}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-9 text-sm"
            >
              ביטול
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}





