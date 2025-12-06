"use client"

import { Suspense } from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Hourglass,
  Loader2, 
  Home, 
  Bell,
  Calendar,
  CalendarDays,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useHaptics } from '@/hooks/use-haptics'
import { pwaFetch, cn } from '@/lib/utils'

interface PresetOption {
  id: string
  label: string
  days: number
  icon: string
}

const PRESETS: PresetOption[] = [
  { id: 'week', label: 'שבוע', days: 7, icon: '📅' },
  { id: 'two-weeks', label: 'שבועיים', days: 14, icon: '📆' },
  { id: 'month', label: 'חודש', days: 30, icon: '🗓️' }
]

function ExpiryReminderContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const haptics = useHaptics()
  
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [actionComplete, setActionComplete] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    action?: string
  } | null>(null)
  
  // Parse URL params
  const subscriptionId = searchParams.get('subscription')
  const remaining = parseInt(searchParams.get('remaining') || '0')
  
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])
  
  const handleExtend = useCallback(async (days: number) => {
    if (!subscriptionId) {
      toast.error('חסר מזהה התראה')
      return
    }
    
    setProcessing(true)
    haptics.medium()
    
    try {
      const response = await pwaFetch(`/api/notifications/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extend_by_days: days })
      })
      
      if (response.ok) {
        haptics.success()
        setResult({
          success: true,
          message: `ההתראה הוארכה בהצלחה ל-${days} ימים נוספים!`,
          action: 'extend'
        })
        setActionComplete(true)
        toast.success('ההתראה הוארכה בהצלחה! 🎉')
      } else {
        const error = await response.json()
        haptics.error()
        setResult({
          success: false,
          message: error.message || 'אירעה שגיאה בהארכת ההתראה'
        })
        toast.error(error.message || 'שגיאה בהארכת ההתראה')
      }
    } catch (error) {
      console.error('Extend error:', error)
      haptics.error()
      setResult({
        success: false,
        message: 'שגיאה בתקשורת עם השרת'
      })
      toast.error('שגיאה בתקשורת')
    } finally {
      setProcessing(false)
    }
  }, [subscriptionId, haptics])
  
  const handleCancel = useCallback(async () => {
    if (!subscriptionId) {
      toast.error('חסר מזהה התראה')
      return
    }
    
    setProcessing(true)
    haptics.medium()
    
    try {
      const response = await pwaFetch(`/api/notifications/subscriptions/${subscriptionId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        haptics.success()
        setResult({
          success: true,
          message: 'ההתראה בוטלה בהצלחה',
          action: 'cancel'
        })
        setActionComplete(true)
        toast.success('ההתראה בוטלה')
      } else {
        const error = await response.json()
        haptics.error()
        setResult({
          success: false,
          message: error.message || 'אירעה שגיאה בביטול ההתראה'
        })
        toast.error(error.message || 'שגיאה בביטול')
      }
    } catch (error) {
      console.error('Cancel error:', error)
      haptics.error()
      setResult({
        success: false,
        message: 'שגיאה בתקשורת עם השרת'
      })
      toast.error('שגיאה בתקשורת')
    } finally {
      setProcessing(false)
    }
  }, [subscriptionId, haptics])
  
  const handlePresetClick = (preset: PresetOption) => {
    haptics.light()
    setSelectedPreset(preset.id)
    handleExtend(preset.days)
  }
  
  // Format countdown
  const countdownText = remaining === 0 
    ? 'מסתיימת היום!' 
    : remaining === 1 
      ? 'מסתיימת מחר' 
      : `${remaining} ימים נותרו`
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <p className="text-muted-foreground">טוען...</p>
        </motion.div>
      </div>
    )
  }
  
  // Action complete state
  if (actionComplete && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl text-center"
        >
          {result.success ? (
            <>
              <div className={cn(
                "w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center",
                result.action === 'extend' 
                  ? "bg-green-100 dark:bg-green-900/30" 
                  : "bg-blue-100 dark:bg-blue-900/30"
              )}>
                {result.action === 'extend' ? (
                  <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                ) : (
                  <Bell className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {result.action === 'extend' ? 'הוארך בהצלחה! 🎉' : 'בוטל בהצלחה'}
              </h1>
              <p className="text-muted-foreground mb-8">{result.message}</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-6 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">שגיאה</h1>
              <p className="text-muted-foreground mb-8">{result.message}</p>
            </>
          )}
          
          <div className="space-y-3">
            <Button onClick={() => router.push('/')} className="w-full" size="lg">
              <Home className="ml-2 h-4 w-4" />
              לדף הבית
            </Button>
            <Button onClick={() => router.push('/subscribe')} variant="outline" className="w-full" size="lg">
              <Bell className="ml-2 h-4 w-4" />
              ניהול התראות
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }
  
  // Main view
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-950 dark:to-gray-900 page-content-bottom-spacing">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto shadow-lg">
            <Hourglass className="h-12 w-12 text-white" />
          </div>
          
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              ההתראה מסתיימת בקרוב
            </h1>
            <Badge 
              variant={remaining === 0 ? "destructive" : "secondary"} 
              className="text-sm px-4 py-1"
            >
              {countdownText}
            </Badge>
          </div>
          
          <p className="text-muted-foreground">
            רוצה להמשיך לקבל עדכונים על תורים פנויים?
          </p>
        </motion.div>
        
        {/* Quick Presets */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <h2 className="text-lg font-semibold text-foreground text-center">הארכה מהירה</h2>
          
          <div className="grid grid-cols-3 gap-3">
            <AnimatePresence>
              {PRESETS.map((preset, index) => (
                <motion.button
                  key={preset.id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePresetClick(preset)}
                  disabled={processing}
                  className={cn(
                    "relative p-6 rounded-2xl text-center transition-all shadow-lg",
                    "bg-white dark:bg-gray-800 border-2",
                    selectedPreset === preset.id 
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20" 
                      : "border-gray-200 dark:border-gray-700 hover:border-orange-300",
                    processing && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="text-3xl mb-2">{preset.icon}</div>
                  <div className="font-bold text-foreground text-sm">{preset.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{preset.days} ימים</div>
                  
                  {selectedPreset === preset.id && processing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 rounded-2xl">
                      <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                    </div>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
        
        {/* Info Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-semibold mb-1">💡 כיצד זה עובד?</p>
              <p className="text-blue-700 dark:text-blue-200">
                ההארכה תוסיף את מספר הימים שבחרת לטווח התאריכים הקיים. 
                המערכת תמשיך לעקוב אחר תורים פנויים ולשלוח לך התראות.
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Manual Options */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <Button
            onClick={() => router.push('/subscribe')}
            variant="outline"
            size="lg"
            className="w-full h-14 text-base border-2 rounded-xl"
            disabled={processing}
          >
            <CalendarDays className="ml-2 h-5 w-5" />
            בחירת תאריכים מותאמת אישית
          </Button>
        </motion.div>
        
        {/* Danger Zone */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3"
        >
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">לא צריך יותר התראות?</p>
            <Button
              onClick={handleCancel}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              disabled={processing}
            >
              <AlertTriangle className="ml-2 h-4 w-4" />
              ביטול ההתראה
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function ExpiryReminderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <p className="text-muted-foreground">טוען...</p>
        </div>
      </div>
    }>
      <ExpiryReminderContent />
    </Suspense>
  )
}

