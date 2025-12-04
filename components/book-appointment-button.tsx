"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Loader2, PartyPopper, ExternalLink } from 'lucide-react'
import { cn, pwaFetch } from '@/lib/utils'
import { toast } from 'sonner'
import { useHaptics } from '@/hooks/use-haptics'
import { motion } from 'framer-motion'

interface BookAppointmentButtonProps {
  appointmentDate: string
  appointmentTime?: string
  bookingUrl?: string
  subscriptionId?: string
  source?: 'subscription' | 'proactive' | 'manual' | 'search'
  onBooked?: () => void
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function BookAppointmentButton({
  appointmentDate,
  appointmentTime,
  bookingUrl,
  subscriptionId,
  source = 'search',
  onBooked,
  className,
  variant = 'default',
  size = 'default',
}: BookAppointmentButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedTime, setSelectedTime] = useState(appointmentTime || '')
  const [showSuccess, setShowSuccess] = useState(false)
  const haptics = useHaptics()

  const handleConfirmBooking = async () => {
    haptics.medium()
    setLoading(true)

    try {
      const response = await pwaFetch('/api/appointments/booked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booked_date: appointmentDate,
          booked_time: selectedTime || null,
          subscription_id: subscriptionId || null,
          source,
          booking_url: bookingUrl,
        }),
      })

      if (response.ok) {
        haptics.success()
        setShowSuccess(true)
        
        // Show success for 2 seconds then close
        setTimeout(() => {
          setShowSuccess(false)
          setOpen(false)
          onBooked?.()
        }, 2000)
      } else {
        const data = await response.json()
        haptics.error()
        toast.error(data.error || 'שגיאה בשמירת ההזמנה')
      }
    } catch (error) {
      console.error('Error booking appointment:', error)
      haptics.error()
      toast.error('שגיאה בשמירת ההזמנה')
    } finally {
      setLoading(false)
    }
  }

  const formattedDate = new Date(appointmentDate + 'T00:00:00').toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn('gap-2', className)}
          onClick={() => haptics.light()}
        >
          <CheckCircle2 className="h-4 w-4" />
          הזמנתי!
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-elevated sm:max-w-md">
        {showSuccess ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="py-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 mb-4"
            >
              <PartyPopper className="h-10 w-10 text-white" />
            </motion.div>
            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              מעולה! 🎉
            </h3>
            <p className="text-muted-foreground mt-2">
              התור נרשם בהצלחה
            </p>
          </motion.div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>אישור הזמנת תור</DialogTitle>
              <DialogDescription>
                סמן שהזמנת את התור הזה כדי לעקוב אחר ההצלחה שלך
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Date Display */}
              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-700/30">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  {formattedDate}
                </p>
                {selectedTime && (
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                    שעה: {selectedTime}
                  </p>
                )}
              </div>

              {/* Time Input (if not provided) */}
              {!appointmentTime && (
                <div className="space-y-2">
                  <Label htmlFor="time">שעת התור (אופציונלי)</Label>
                  <Input
                    id="time"
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="dir-ltr text-left"
                  />
                </div>
              )}

              {/* Booking URL Link */}
              {bookingUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full"
                >
                  <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 ml-2" />
                    פתח אתר ההזמנות
                  </a>
                </Button>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                ביטול
              </Button>
              <Button
                onClick={handleConfirmBooking}
                disabled={loading}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 ml-2" />
                    אישור הזמנה
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}



