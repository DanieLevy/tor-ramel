'use client'

import { Gauge, Timer, Layers } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface FrequencySettingsProps {
  values: {
    max_notifications_per_day: number
    notification_cooldown_minutes: number
    batch_notifications: boolean
    batch_interval_hours: number
  }
  onChange: (key: string, value: number | boolean) => void
  disabled?: boolean
}

export function FrequencySettings({
  values,
  onChange,
  disabled = false
}: FrequencySettingsProps) {
  const getMaxNotificationsLabel = (value: number) => {
    if (value === 0) return 'ללא הגבלה'
    if (value === 1) return 'התראה אחת'
    return `עד ${value} התראות`
  }

  const getCooldownLabel = (minutes: number) => {
    if (minutes === 0) return 'ללא המתנה'
    if (minutes < 60) return `${minutes} דקות`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) {
      return hours === 1 ? 'שעה' : `${hours} שעות`
    }
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')} שעות`
  }

  const getBatchIntervalLabel = (hours: number) => {
    if (hours === 1) return 'כל שעה'
    return `כל ${hours} שעות`
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">בקרת תדירות</h3>
        <p className="text-xs text-muted-foreground">הגדר כמה התראות לקבל וכל כמה זמן</p>
      </div>

      {/* Max notifications per day */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
            <Gauge className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-foreground">התראות ליום</div>
            <div className="text-xs text-muted-foreground">מקסימום התראות ביום אחד</div>
          </div>
          <div className="text-sm font-semibold text-foreground px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full">
            {getMaxNotificationsLabel(values.max_notifications_per_day)}
          </div>
        </div>
        <Slider
          value={[values.max_notifications_per_day]}
          onValueChange={([val]) => onChange('max_notifications_per_day', val)}
          min={0}
          max={20}
          step={1}
          disabled={disabled}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>ללא הגבלה</span>
          <span>20</span>
        </div>
      </div>

      {/* Cooldown between notifications */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
            <Timer className="h-5 w-5 text-orange-500" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-foreground">זמן המתנה</div>
            <div className="text-xs text-muted-foreground">מינימום זמן בין התראות</div>
          </div>
          <div className="text-sm font-semibold text-foreground px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full">
            {getCooldownLabel(values.notification_cooldown_minutes)}
          </div>
        </div>
        <Slider
          value={[values.notification_cooldown_minutes]}
          onValueChange={([val]) => onChange('notification_cooldown_minutes', val)}
          min={0}
          max={240}
          step={15}
          disabled={disabled}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>ללא המתנה</span>
          <span>4 שעות</span>
        </div>
      </div>

      {/* Batch notifications */}
      <div className={cn(
        "p-4 rounded-xl border transition-all",
        values.batch_notifications 
          ? "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10" 
          : "bg-transparent border-black/5 dark:border-white/5"
      )}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
            <Layers className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-medium text-sm text-foreground">איחוד התראות</div>
                <div className="text-xs text-muted-foreground">
                  אסוף כמה התראות ושלח ביחד
                </div>
              </div>
              <Switch
                checked={values.batch_notifications}
                onCheckedChange={(checked) => onChange('batch_notifications', checked)}
                disabled={disabled}
              />
            </div>
            
            {values.batch_notifications && (
              <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">מרווח בין איחודים</span>
                  <span className="text-sm font-semibold text-foreground px-2 py-0.5 bg-black/10 dark:bg-white/10 rounded-full">
                    {getBatchIntervalLabel(values.batch_interval_hours)}
                  </span>
                </div>
                <Slider
                  value={[values.batch_interval_hours]}
                  onValueChange={([val]) => onChange('batch_interval_hours', val)}
                  min={1}
                  max={12}
                  step={1}
                  disabled={disabled}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>שעה</span>
                  <span>12 שעות</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  במקום לקבל כל התראה בנפרד, תקבל סיכום של כל התורים החדשים {getBatchIntervalLabel(values.batch_interval_hours)}.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}



