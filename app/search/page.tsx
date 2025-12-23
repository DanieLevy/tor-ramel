"use client"

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Search, CheckCircle2, X, Zap, Clock, ExternalLink, CalendarDays, Sparkles, TrendingUp, AlertCircle, StopCircle, List, Grid } from 'lucide-react'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import axios, { CancelTokenSource } from 'axios'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { he } from 'date-fns/locale'

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
  const [viewType, setViewType] = useState<'list' | 'calendar'>('list')
  const [searchStats, setSearchStats] = useState({
    totalDays: 0,
    checkedDays: 0,
    openDays: 0,
    closedDays: 0
  })
  const [searchError, setSearchError] = useState<string | null>(null)
  const cancelTokenRef = useRef<CancelTokenSource | null>(null)

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
      } catch {
        localStorage.removeItem('tor-ramel-search-cache')
      }
    }
  }, [])

  const formatDateForAPI = (date: Date) => {
    try {
      // Ensure we have a valid date object
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        console.error('Invalid date provided to formatDateForAPI:', date)
        return null
      }
      
      // Get year, month, day directly from the date object
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      
      return `${year}-${month}-${day}`
    } catch (error) {
      console.error('Error formatting date:', error, date)
      return null
    }
  }

  const getDayNameHebrew = (dateStr: string) => {
    try {
    // Parse date properly in Israeli timezone
    const [year, monthNum, day] = dateStr.split('-').map(Number)
    const date = new Date(year, monthNum - 1, day)
      
      if (isNaN(date.getTime())) {
        return { dayName: 'שגיאה', dayNumber: 0, month: '' }
      }
    
    const dayName = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      weekday: 'long'
    }).format(date)
    
    const dayNumber = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: 'numeric'
    }).format(date)
    
    const monthName = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      month: 'long'
    }).format(date)
    
    return { dayName, dayNumber: parseInt(dayNumber), month: monthName }
    } catch (error) {
      console.error('Error getting Hebrew day name:', error, dateStr)
      return { dayName: 'שגיאה', dayNumber: 0, month: '' }
    }
  }

  const isClosedDay = useCallback((date: Date) => {
    // Get day of week in Israeli timezone
    const israeliDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }))
    const dayOfWeek = israeliDate.getDay()
    return dayOfWeek === 1 || dayOfWeek === 6 // Monday (1) or Saturday (6)
  }, [])

  // Helper function to create dates in Israeli timezone
  const createIsraeliDate = useCallback((daysFromToday: number) => {
    try {
    const now = new Date()
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() + daysFromToday)
      targetDate.setHours(0, 0, 0, 0)
      return targetDate
    } catch (error) {
      console.error('Error creating Israeli date:', error)
      return new Date() // Return current date as fallback
    }
  }, [])

  const getOpenDays = useCallback((type: string): Date[] => {
    const dates: Date[] = []
    const totalDays = type === 'week' ? 7 : type === 'two-weeks' ? 14 : 30
    let closedDaysCount = 0
    let daysChecked = 0

    while (dates.length < totalDays && daysChecked < totalDays * 2) {
      const date = createIsraeliDate(daysChecked)
      
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
  }, [createIsraeliDate, isClosedDay])

  const cancelSearch = useCallback(() => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Search cancelled by user')
      cancelTokenRef.current = null
    }
    setIsSearching(false)
    setProgress(0)
    setSearchError(null)
    toast.info('החיפוש בוטל')
  }, [])

  const handleSearch = useCallback(async (forceRefresh = false) => {
    // Reset error state
    setSearchError(null)
    
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

    // Cancel any existing search
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel()
    }

    // Create new cancel token
    const source = axios.CancelToken.source()
    cancelTokenRef.current = source

    // Haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
    
    setIsSearching(true)
    setIsUsingCache(false)
    setProgress(0)
    
    try {
    const dates = getOpenDays(searchType)
      
      // Validate and format dates
      const validDates = dates.map(date => formatDateForAPI(date)).filter(date => date !== null)
      
      if (validDates.length === 0) {
        throw new Error('לא ניתן לעבד את התאריכים המבוקשים')
      }
    
    // Initialize results with loading states
      const initialResults = validDates.map(dateStr => {
        const dayInfo = getDayNameHebrew(dateStr!)
      return {
          date: dateStr!,
        available: false,
        times: [],
        dayName: dayInfo.dayName,
        loading: true
      }
    })
    setResults(initialResults)

      // Use the batch endpoint for all dates at once
      const response = await axios.post('/api/check-appointment/batch', {
        dates: validDates
      }, {
        timeout: 30000, // 30 seconds for batch
        cancelToken: source.token,
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
    } catch (error: any) {
      console.error('Search error:', error)
      
      if (axios.isCancel(error)) {
        // Search was cancelled by user
        return
      }
      
      const errorMessage = error.response?.data?.error || error.message || 'שגיאה בחיפוש'
      setSearchError(errorMessage)
      toast.error(errorMessage)
      
      // Reset all results to error state
      setResults(prev => prev.map(r => ({
        ...r,
        loading: false,
        error: 'שגיאה בבדיקה'
      })))
    } finally {
      setIsSearching(false)
      setProgress(100)
      cancelTokenRef.current = null
      
      // Reset progress after a short delay
      setTimeout(() => {
        if (!isSearching) {
          setProgress(0)
        }
      }, 1000)
    }
  }, [searchType, cache, getOpenDays, isSearching])

  const generateBookingUrl = (dateStr: string) => {
    return `https://mytor.co.il/home.php?i=cmFtZWwzMw==&s=MjY1&mm=y&lang=he&datef=${dateStr}&signup=הצג`
  }

  // Calendar helper functions
  const getResultForDate = (date: Date) => {
    const dateStr = formatDateForAPI(date)
    if (!dateStr) return null
    return results.find(r => r.date === dateStr)
  }

  const getCalendarDayModifiers = () => {
    const available: Date[] = []
    const unavailable: Date[] = []
    const closed: Date[] = []
    
    // Generate all dates for the search period
    const totalDays = searchType === 'week' ? 7 : searchType === 'two-weeks' ? 14 : 30
    
    for (let i = 0; i < totalDays * 2; i++) { // Check more days to account for closed ones
      const date = createIsraeliDate(i)
      
      if (isClosedDay(date)) {
        closed.push(new Date(date))
      } else {
        const result = getResultForDate(date)
        if (result) {
          if (result.available) {
            available.push(new Date(date))
          } else {
            unavailable.push(new Date(date))
          }
        }
      }
    }
    
    return { available, unavailable, closed }
  }

  const getDayTooltipContent = (date: Date) => {
    const result = getResultForDate(date)
    const isClosed = isClosedDay(date)
    const dateStr = formatDateForAPI(date)
    
    if (!dateStr) {
      return 'תאריך לא תקין'
    }
    
    const dayInfo = getDayNameHebrew(dateStr)
    
    if (isClosed) {
      return `${dayInfo.dayName} - יום סגור`
    }
    
    if (!result) {
      return `${dayInfo.dayName} - טרם נבדק`
    }
    
    if (result.available) {
      return `${dayInfo.dayName} - ${result.times.length} תורים זמינים`
    }
    
    return `${dayInfo.dayName} - אין תורים זמינים`
  }

  const availableResults = results.filter(r => r.available)
  const unavailableResults = results.filter(r => !r.available && !r.loading)
  const loadingResults = results.filter(r => r.loading)

  return (
    <div className="container max-w-md mx-auto p-4 pb-20 page-content-bottom-spacing">
      {/* Header with animation */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
          <Search className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-foreground">
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
                  { value: 'week', label: 'שבוע', icon: '7', bg: 'bg-blue-500' },
                  { value: 'two-weeks', label: 'שבועיים', icon: '14', bg: 'bg-indigo-500' },
                  { value: 'month', label: 'חודש', icon: '30', bg: 'bg-green-500' }
                ].map((option) => (
                  <motion.button
                    key={option.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSearchType(option.value as any)}
                    className={cn(
                      "relative py-3 px-3 rounded-xl text-sm font-medium transition-all overflow-hidden",
                      searchType === option.value
                        ? `text-white shadow-lg ${option.bg}`
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <span className="relative">
                      {option.label}
                      <span className="block text-xs mt-0.5 opacity-80">
                        {option.icon} ימים
                      </span>
                    </span>
                  </motion.button>
                ))}
              </div>

              <div className="space-y-3">
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

                {/* Cancel button */}
                {isSearching && (
                  <Button
                    onClick={cancelSearch}
                    variant="outline"
                    className="w-full h-10 text-base border-red-300 hover:bg-red-50 hover:border-red-400 dark:border-red-700 dark:hover:bg-red-950/50"
                    size="lg"
                  >
                    <StopCircle className="ml-2 h-4 w-4" />
                    עצור חיפוש
                  </Button>
                )}

                {/* View Toggle */}
                {results.length > 0 && !isSearching && (
                  <div className="grid grid-cols-2 gap-2 p-2 bg-muted/30 rounded-xl border shadow-sm">
                    {[
                      { value: 'list', label: 'רשימה', icon: List, bg: 'bg-blue-500' },
                      { value: 'calendar', label: 'לוח שנה', icon: Grid, bg: 'bg-indigo-500' }
                    ].map((option) => (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setViewType(option.value as any)}
                        className={cn(
                          "py-2.5 px-3 rounded-lg text-sm font-medium transition-all border",
                          viewType === option.value
                            ? `text-white shadow-lg border-transparent ${option.bg}`
                            : "bg-background/50 hover:bg-background border-border/50 text-foreground hover:shadow-sm"
                        )}
                      >
                        <span className="flex items-center justify-center gap-1.5">
                          <option.icon className="h-4 w-4" />
                          {option.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

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

              {/* Error state */}
              {searchError && !isSearching && (
                <Alert variant="destructive" className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {searchError}
                  </AlertDescription>
                </Alert>
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
            {/* Calendar View */}
            {viewType === 'calendar' && (
              <TooltipProvider>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <Card className="border-2 shadow-lg">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="text-center">
                          <h3 className="text-lg font-semibold mb-4 text-foreground">
                            לוח שנה - מצב תורים
                          </h3>
                          <div className="flex items-center justify-center gap-6 mb-4">
                            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm animate-pulse"></div>
                              <span className="text-sm font-medium text-green-700 dark:text-green-300">זמין</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                              <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm"></div>
                              <span className="text-sm font-medium text-red-700 dark:text-red-300">תפוס</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-950/30 rounded-lg border border-gray-200 dark:border-gray-800">
                              <div className="w-3 h-3 bg-gray-400 rounded-full shadow-sm"></div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">סגור</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-center">
                          <CalendarComponent
                            mode="single"
                            locale={he}
                            className="rounded-md border"
                            classNames={{
                              day: cn(
                                "relative h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                                "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                              )
                            }}
                            modifiers={getCalendarDayModifiers()}
                            modifiersClassNames={{
                              available: "!bg-green-100 !text-green-900 !border-2 !border-green-400 dark:!bg-green-900/40 dark:!text-green-100 dark:!border-green-600",
                              unavailable: "!bg-red-100 !text-red-900 !border-2 !border-red-400 dark:!bg-red-900/40 dark:!text-red-100 dark:!border-red-600",
                              closed: "!bg-gray-100 !text-gray-500 !opacity-50 dark:!bg-gray-800/40 dark:!text-gray-400"
                            }}
                            components={{
                              DayButton: ({ day, modifiers, ...props }) => {
                                const result = getResultForDate(day.date)
                                const isClosed = isClosedDay(day.date)
                                const tooltipContent = getDayTooltipContent(day.date)
                                const dayNumber = day.date.getDate()
                                
                                let indicator = null
                                if (isClosed) {
                                  indicator = <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-gray-400 rounded-full" />
                                } else if (result) {
                                  if (result.available) {
                                    indicator = <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                  } else {
                                    indicator = <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                                  }
                                }
                                
                                return (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                          "relative h-9 w-9 p-0 font-normal",
                                          modifiers.available && "!bg-green-100 !text-green-900 !border-2 !border-green-400 dark:!bg-green-900/40 dark:!text-green-100 dark:!border-green-600",
                                          modifiers.unavailable && "!bg-red-100 !text-red-900 !border-2 !border-red-400 dark:!bg-red-900/40 dark:!text-red-100 dark:!border-red-600",
                                          modifiers.closed && "!bg-gray-100 !text-gray-500 !opacity-50 dark:!bg-gray-800/40 dark:!text-gray-400"
                                        )}
                                        onClick={() => {
                                          if (result && result.available) {
                                            window.open(generateBookingUrl(result.date), '_blank')
                                          }
                                        }}
                                        {...props}
                                      >
                                        {dayNumber}
                                        {indicator}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{tooltipContent}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )
                              }
                            }}
                          />
                        </div>
                        
                        {availableResults.length > 0 && (
                          <div className="text-center text-sm text-muted-foreground">
                            לחץ על יום זמין כדי להזמין תור
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TooltipProvider>
            )}

            {/* List View (existing) */}
            {viewType === 'list' && (
              <div className="space-y-4"
          >
            {/* Cache indicator */}
            {isUsingCache && !isSearching && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 shadow-sm">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-amber-800 dark:text-amber-200">תוצאות מהירות</div>
                    <div className="text-xs text-amber-600 dark:text-amber-400">נטענו מהזיכרון המקומי</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs px-3 bg-white/50 dark:bg-gray-800/50 border-amber-300 dark:border-amber-700 hover:bg-white dark:hover:bg-gray-800 shadow-sm"
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
                        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40 hover:shadow-md transition-all">
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
                className="space-y-4"
              >
                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500">
                        <Clock className="h-4 w-4 text-white animate-spin" />
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-blue-800 dark:text-blue-200">בודק תאריכים</div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">סורק {loadingResults.length} תאריכים נוספים...</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {loadingResults.slice(0, 3).map((result, index) => (
                        <motion.div
                          key={result.date}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Skeleton 
                            className="h-16 w-full rounded-xl bg-blue-100 dark:bg-blue-900/40"
                            style={{ 
                              animationDelay: `${index * 100}ms`,
                            }}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Unavailable Days - Enhanced compact view */}
            {unavailableResults.length > 0 && !loadingResults.length && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500">
                          <X className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                          ללא תורים פנויים
                        </span>
                      </div>
                      <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300">
                        {unavailableResults.length} תאריכים
                      </Badge>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {unavailableResults.map((result, index) => {
                        const dateInfo = getDayNameHebrew(result.date)
                        return (
                          <motion.div
                            key={result.date}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.01 }}
                            className={cn(
                              "p-2.5 rounded-lg text-center transition-all hover:scale-105 border shadow-sm",
                              result.error 
                                ? "bg-red-100/70 dark:bg-red-950/30 border-red-300 dark:border-red-700" 
                                : "bg-white/70 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700"
                            )}
                          >
                            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {dateInfo.dayNumber}
                            </div>
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
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* No results message */}
            {!isSearching && !loadingResults.length && availableResults.length === 0 && unavailableResults.length > 0 && (
              <Alert className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-700 dark:text-orange-300">
                  לא נמצאו תורים פנויים בתאריכים שנבדקו. 
                  נסה לחפש בטווח תאריכים אחר או הירשם להתראות.
                </AlertDescription>
              </Alert>
            )}
            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SearchPage 