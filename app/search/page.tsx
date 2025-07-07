"use client"

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Loader2, Search, CheckCircle2, X, Zap, Clock, ExternalLink, CalendarDays, Sparkles, TrendingUp, AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import axios from 'axios'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/auth-provider'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AppointmentResult {
  date: string
  available: boolean
  times: string[]
  dayName?: string
  error?: string
  loading?: boolean
}

interface SearchCache {
  results: AppointmentResult[]
  timestamp: number
  searchType: string
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function SearchPage() {
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<AppointmentResult[]>([])
  const [searchType, setSearchType] = useState<'week' | 'two-weeks' | 'month'>('week')
  const [cache, setCache] = useState<SearchCache | null>(null)
  const [isUsingCache, setIsUsingCache] = useState(false)
  const [progress, setProgress] = useState(0)
  const [searchStats, setSearchStats] = useState({
    totalDays: 0,
    checkedDays: 0,
    openDays: 0,
    closedDays: 0
  })

  // Load cache from localStorage on mount
  useEffect(() => {
    const savedCache = localStorage.getItem('tor-ramel-search-cache')
    if (savedCache) {
      try {
        const parsed = JSON.parse(savedCache) as SearchCache
        const age = Date.now() - parsed.timestamp
        if (age < CACHE_DURATION) {
          setCache(parsed)
        } else {
          localStorage.removeItem('tor-ramel-search-cache')
        }
      } catch (e) {
        localStorage.removeItem('tor-ramel-search-cache')
      }
    }
  }, [])

  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const getDayNameHebrew = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const dayName = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      weekday: 'long'
    }).format(date)
    
    const dayNumber = date.getDate()
    const month = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      month: 'long'
    }).format(date)
    
    return { dayName, dayNumber, month }
  }

  const isClosedDay = (date: Date) => {
    const dayOfWeek = date.getDay()
    return dayOfWeek === 1 || dayOfWeek === 6 // Monday (1) or Saturday (6)
  }

  const getOpenDays = (type: string): Date[] => {
    const dates: Date[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const totalDays = type === 'week' ? 7 : type === 'two-weeks' ? 14 : 30
    let closedDaysCount = 0
    let daysChecked = 0

    while (dates.length < totalDays && daysChecked < totalDays * 2) {
      const date = new Date(today)
      date.setDate(today.getDate() + daysChecked)
      
      if (!isClosedDay(date)) {
        dates.push(new Date(date))
      } else {
        closedDaysCount++
      }
      daysChecked++
    }

    // Update stats
    setSearchStats({
      totalDays,
      checkedDays: 0,
      openDays: dates.length,
      closedDays: closedDaysCount
    })

    return dates
  }

  const handleSearch = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh && cache && cache.searchType === searchType) {
      const age = Date.now() - cache.timestamp
      if (age < CACHE_DURATION) {
        setResults(cache.results)
        setIsUsingCache(true)
        toast.success('תוצאות מהירות מהזיכרון', {
          icon: <Zap className="h-4 w-4" />,
          duration: 2000
        })
        return
      }
    }

    // Haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
    
    setIsSearching(true)
    setIsUsingCache(false)
    setProgress(0)
    const dates = getOpenDays(searchType)
    
    // Initialize results with loading states
    const initialResults = dates.map(date => {
      const dayInfo = getDayNameHebrew(formatDateForAPI(date))
      return {
        date: formatDateForAPI(date),
        available: false,
        times: [],
        dayName: dayInfo.dayName,
        loading: true
      }
    })
    setResults(initialResults)

    try {
      // Use the batch endpoint for all dates at once
      const dateStrings = dates.map(date => formatDateForAPI(date))
      
      const response = await axios.post('/api/check-appointment/batch', {
        dates: dateStrings
      }, {
        timeout: 30000, // 30 seconds for batch
        onDownloadProgress: (progressEvent) => {
          // Update progress based on response download
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setProgress(percentCompleted * 0.9) // Reserve 10% for processing
          }
        }
      })

      // Process results
      const results: AppointmentResult[] = response.data.results.map((result: any, index: number) => {
        const dayInfo = getDayNameHebrew(result.date)
        
        // Update progress for each processed result
        setProgress(90 + (10 * (index + 1) / response.data.results.length))
        setSearchStats(prev => ({ ...prev, checkedDays: index + 1 }))
        
        return {
          ...result,
          dayName: dayInfo.dayName,
          loading: false
        }
      })
      
      setResults(results)
      
      // Save to cache
      const newCache: SearchCache = {
        results,
        timestamp: Date.now(),
        searchType
      }
      setCache(newCache)
      localStorage.setItem('tor-ramel-search-cache', JSON.stringify(newCache))
      
      const availableCount = results.filter(r => r.available).length
      if (availableCount > 0) {
        toast.success(`נמצאו ${availableCount} תאריכים זמינים! 🎉`)
      } else {
        toast.info('לא נמצאו תורים פנויים כרגע')
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('שגיאה בחיפוש')
      
      // Reset all results to error state
      setResults(prev => prev.map(r => ({
        ...r,
        loading: false,
        error: 'שגיאה בבדיקה'
      })))
    } finally {
      setIsSearching(false)
      setProgress(100)
    }
  }, [searchType, cache])

  const generateBookingUrl = (dateStr: string) => {
    return `https://mytor.co.il/home.php?i=cmFtZWwzMw==&s=MjY1&mm=y&lang=he&datef=${dateStr}&signup=הצג`
  }

  const availableResults = results.filter(r => r.available)
  const unavailableResults = results.filter(r => !r.available && !r.loading)
  const loadingResults = results.filter(r => r.loading)

  return (
    <div className="container max-w-md mx-auto p-4 pb-20">
      {/* Header with animation */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
          <Search className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          חיפוש חכם
        </h1>
        <p className="text-sm text-muted-foreground">
          סריקה מהירה של תורים פנויים
        </p>
      </motion.div>

      {/* Search Controls with better design */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4 mb-6"
      >
        <Card className="border-2 shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  בחר טווח סריקה
                </span>
                <Badge variant="secondary" className="text-xs">
                  {searchStats.openDays} ימים פתוחים
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'week', label: 'שבוע', icon: '7', color: 'from-blue-500 to-blue-600' },
                  { value: 'two-weeks', label: 'שבועיים', icon: '14', color: 'from-purple-500 to-purple-600' },
                  { value: 'month', label: 'חודש', icon: '30', color: 'from-green-500 to-green-600' }
                ].map((option) => (
                  <motion.button
                    key={option.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSearchType(option.value as any)}
                    className={cn(
                      "relative py-3 px-3 rounded-xl text-sm font-medium transition-all overflow-hidden",
                      searchType === option.value
                        ? "text-white shadow-lg"
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    {searchType === option.value && (
                      <motion.div 
                        layoutId="activeTab"
                        className={`absolute inset-0 bg-gradient-to-r ${option.color}`}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative">
                      {option.label}
                      <span className="block text-xs mt-0.5 opacity-80">
                        {option.icon} ימים
                      </span>
                    </span>
                  </motion.button>
                ))}
              </div>

              <Button
                onClick={() => handleSearch()}
                disabled={isSearching}
                className="w-full h-12 text-base shadow-lg"
                size="lg"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    סורק תורים...
                  </>
                ) : (
                  <>
                    <Sparkles className="ml-2 h-5 w-5" />
                    התחל סריקה
                  </>
                )}
              </Button>

              {/* Progress indicator */}
              {isSearching && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>נבדקו {searchStats.checkedDays} מתוך {searchStats.openDays}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results with better animations */}
      <AnimatePresence mode="wait">
        {results.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Cache indicator */}
            {isUsingCache && !isSearching && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between text-xs bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3"
              >
                <span className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                  <Zap className="h-3 w-3" />
                  תוצאות מהירות מהזיכרון
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs px-2"
                  onClick={() => handleSearch(true)}
                >
                  רענן
                </Button>
              </motion.div>
            )}

            {/* Available Appointments with enhanced design */}
            {availableResults.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    תורים זמינים
                  </h3>
                  <Badge variant="default" className="bg-green-600">
                    {availableResults.length} תאריכים
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {availableResults.map((result, index) => {
                    const dateInfo = getDayNameHebrew(result.date)
                    return (
                      <motion.div
                        key={result.date}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="border-green-500/50 bg-gradient-to-r from-green-50 to-green-50/50 dark:from-green-950/20 dark:to-green-950/10 hover:shadow-md transition-all">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-4">
                                <div className="text-center">
                                  <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                                    {dateInfo.dayNumber}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{dateInfo.month}</div>
                                </div>
                                <div>
                                  <div className="font-semibold text-lg">{dateInfo.dayName}</div>
                                  <div className="flex items-center gap-2 text-sm text-green-600">
                                    <TrendingUp className="h-3 w-3" />
                                    {result.times.length} תורים פנויים
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="h-9 shadow-sm"
                                asChild
                              >
                                <a
                                  href={generateBookingUrl(result.date)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  הזמן
                                  <ExternalLink className="mr-1 h-3 w-3" />
                                </a>
                              </Button>
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                              {result.times.slice(0, 5).map((time) => (
                                <Badge
                                  key={time}
                                  variant="secondary"
                                  className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                                >
                                  {time}
                                </Badge>
                              ))}
                              {result.times.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{result.times.length - 5}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Loading States with better animation */}
            {loadingResults.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3 w-3 animate-spin" />
                  בודק תאריכים...
                </h3>
                {loadingResults.slice(0, 3).map((result, index) => (
                  <Skeleton 
                    key={result.date} 
                    className="h-20 w-full"
                    style={{ 
                      animationDelay: `${index * 100}ms`,
                      opacity: 1 - (index * 0.2)
                    }}
                  />
                ))}
              </motion.div>
            )}

            {/* Unavailable Days - Enhanced compact view */}
            {unavailableResults.length > 0 && !loadingResults.length && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
              >
                <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <X className="h-3 w-3" />
                  ללא תורים פנויים ({unavailableResults.length})
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {unavailableResults.map((result, index) => {
                    const dateInfo = getDayNameHebrew(result.date)
                    return (
                      <motion.div
                        key={result.date}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.01 }}
                        className={cn(
                          "p-3 rounded-lg text-center transition-all hover:scale-105",
                          result.error 
                            ? "bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800" 
                            : "bg-muted/30"
                        )}
                      >
                        <div className="text-lg font-semibold">{dateInfo.dayNumber}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {dateInfo.dayName.slice(0, 3)}
                        </div>
                        {result.error && (
                          <AlertCircle className="h-3 w-3 text-red-500 mx-auto mt-1" />
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* No results message */}
            {!isSearching && !loadingResults.length && availableResults.length === 0 && unavailableResults.length > 0 && (
              <Alert className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-700 dark:text-orange-300">
                  לא נמצאו תורים פנויים בתאריכים שנבדקו. 
                  נסה לחפש בטווח תאריכים אחר או הירשם להתראות.
                </AlertDescription>
              </Alert>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SearchPage 