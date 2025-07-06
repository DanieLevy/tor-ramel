"use client"

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/components/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Loader2, Search, CheckCircle2, X, Zap } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import axios from 'axios'
import { cn } from '@/lib/utils'

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
  const { user } = useAuth()
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<AppointmentResult[]>([])
  const [searchType, setSearchType] = useState<'week' | 'two-weeks' | 'month'>('week')
  const [cache, setCache] = useState<SearchCache | null>(null)
  const [isUsingCache, setIsUsingCache] = useState(false)

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
    const shortDay = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      weekday: 'short'
    }).format(date)
    
    const dayNumber = date.getDate()
    const month = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      month: 'short'
    }).format(date)
    
    return { shortDay, dayNumber, month }
  }

  const isOpenDay = (date: Date) => {
    const dayOfWeek = date.getDay()
    return dayOfWeek !== 1 && dayOfWeek !== 6 // Not Monday (1) or Saturday (6)
  }

  const getSearchDates = (type: string): Date[] => {
    const dates: Date[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const daysToCheck = type === 'week' ? 7 : type === 'two-weeks' ? 14 : 30

    for (let i = 0; i < daysToCheck; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      if (isOpenDay(date)) {
        dates.push(date)
      }
    }

    return dates
  }

  const checkDatesInBatch = async (dates: Date[]): Promise<AppointmentResult[]> => {
    const dateStrings = dates.map(date => formatDateForAPI(date))

    try {
      const response = await axios.post('/api/check-appointment/batch', {
        dates: dateStrings
      }, {
        timeout: 15000
      })

      return response.data.results.map((result: any) => ({
        ...result,
        loading: false
      }))
    } catch (error) {
      console.error('Error checking dates:', error)
      // Return error results for all dates
      return dateStrings.map(dateStr => ({
        date: dateStr,
        available: false,
        times: [],
        error: 'שגיאה',
        loading: false
      }))
    }
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
    const dates = getSearchDates(searchType)
    
    // Initialize results with loading states
    const initialResults = dates.map(date => ({
      date: formatDateForAPI(date),
      available: false,
      times: [],
      loading: true
    }))
    setResults(initialResults)

    try {
      // Check all dates in a single batch request
      const results = await checkDatesInBatch(dates)
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
        toast.success(`נמצאו ${availableCount} תאריכים זמינים`)
      } else {
        toast.info('לא נמצאו תורים פנויים')
      }
    } catch (error) {
      toast.error('שגיאה בחיפוש')
    } finally {
      setIsSearching(false)
    }
  }, [searchType, cache])

  const generateBookingUrl = (dateStr: string) => {
    return `https://mytor.co.il/home.php?i=cmFtZWwzMw==&s=MjY1&mm=y&lang=he&datef=${dateStr}&signup=הצג`
  }

  const availableResults = results.filter(r => r.available)
  const unavailableResults = results.filter(r => !r.available && !r.loading)

  return (
    <div className="container max-w-md mx-auto p-4 pb-20">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">חיפוש מהיר</h1>
        <p className="text-sm text-muted-foreground">
          בדיקת {searchType === 'week' ? '7' : searchType === 'two-weeks' ? '14' : '30'} ימים בלחיצה אחת
        </p>
      </div>

      {/* Search Controls */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'week', label: 'שבוע' },
            { value: 'two-weeks', label: 'שבועיים' },
            { value: 'month', label: 'חודש' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setSearchType(option.value as any)}
              className={cn(
                "py-2 px-3 rounded-lg text-sm font-medium transition-all",
                searchType === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <Button
          onClick={() => handleSearch()}
          disabled={isSearching}
          className="w-full"
          size="lg"
        >
          {isSearching ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              מחפש...
            </>
          ) : (
            <>
              <Search className="ml-2 h-4 w-4" />
              חיפוש מהיר
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Cache indicator and refresh */}
          {isUsingCache && !isSearching && (
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                תוצאות מהזיכרון המקומי
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs px-2"
                onClick={() => handleSearch(true)}
              >
                רענן
              </Button>
            </div>
          )}

          {/* Available Appointments */}
          {availableResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-green-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                תאריכים זמינים ({availableResults.length})
              </h3>
              <div className="space-y-2">
                {availableResults.map((result) => {
                  const dateInfo = getDayNameHebrew(result.date)
                  return (
                    <Card key={result.date} className="border-green-500/50 bg-green-50/30 dark:bg-green-950/20">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <div className="text-2xl font-bold">{dateInfo.dayNumber}</div>
                              <div className="text-xs text-muted-foreground">{dateInfo.month}</div>
                            </div>
                            <div>
                              <div className="font-medium">{dateInfo.shortDay}</div>
                              <div className="text-xs text-green-600">
                                {result.times.length} תורים
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="h-8"
                            asChild
                          >
                            <a
                              href={generateBookingUrl(result.date)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              הזמן
                            </a>
                          </Button>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {result.times.slice(0, 4).map((time) => (
                            <span
                              key={time}
                              className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded"
                            >
                              {time}
                            </span>
                          ))}
                          {result.times.length > 4 && (
                            <span className="text-xs px-2 py-0.5 text-muted-foreground">
                              +{result.times.length - 4}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Loading States */}
          {results.some(r => r.loading) && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">
                בודק תאריכים...
              </h3>
              {results.filter(r => r.loading).map((result, index) => (
                <Skeleton 
                  key={index} 
                  className="h-16 w-full animate-pulse"
                  style={{ animationDelay: `${index * 50}ms` }}
                />
              ))}
            </div>
          )}

          {/* Unavailable Days - Compact View */}
          {unavailableResults.length > 0 && !results.some(r => r.loading) && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <X className="h-3 w-3" />
                לא זמין ({unavailableResults.length})
              </h3>
              <div className="grid grid-cols-4 gap-1.5">
                {unavailableResults.map((result) => {
                  const dateInfo = getDayNameHebrew(result.date)
                  return (
                    <div
                      key={result.date}
                      className={cn(
                        "p-2 rounded-lg text-center",
                        result.error ? "bg-red-50/50 dark:bg-red-950/20" : "bg-muted/30"
                      )}
                    >
                      <div className="text-sm font-medium">{dateInfo.dayNumber}</div>
                      <div className="text-[10px] text-muted-foreground">{dateInfo.shortDay}</div>
                      {result.error && (
                        <div className="text-[10px] text-red-500 mt-0.5">!</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchPage 