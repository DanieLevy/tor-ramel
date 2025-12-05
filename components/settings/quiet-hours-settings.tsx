'use client'

import { Moon, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface QuietHoursSettingsProps {
  values: {
    quiet_hours_start: string | null
    quiet_hours_end: string | null
  }
  onChange: (key: string, value: string | null) => void
  getFieldStatus?: (key: string) => 'idle' | 'saving' | 'saved' | 'error'
}

// Generate time options for select (every 30 minutes)
const generateTimeOptions = () => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour.toString().padStart(2, '0')
      const m = minute.toString().padStart(2, '0')
      options.push(`${h}:${m}`)
    }
  }
  return options
}

const timeOptions = generateTimeOptions()

const formatTimeForDisplay = (time: string | null) => {
  if (!time) return 'לא מוגדר'
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  return `${h.toString().padStart(2, '0')}:${minutes}`
}

interface TimeSelectProps {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
  label: string
  status?: 'idle' | 'saving' | 'saved' | 'error'
}

const TimeSelect = ({ value, onChange, disabled, label, status = 'idle' }: TimeSelectProps) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-muted-foreground flex items-center gap-2">
      {label}
      {status === 'saving' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      {status === 'saved' && <CheckCircle className="h-3 w-3 text-green-500" />}
      {status === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
    </label>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      disabled={disabled || status === 'saving'}
      className={cn(
        "px-3 py-2 rounded-lg text-sm font-medium",
        "bg-gray-100 dark:bg-gray-800 border-0",
        "focus:outline-none focus:ring-2 focus:ring-blue-500",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        !value && "text-muted-foreground"
      )}
    >
      <option value="">לא מוגדר</option>
      {timeOptions.map((time) => (
        <option key={time} value={time}>
          {formatTimeForDisplay(time)}
        </option>
      ))}
    </select>
  </div>
)

export function QuietHoursSettings({
  values,
  onChange,
  getFieldStatus = () => 'idle'
}: QuietHoursSettingsProps) {
  const hasQuietHours = values.quiet_hours_start && values.quiet_hours_end
  
  const handleClearQuietHours = () => {
    onChange('quiet_hours_start', null)
    onChange('quiet_hours_end', null)
  }
  
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">שעות שקט</h3>
        <p className="text-xs text-muted-foreground">
          הגדר שעות בהן לא תרצה לקבל התראות
        </p>
      </div>

      {/* Main explanation card */}
      <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Moon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-foreground">
              {hasQuietHours ? 'שעות שקט מוגדרות' : 'התראות 24/7'}
            </div>
            <div className="text-xs text-muted-foreground">
              {hasQuietHours 
                ? `לא תקבל התראות בין ${formatTimeForDisplay(values.quiet_hours_start)} ל-${formatTimeForDisplay(values.quiet_hours_end)}`
                : 'תקבל התראות מיידיות בכל שעה'}
            </div>
          </div>
          {hasQuietHours && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearQuietHours}
              className="text-xs h-8 px-2"
            >
              <X className="h-3 w-3 ml-1" />
              בטל
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <TimeSelect
            value={values.quiet_hours_start}
            onChange={(val) => onChange('quiet_hours_start', val)}
            label="מ-"
            status={getFieldStatus('quiet_hours_start')}
          />
          <TimeSelect
            value={values.quiet_hours_end}
            onChange={(val) => onChange('quiet_hours_end', val)}
            label="עד-"
            status={getFieldStatus('quiet_hours_end')}
          />
        </div>
        
        <p className="text-xs text-muted-foreground mt-4 p-3 rounded-lg bg-white/50 dark:bg-black/20">
          {hasQuietHours 
            ? '💡 התראות שמגיעות בשעות השקט ישמרו וישלחו מיד בסיום שעות השקט.'
            : '💡 השאר "לא מוגדר" כדי לקבל התראות בכל שעה ביממה ולא לפספס הזדמנויות.'}
        </p>
      </div>

      {/* Visual schedule - only show if quiet hours are set */}
      {hasQuietHours && (
        <div className="p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
          <div className="text-xs font-medium text-foreground mb-3">תצוגת לוח זמנים</div>
          <div className="relative h-8 rounded-full bg-green-100 dark:bg-green-900/30 overflow-hidden">
            {/* Quiet hours - show in purple */}
            <div
              className="absolute h-full bg-indigo-400/70"
              style={{
                left: `${(parseInt(values.quiet_hours_start!.split(':')[0]) / 24) * 100}%`,
                width: `${((parseInt(values.quiet_hours_end!.split(':')[0]) < parseInt(values.quiet_hours_start!.split(':')[0]) 
                    ? 24 - parseInt(values.quiet_hours_start!.split(':')[0]) + parseInt(values.quiet_hours_end!.split(':')[0])
                    : parseInt(values.quiet_hours_end!.split(':')[0]) - parseInt(values.quiet_hours_start!.split(':')[0])) / 24) * 100}%`
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700" />
              <span className="text-muted-foreground">התראות פעילות</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-indigo-400/70" />
              <span className="text-muted-foreground">שעות שקט</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

