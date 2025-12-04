"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/hooks/use-haptics'
import { motion } from 'framer-motion'
import { Sun, Sunrise, Sunset, Clock, CheckCircle2, X } from 'lucide-react'

export interface TimeRange {
  start: string
  end: string
}

interface PresetTimeRange {
  id: string
  label: string
  sublabel: string
  icon: typeof Sun
  start: string
  end: string
  color: string
}

const PRESET_TIMES: PresetTimeRange[] = [
  {
    id: 'morning',
    label: 'בוקר',
    sublabel: '08:00-12:00',
    icon: Sunrise,
    start: '08:00',
    end: '12:00',
    color: 'from-amber-400 to-orange-500',
  },
  {
    id: 'afternoon',
    label: 'צהריים',
    sublabel: '12:00-16:00',
    icon: Sun,
    start: '12:00',
    end: '16:00',
    color: 'from-yellow-400 to-amber-500',
  },
  {
    id: 'evening',
    label: 'ערב',
    sublabel: '16:00-20:00',
    icon: Sunset,
    start: '16:00',
    end: '20:00',
    color: 'from-orange-400 to-rose-500',
  },
]

interface FavoriteTimesSelectorProps {
  value: TimeRange[]
  onChange: (ranges: TimeRange[]) => void
  className?: string
}

export function FavoriteTimesSelector({ value, onChange, className }: FavoriteTimesSelectorProps) {
  const haptics = useHaptics()
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const isPresetSelected = (preset: PresetTimeRange) => {
    return value.some(r => r.start === preset.start && r.end === preset.end)
  }

  const togglePreset = (preset: PresetTimeRange) => {
    haptics.light()
    
    if (isPresetSelected(preset)) {
      // Remove preset
      onChange(value.filter(r => !(r.start === preset.start && r.end === preset.end)))
    } else {
      // Add preset
      onChange([...value, { start: preset.start, end: preset.end }])
    }
  }

  const isCustomRange = (range: TimeRange) => {
    return !PRESET_TIMES.some(p => p.start === range.start && p.end === range.end)
  }

  const addCustomRange = () => {
    if (!customStart || !customEnd) return
    if (customStart >= customEnd) {
      return // Invalid range
    }
    
    haptics.medium()
    
    // Check if already exists
    const exists = value.some(r => r.start === customStart && r.end === customEnd)
    if (!exists) {
      onChange([...value, { start: customStart, end: customEnd }])
    }
    
    setCustomStart('')
    setCustomEnd('')
    setShowCustom(false)
  }

  const removeRange = (range: TimeRange) => {
    haptics.light()
    onChange(value.filter(r => !(r.start === range.start && r.end === range.end)))
  }

  const customRanges = value.filter(isCustomRange)

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <Label className="text-sm font-medium mb-2 block">שעות מועדפות (אופציונלי)</Label>
        <p className="text-xs text-muted-foreground mb-3">
          קבל התראות רק על שעות אלו. השאר ריק להתראות על כל השעות.
        </p>
      </div>

      {/* Preset Time Ranges */}
      <div className="grid grid-cols-3 gap-2">
        {PRESET_TIMES.map((preset) => {
          const Icon = preset.icon
          const isSelected = isPresetSelected(preset)

          return (
            <motion.button
              key={preset.id}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => togglePreset(preset)}
              className={cn(
                'relative p-3 rounded-xl border-2 transition-all touch-manipulation',
                'flex flex-col items-center gap-1.5',
                isSelected
                  ? 'border-primary bg-primary/10 dark:bg-primary/20'
                  : 'border-transparent bg-white/50 dark:bg-white/5 hover:border-primary/30'
              )}
            >
              <div className={cn(
                'p-2 rounded-lg',
                isSelected
                  ? `bg-gradient-to-br ${preset.color}`
                  : 'bg-muted'
              )}>
                <Icon className={cn(
                  'h-4 w-4',
                  isSelected ? 'text-white' : 'text-muted-foreground'
                )} />
              </div>
              <span className="font-medium text-sm">{preset.label}</span>
              <span className="text-[10px] text-muted-foreground" dir="ltr">
                {preset.sublabel}
              </span>
              {isSelected && (
                <CheckCircle2 className="absolute top-1 left-1 h-4 w-4 text-primary" />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Custom Ranges Display */}
      {customRanges.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">טווחים מותאמים:</Label>
          <div className="flex flex-wrap gap-2">
            {customRanges.map((range, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs"
              >
                <Clock className="h-3 w-3" />
                <span dir="ltr">{range.start}-{range.end}</span>
                <button
                  type="button"
                  onClick={() => removeRange(range)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Range Input */}
      {showCustom ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 rounded-xl border bg-white/50 dark:bg-white/5 space-y-3"
        >
          <Label className="text-xs">הוסף טווח מותאם אישית:</Label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="flex-1 h-9 rounded-lg border px-2 text-sm"
              dir="ltr"
            />
            <span className="text-muted-foreground text-sm">עד</span>
            <input
              type="time"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="flex-1 h-9 rounded-lg border px-2 text-sm"
              dir="ltr"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={addCustomRange}
              disabled={!customStart || !customEnd || customStart >= customEnd}
              className="flex-1"
            >
              הוסף
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCustom(false)
                setCustomStart('')
                setCustomEnd('')
              }}
            >
              ביטול
            </Button>
          </div>
        </motion.div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            haptics.light()
            setShowCustom(true)
          }}
          className="w-full text-xs"
        >
          <Clock className="h-3.5 w-3.5 ml-1" />
          הוסף טווח מותאם אישית
        </Button>
      )}

      {/* Summary */}
      {value.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          נבחרו {value.length} טווחי זמן
        </p>
      )}
    </div>
  )
}



