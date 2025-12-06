"use client"

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Loader2, 
  Home, 
  Bell,
  Calendar,
  Clock,
  Star,
  TrendingUp,
  Search,
  Plus,
  BarChart3
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useHaptics } from '@/hooks/use-haptics'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { cn } from '@/lib/utils'

function WeeklyDigestContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const haptics = useHaptics()
  
  const [loading, setLoading] = useState(true)
  
  // Parse URL params
  const availableCount = parseInt(searchParams.get('count') || '0')
  const totalTimes = parseInt(searchParams.get('times') || '0')
  const weekStart = searchParams.get('start')
  const weekEnd = searchParams.get('end')
  
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])
  
  const handleExplore = () => {
    haptics.light()
    router.push('/search')
  }
  
  const handleCreateNotification = () => {
    haptics.light()
    router.push('/subscribe')
  }
  
  const handleGoHome = () => {
    haptics.light()
    router.push('/')
  }
  
  // Format dates
  const weekRangeText = weekStart && weekEnd 
    ? `${format(new Date(weekStart), 'dd MMM', { locale: he })} - ${format(new Date(weekEnd), 'dd MMM', { locale: he })}`
    : 'השבוע'
  
  // Calculate stats
  const avgTimesPerDay = availableCount > 0 ? Math.round(totalTimes / availableCount) : 0
  const percentage = Math.min(100, Math.round((availableCount / 7) * 100))
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <p className="text-muted-foreground">טוען סיכום...</p>
        </motion.div>
      </div>
    )
  }
  
  // Main view
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-950 dark:to-gray-900 page-content-bottom-spacing">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mx-auto shadow-lg">
            <BarChart3 className="h-12 w-12 text-white" />
          </div>
          
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              סיכום שבועי
            </h1>
            <p className="text-muted-foreground">{weekRangeText}</p>
          </div>
        </motion.div>
        
        {/* Main Stats Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "p-8 rounded-3xl shadow-lg text-center space-y-4",
            availableCount > 0 
              ? "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-200 dark:border-green-800" 
              : "bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800"
          )}
        >
          {availableCount > 0 ? (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 text-white mb-2">
                <Star className="h-8 w-8" fill="currentColor" />
              </div>
              <div className="space-y-2">
                <div className="text-6xl font-bold text-green-700 dark:text-green-300">
                  {totalTimes}
                </div>
                <div className="text-xl font-semibold text-green-600 dark:text-green-400">
                  תורים זמינים
                </div>
                <div className="text-sm text-green-700/80 dark:text-green-300/80">
                  ב-{availableCount} ימים שונים
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800 mb-2">
                <Calendar className="h-8 w-8 text-gray-500" />
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-foreground">
                  אין תורים פנויים
                </div>
                <div className="text-sm text-muted-foreground">
                  לא נמצאו תורים זמינים השבוע
                </div>
              </div>
            </>
          )}
        </motion.div>
        
        {/* Statistics Grid */}
        {availableCount > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-3"
          >
            <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow border border-gray-200 dark:border-gray-800 text-center">
              <Calendar className="h-6 w-6 text-indigo-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{availableCount}</div>
              <div className="text-xs text-muted-foreground">ימים</div>
            </div>
            
            <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow border border-gray-200 dark:border-gray-800 text-center">
              <Clock className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{avgTimesPerDay}</div>
              <div className="text-xs text-muted-foreground">ממוצע ליום</div>
            </div>
            
            <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow border border-gray-200 dark:border-gray-800 text-center">
              <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{percentage}%</div>
              <div className="text-xs text-muted-foreground">זמינות</div>
            </div>
          </motion.div>
        )}
        
        {/* Progress Bar */}
        {availableCount > 0 && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">כיסוי שבועי</span>
              <span className="font-semibold text-foreground">{availableCount}/7 ימים</span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              />
            </div>
          </motion.div>
        )}
        
        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-3 pt-4"
        >
          {availableCount > 0 ? (
            <>
              <Button
                onClick={handleExplore}
                size="lg"
                className="w-full h-14 text-base bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-lg"
              >
                <Search className="ml-2 h-5 w-5" />
                חקור תורים זמינים
              </Button>
              
              <Button
                onClick={handleCreateNotification}
                variant="outline"
                size="lg"
                className="w-full h-14 text-base border-2 rounded-xl"
              >
                <Bell className="ml-2 h-5 w-5" />
                צור התראה חדשה
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleCreateNotification}
                size="lg"
                className="w-full h-14 text-base bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-lg"
              >
                <Plus className="ml-2 h-5 w-5" />
                צור התראה לשבוע הבא
              </Button>
            </>
          )}
          
          <Button
            onClick={handleGoHome}
            variant="ghost"
            size="lg"
            className="w-full h-14 text-base rounded-xl"
          >
            <Home className="ml-2 h-5 w-5" />
            לדף הבית
          </Button>
        </motion.div>
        
        {/* Info Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800"
        >
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-semibold mb-1">💡 טיפ</p>
            <p className="text-blue-700 dark:text-blue-200">
              הסיכום השבועי מעודכן כל ראשון בבוקר ומציג את כל התורים שנמצאו בשבוע האחרון.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function WeeklyDigestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <p className="text-muted-foreground">טוען...</p>
        </div>
      </div>
    }>
      <WeeklyDigestContent />
    </Suspense>
  )
}

