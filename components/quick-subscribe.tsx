"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Zap, Calendar, CalendarRange, CheckCircle2 } from 'lucide-react'
import { cn, pwaFetch } from '@/lib/utils'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useHaptics } from '@/hooks/use-haptics'
import { useRouter } from 'next/navigation'
import { Interactive } from '@/components/page-transition'

interface QuickSubscribePreset {
  id: string
  label: string
  sublabel: string
  icon: typeof Calendar
  daysAhead: number
  color: string
  hoverColor: string
}

const PRESETS: QuickSubscribePreset[] = [
  {
    id: 'week',
    label: 'השבוע הקרוב',
    sublabel: '7 ימים',
    icon: Calendar,
    daysAhead: 7,
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-600',
  },
  {
    id: 'two-weeks',
    label: 'שבועיים',
    sublabel: '14 ימים',
    icon: CalendarRange,
    daysAhead: 14,
    color: 'bg-indigo-500',
    hoverColor: 'hover:bg-indigo-600',
  },
  {
    id: 'month',
    label: 'החודש',
    sublabel: '30 ימים',
    icon: CalendarRange,
    daysAhead: 30,
    color: 'bg-violet-500',
    hoverColor: 'hover:bg-violet-600',
  },
]

interface QuickSubscribeProps {
  onSubscribed?: () => void
  className?: string
}

export function QuickSubscribe({ onSubscribed, className }: QuickSubscribeProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)
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

      const response = await pwaFetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_range_start: startDateStr,
          date_range_end: endDateStr,
        }),
      })

      if (response.ok) {
        haptics.success()
        setSuccessId(preset.id)
        toast.success(`נרשמת להתראות עבור ${preset.label}!`, {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        })
        
        // Show success state briefly then callback
        setTimeout(() => {
          setSuccessId(null)
          onSubscribed?.()
        }, 1000)
      } else {
        const data = await response.json()
        haptics.error()
        toast.error(data.error || 'שגיאה ביצירת ההתראה')
      }
    } catch {
      haptics.error()
      toast.error('שגיאה ביצירת ההתראה')
    } finally {
      setLoading(null)
    }
  }

  const handleCustomClick = () => {
    haptics.light()
    router.push('/subscribe')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl border border-border bg-card overflow-hidden', className)}
    >
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-amber-500">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-semibold text-sm">התראה מהירה</h3>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="p-4 pt-0">
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((preset, index) => {
            const Icon = preset.icon
            const isLoading = loading === preset.id
            const isSuccess = successId === preset.id
            const isDisabled = loading !== null || successId !== null

            return (
              <motion.div
                key={preset.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Interactive disabled={isDisabled}>
                  <button
                    disabled={isDisabled}
                    onClick={() => handleQuickSubscribe(preset)}
                    className={cn(
                      'w-full flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl',
                      'text-white font-medium transition-all duration-200',
                      'touch-manipulation active:scale-95',
                      'disabled:opacity-70 disabled:cursor-not-allowed',
                      preset.color,
                      !isDisabled && preset.hoverColor,
                      isSuccess && 'bg-emerald-500'
                    )}
                    aria-label={`הרשמה להתראות עבור ${preset.label}`}
                  >
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </motion.div>
                      ) : isSuccess ? (
                        <motion.div
                          key="success"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="icon"
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                        >
                          <Icon className="h-5 w-5" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <span className="text-xs font-semibold">
                      {isSuccess ? 'נרשמת!' : preset.label}
                    </span>
                    
                    {!isSuccess && (
                      <span className="text-[10px] opacity-80">
                        {preset.sublabel}
                      </span>
                    )}
                  </button>
                </Interactive>
              </motion.div>
            )
          })}
        </div>

        {/* Custom Link */}
        <div className="mt-3 text-center">
          <Button
            variant="link"
            size="sm"
            className="text-xs text-muted-foreground h-auto p-0 hover:text-primary transition-colors"
            onClick={handleCustomClick}
          >
            או בחר תאריכים מותאמים אישית →
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
