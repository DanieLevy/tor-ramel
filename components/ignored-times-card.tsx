'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, Trash2, RefreshCw, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { pwaFetch, cn } from '@/lib/utils'

interface IgnoredTime {
  id: string
  appointment_date: string
  ignored_times: string[]
  created_at: string
  subscription_id: string | null
}

export function IgnoredTimesCard() {
  const [ignoredTimes, setIgnoredTimes] = useState<IgnoredTime[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [clearing, setClearing] = useState(false)

  // Fetch ignored times
  const fetchIgnoredTimes = useCallback(async () => {
    try {
      const response = await pwaFetch('/api/notifications/ignored-times')
      if (response.ok) {
        const data = await response.json()
        // Filter to only future dates
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const futureTimes = (data.ignoredTimes || []).filter((item: IgnoredTime) => {
          const itemDate = new Date(item.appointment_date)
          return itemDate >= now
        })
        setIgnoredTimes(futureTimes)
      }
    } catch (error) {
      console.error('Error fetching ignored times:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIgnoredTimes()
  }, [fetchIgnoredTimes])

  // Clear single ignored time
  const handleClearOne = async (id: string, date: string) => {
    try {
      const response = await pwaFetch(`/api/notifications/ignored-times?id=${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setIgnoredTimes(prev => prev.filter(item => item.id !== id))
        toast.success(`שעות התעלמות ל-${formatDate(date)} הוסרו`)
      } else {
        toast.error('שגיאה בהסרת השעות')
      }
    } catch {
      toast.error('שגיאה בתקשורת')
    }
  }

  // Clear all ignored times
  const handleClearAll = async () => {
    setClearing(true)
    try {
      const response = await pwaFetch('/api/notifications/ignored-times?clearAll=true', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setIgnoredTimes([])
        toast.success('כל שעות ההתעלמות הוסרו')
        setExpanded(false)
      } else {
        toast.error('שגיאה בהסרת השעות')
      }
    } catch {
      toast.error('שגיאה בתקשורת')
    } finally {
      setClearing(false)
    }
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const day = date.getDate()
      const month = date.getMonth() + 1
      return `${day}/${month}`
    } catch {
      return dateStr
    }
  }

  // Don't render if no ignored times
  if (loading) {
    return null
  }

  if (ignoredTimes.length === 0) {
    return null
  }

  const totalIgnoredTimes = ignoredTimes.reduce((sum, item) => sum + item.ignored_times.length, 0)

  return (
    <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-800 overflow-hidden animate-fade-up">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-right"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <div className="font-medium text-sm text-foreground">שעות בהתעלמות</div>
            <div className="text-xs text-muted-foreground">
              {ignoredTimes.length} תאריכים • {totalIgnoredTimes} שעות
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-xs">
            {ignoredTimes.length}
          </Badge>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="overflow-hidden animate-fade-in">
          <div className="px-4 pb-4 space-y-3">
              {/* Clear all button */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="text-xs text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50"
                >
                  {clearing ? (
                    <RefreshCw className="h-3 w-3 ml-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3 ml-1" />
                  )}
                  נקה הכל
                </Button>
              </div>

              {/* Ignored times list */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {ignoredTimes.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-orange-200/50 dark:border-orange-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{formatDate(item.appointment_date)}</span>
                      <span className="text-xs text-muted-foreground">
                        ({item.ignored_times.length} שעות)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleClearOne(item.id, item.appointment_date)}
                      className="h-7 w-7 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Info text */}
              <p className="text-xs text-muted-foreground text-center pt-2">
                שעות אלו לא יכללו בהתראות עתידיות. הסר אותן כדי לקבל שוב עדכונים.
              </p>
            </div>
          </div>
      )}
    </div>
  )
}

