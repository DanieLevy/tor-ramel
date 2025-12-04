"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Zap, Calendar, CalendarRange } from 'lucide-react'
import { cn, pwaFetch } from '@/lib/utils'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useHaptics } from '@/hooks/use-haptics'
import { useRouter } from 'next/navigation'

interface QuickSubscribePreset {
  id: string
  label: string
  sublabel: string
  icon: typeof Calendar
  daysAhead: number
  variant: 'default' | 'secondary' | 'outline'
}

const PRESETS: QuickSubscribePreset[] = [
  {
    id: 'week',
    label: 'השבוע הקרוב',
    sublabel: '7 ימים',
    icon: Calendar,
    daysAhead: 7,
    variant: 'default',
  },
  {
    id: 'two-weeks',
    label: 'שבועיים',
    sublabel: '14 ימים',
    icon: CalendarRange,
    daysAhead: 14,
    variant: 'secondary',
  },
  {
    id: 'month',
    label: 'החודש',
    sublabel: '30 ימים',
    icon: CalendarRange,
    daysAhead: 30,
    variant: 'outline',
  },
]

interface QuickSubscribeProps {
  onSubscribed?: () => void
  className?: string
}

export function QuickSubscribe({ onSubscribed, className }: QuickSubscribeProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const haptics = useHaptics()
  const router = useRouter()

  const handleQuickSubscribe = async (preset: QuickSubscribePreset) => {
    haptics.medium()
    setLoading(preset.id)

    try {
      const today = new Date()
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + preset.daysAhead)

      const startDateStr = today.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      const response = await pwaFetch('/api/notifications/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_range_start: startDateStr,
          date_range_end: endDateStr,
          notification_method: 'push', // Default to push for quick subscribe
        }),
      })

      if (response.ok) {
        haptics.success()
        toast.success(`נרשמת להתראות עבור ${preset.label}!`)
        onSubscribed?.()
      } else {
        const data = await response.json()
        haptics.error()
        toast.error(data.error || 'שגיאה ביצירת ההתראה')
      }
    } catch (error) {
      console.error('Quick subscribe error:', error)
      haptics.error()
      toast.error('שגיאה ביצירת ההתראה')
    } finally {
      setLoading(null)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('glass rounded-2xl p-4', className)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <h3 className="font-semibold text-sm">התראה מהירה</h3>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((preset) => {
          const Icon = preset.icon
          const isLoading = loading === preset.id

          return (
            <Button
              key={preset.id}
              variant={preset.variant}
              size="sm"
              disabled={loading !== null}
              onClick={() => handleQuickSubscribe(preset)}
              className={cn(
                'h-auto flex-col gap-1 py-3 touch-manipulation',
                preset.variant === 'default' && 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white',
                preset.variant === 'secondary' && 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 border-violet-300/30 hover:border-violet-400/50',
                preset.variant === 'outline' && 'bg-white/50 dark:bg-white/5'
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className={cn(
                  'h-4 w-4',
                  preset.variant === 'default' ? 'text-white' : ''
                )} />
              )}
              <span className={cn(
                'text-xs font-medium',
                preset.variant === 'default' ? 'text-white' : ''
              )}>
                {preset.label}
              </span>
              <span className={cn(
                'text-[10px] opacity-70',
                preset.variant === 'default' ? 'text-white/80' : 'text-muted-foreground'
              )}>
                {preset.sublabel}
              </span>
            </Button>
          )
        })}
      </div>

      {/* Custom Link */}
      <div className="mt-3 text-center">
        <Button
          variant="link"
          size="sm"
          className="text-xs text-muted-foreground h-auto p-0"
          onClick={() => {
            haptics.light()
            router.push('/subscribe')
          }}
        >
          או בחר תאריכים מותאמים אישית →
        </Button>
      </div>
    </motion.div>
  )
}

