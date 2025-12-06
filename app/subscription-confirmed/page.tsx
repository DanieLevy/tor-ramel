"use client"

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Loader2, 
  Home, 
  Bell,
  CheckCircle,
  Sparkles,
  Calendar,
  Mail,
  Smartphone,
  Clock,
  Zap
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useHaptics } from '@/hooks/use-haptics'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

function SubscriptionConfirmedContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const haptics = useHaptics()
  
  const [loading, setLoading] = useState(true)
  
  // Parse URL params
  const startDate = searchParams.get('start')
  const endDate = searchParams.get('end')
  const method = searchParams.get('method') || 'email'
  
  useEffect(() => {
    haptics.success()
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [haptics])
  
  const handleViewSubscriptions = () => {
    haptics.light()
    router.push('/subscribe')
  }
  
  const handleGoHome = () => {
    haptics.light()
    router.push('/')
  }
  
  // Format dates
  const dateRangeText = startDate && endDate 
    ? `${format(new Date(startDate), 'dd MMM', { locale: he })} - ${format(new Date(endDate), 'dd MMM', { locale: he })}`
    : 'התאריכים שבחרת'
  
  // Method text
  const methodText = method === 'both' 
    ? 'דואר אלקטרוני + התראות Push' 
    : method === 'push' 
      ? 'התראות Push' 
      : 'דואר אלקטרוני'
  
  const methodIcon = method === 'both' 
    ? [Mail, Smartphone] 
    : method === 'push' 
      ? [Smartphone] 
      : [Mail]
  
  // Loading state with celebration
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-center"
        >
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-2xl"
          >
            <CheckCircle className="h-12 w-12 text-white" />
          </motion.div>
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg font-semibold text-foreground"
          >
            יוצר התראה...
          </motion.p>
        </motion.div>
      </div>
    )
  }
  
  // Main view
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-950 dark:to-gray-900 page-content-bottom-spacing">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Success Header with Confetti Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-center space-y-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 20,
              delay: 0.1 
            }}
            className="relative w-32 h-32 mx-auto"
          >
            {/* Confetti elements */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{ 
                  scale: [0, 1, 1],
                  x: [0, (Math.random() - 0.5) * 100],
                  y: [0, (Math.random() - 0.5) * 100],
                  opacity: [1, 1, 0]
                }}
                transition={{ 
                  duration: 1.5, 
                  delay: 0.2 + i * 0.05,
                  ease: "easeOut"
                }}
                className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full"
                style={{
                  backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][i % 4]
                }}
              />
            ))}
            
            {/* Main checkmark icon */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-2xl">
              <CheckCircle className="h-16 w-16 text-white" strokeWidth={2.5} />
            </div>
            
            {/* Sparkle effect */}
            <motion.div
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: [0, 1.2, 1], rotate: [0, 180, 360] }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="absolute -top-2 -right-2"
            >
              <Sparkles className="h-8 w-8 text-yellow-400 fill-yellow-400" />
            </motion.div>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-4xl font-bold text-foreground mb-2">
              מעולה! 🎉
            </h1>
            <p className="text-xl text-green-600 dark:text-green-400 font-semibold">
              ההתראה נוצרה בהצלחה
            </p>
          </motion.div>
        </motion.div>
        
        {/* Subscription Details */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-lg border-2 border-green-200 dark:border-green-800 space-y-4"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
            <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">טווח תאריכים</div>
              <div className="text-lg font-bold text-foreground">{dateRangeText}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {methodIcon.map((Icon, idx) => (
              <Icon key={idx} className="h-5 w-5 text-green-600 dark:text-green-400" />
            ))}
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">שיטת התראה</div>
              <div className="text-base font-semibold text-foreground">{methodText}</div>
            </div>
          </div>
        </motion.div>
        
        {/* What Happens Next */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-6 border border-blue-200 dark:border-blue-800"
        >
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            מה קורה עכשיו?
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                1
              </div>
              <div>
                <div className="font-semibold text-foreground">סריקה אוטומטית</div>
                <div className="text-sm text-muted-foreground">
                  המערכת בודקת תורים פנויים כל 5 דקות
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                2
              </div>
              <div>
                <div className="font-semibold text-foreground">התראה מיידית</div>
                <div className="text-sm text-muted-foreground">
                  תקבל הודעה ברגע שנמצא תור פנוי
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                3
              </div>
              <div>
                <div className="font-semibold text-foreground">בחירה מהירה</div>
                <div className="text-sm text-muted-foreground">
                  לחץ על "מצאתי תור" כשמצאת תור מתאים
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Tip Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800"
        >
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 dark:text-amber-100">
              <p className="font-semibold mb-1">💡 טיפ חשוב</p>
              <p className="text-amber-700 dark:text-amber-200">
                התראות מגיעות רק בין השעות 07:00-22:00 (או לפי ההגדרות שלך).
                המערכת מכבדת את זמני השקט שלך.
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="space-y-3 pt-4"
        >
          <Button
            onClick={handleGoHome}
            size="lg"
            className="w-full h-14 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl shadow-lg"
          >
            <Home className="ml-2 h-5 w-5" />
            לדף הבית
          </Button>
          
          <Button
            onClick={handleViewSubscriptions}
            variant="outline"
            size="lg"
            className="w-full h-14 text-base border-2 rounded-xl"
          >
            <Bell className="ml-2 h-5 w-5" />
            ניהול כל ההתראות שלי
          </Button>
        </motion.div>
      </div>
    </div>
  )
}

export default function SubscriptionConfirmedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <p className="text-muted-foreground">טוען...</p>
        </div>
      </div>
    }>
      <SubscriptionConfirmedContent />
    </Suspense>
  )
}

