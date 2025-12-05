'use client'

import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeliveryScheduleProps {
  values: {
    preferred_delivery_start: string
    preferred_delivery_end: string
    quiet_hours_start: string | null  // null = not set
    quiet_hours_end: string | null    // null = not set
  }
  onChange: (key: string, value: string | null) => void
  disabled?: boolean
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
  allowNull?: boolean  // Whether to show "Not set" option
}

const TimeSelect = ({ value, onChange, disabled, label, allowNull = false }: TimeSelectProps) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-muted-foreground">{label}</label>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      disabled={disabled}
      className={cn(
        "px-3 py-2 rounded-lg text-sm font-medium",
        "bg-gray-100 dark:bg-gray-800 border-0",
        "focus:outline-none focus:ring-2 focus:ring-blue-500",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        !value && allowNull && "text-muted-foreground"
      )}
    >
      {allowNull && (
        <option value="">לא מוגדר</option>
      )}
      {timeOptions.map((time) => (
        <option key={time} value={time}>
          {formatTimeForDisplay(time)}
        </option>
      ))}
    </select>
  </div>
)

export function DeliverySchedule({
  values,
  onChange,
  disabled = false
}: DeliveryScheduleProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">לוח זמנים</h3>
        <p className="text-xs text-muted-foreground">הגדר מתי לשלוח לך התראות</p>
      </div>

      {/* Preferred delivery hours */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
            <Sun className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-medium text-sm text-foreground">שעות מועדפות</div>
            <div className="text-xs text-muted-foreground">בטווח הזה - התראות יישלחו מיד</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <TimeSelect
            value={values.preferred_delivery_start}
            onChange={(val) => onChange('preferred_delivery_start', val)}
            disabled={disabled}
            label="מ-"
          />
          <TimeSelect
            value={values.preferred_delivery_end}
            onChange={(val) => onChange('preferred_delivery_end', val)}
            disabled={disabled}
            label="עד-"
          />
        </div>
        
        <p className="text-xs text-muted-foreground mt-3">
          התראות שמגיעות בטווח הזה יישלחו מיד. מחוץ לטווח - ימתינו לשעת ההתחלה.
        </p>
      </div>

      {/* Quiet hours */}
      <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Moon className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-medium text-sm text-foreground">שעות שקט</div>
            <div className="text-xs text-muted-foreground">
              {!values.quiet_hours_start && !values.quiet_hours_end 
                ? 'לא מוגדר - תקבל התראות בכל שעה' 
                : 'לא לשלוח התראות בכלל'}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <TimeSelect
            value={values.quiet_hours_start}
            onChange={(val) => onChange('quiet_hours_start', val)}
            disabled={disabled}
            label="מ-"
            allowNull={true}
          />
          <TimeSelect
            value={values.quiet_hours_end}
            onChange={(val) => onChange('quiet_hours_end', val)}
            disabled={disabled}
            label="עד-"
            allowNull={true}
          />
        </div>
        
        <p className="text-xs text-muted-foreground mt-3">
          {!values.quiet_hours_start && !values.quiet_hours_end 
            ? 'השאר "לא מוגדר" אם ברצונך לקבל התראות 24/7.'
            : 'בשעות אלו לא תקבל התראות כלל. ההתראות ישמרו וישלחו כשתסתיים תקופת השקט.'}
        </p>
      </div>

      {/* Visual schedule */}
      <div className="p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
        <div className="text-xs font-medium text-foreground mb-3">סקירת לוח הזמנים שלך</div>
        <div className="relative h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          {/* Quiet hours - only show if both values are set */}
          {values.quiet_hours_start && values.quiet_hours_end && (
            <div
              className="absolute h-full bg-indigo-400/50"
              style={{
                left: `${(parseInt(values.quiet_hours_start.split(':')[0]) / 24) * 100}%`,
                width: `${((parseInt(values.quiet_hours_end.split(':')[0]) < parseInt(values.quiet_hours_start.split(':')[0]) 
                    ? 24 - parseInt(values.quiet_hours_start.split(':')[0]) + parseInt(values.quiet_hours_end.split(':')[0])
                    : parseInt(values.quiet_hours_end.split(':')[0]) - parseInt(values.quiet_hours_start.split(':')[0])) / 24) * 100}%`
              }}
            />
          )}
          {/* Preferred hours */}
          <div
            className="absolute h-full bg-amber-400/60"
            style={{
              left: `${(parseInt(values.preferred_delivery_start?.split(':')[0] || '8') / 24) * 100}%`,
              width: values.preferred_delivery_start && values.preferred_delivery_end ?
                `${((parseInt(values.preferred_delivery_end.split(':')[0]) - parseInt(values.preferred_delivery_start.split(':')[0])) / 24) * 100}%`
                : '0%'
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
            <div className="w-3 h-3 rounded bg-amber-400/60" />
            <span className="text-muted-foreground">מועדף</span>
          </div>
          {values.quiet_hours_start && values.quiet_hours_end && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-indigo-400/50" />
              <span className="text-muted-foreground">שקט</span>
            </div>
          )}
          {!values.quiet_hours_start && !values.quiet_hours_end && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground italic">שעות שקט לא מוגדרות</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
