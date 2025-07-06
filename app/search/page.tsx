"use client"

import { useState, useCallback } from 'react'
import { useAuth } from '@/components/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Loader2, Search, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import axios from 'axios'
import * as cheerio from 'cheerio'

interface AppointmentResult {
  date: string
  available: boolean
  times: string[]
  dayName?: string
  error?: string
}

function SearchPage() {
  const { user } = useAuth()
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<AppointmentResult[]>([])
  const [searchType, setSearchType] = useState<'closest' | 'week' | 'month'>('closest')

  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const getDayNameHebrew = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      weekday: 'long'
    }).format(date)
  }

  const isOpenDay = (date: Date) => {
    const dayOfWeek = date.getDay()
    return dayOfWeek !== 1 && dayOfWeek !== 6 // Not Monday (1) or Saturday (6)
  }

  const getSearchDates = (type: string): Date[] => {
    const dates: Date[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    switch (type) {
      case 'closest':
        // Check next 7 open days
        let daysAdded = 0
        let currentDate = new Date(today)
        while (daysAdded < 7) {
          if (isOpenDay(currentDate)) {
            dates.push(new Date(currentDate))
            daysAdded++
          }
          currentDate.setDate(currentDate.getDate() + 1)
        }
        break

      case 'week':
        // Check next 7 days from today
        for (let i = 0; i < 7; i++) {
          const date = new Date(today)
          date.setDate(today.getDate() + i)
          if (isOpenDay(date)) {
            dates.push(date)
          }
        }
        break

      case 'month':
        // Check next 30 days
        for (let i = 0; i < 30; i++) {
          const date = new Date(today)
          date.setDate(today.getDate() + i)
          if (isOpenDay(date)) {
            dates.push(date)
          }
        }
        break
    }

    return dates
  }

  const checkSingleDate = async (date: Date): Promise<AppointmentResult> => {
    const dateStr = formatDateForAPI(date)

    try {
      const response = await axios.get('/api/check-appointment', {
        params: { date: dateStr }
      })

      return {
        date: dateStr,
        available: response.data.available,
        times: response.data.times || [],
        dayName: getDayNameHebrew(dateStr)
      }
    } catch (error) {
      console.error(`Error checking ${dateStr}:`, error)
      return {
        date: dateStr,
        available: false,
        times: [],
        dayName: getDayNameHebrew(dateStr),
        error: 'שגיאה בבדיקה'
      }
    }
  }

  const handleSearch = useCallback(async () => {
    setIsSearching(true)
    setResults([])

    const dates = getSearchDates(searchType)
    toast.info(`מחפש תורים ב-${dates.length} תאריכים...`)

    try {
      // Check dates in batches of 3
      const allResults: AppointmentResult[] = []
      
      for (let i = 0; i < dates.length; i += 3) {
        const batch = dates.slice(i, i + 3)
        const batchPromises = batch.map(date => checkSingleDate(date))
        const batchResults = await Promise.all(batchPromises)
        
        allResults.push(...batchResults)
        setResults([...allResults]) // Update UI progressively
        
        // Small delay between batches
        if (i + 3 < dates.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      const availableCount = allResults.filter(r => r.available).length
      if (availableCount > 0) {
        toast.success(`נמצאו ${availableCount} תאריכים עם תורים פנויים!`)
      } else {
        toast.info('לא נמצאו תורים פנויים בתאריכים שנבדקו')
      }
    } catch (error) {
      toast.error('שגיאה בחיפוש תורים')
    } finally {
      setIsSearching(false)
    }
  }, [searchType])

  const generateBookingUrl = (dateStr: string) => {
    return `https://mytor.co.il/home.php?i=cmFtZWwzMw==&s=MjY1&mm=y&lang=he&datef=${dateStr}&signup=הצג`
  }

  return (
    <div className="container py-8 px-4">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">חיפוש תורים ידני</h1>
          <p className="text-muted-foreground">
            חפש תורים פנויים בתאריכים הקרובים
          </p>
        </div>

        {/* Search Controls */}
        <Card>
          <CardHeader>
            <CardTitle>בחר סוג חיפוש</CardTitle>
            <CardDescription>
              החיפוש יתבצע רק בימים פתוחים (לא שני ושבת)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={searchType} onValueChange={(v) => setSearchType(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="closest">הקרובים ביותר</TabsTrigger>
                <TabsTrigger value="week">השבוע הקרוב</TabsTrigger>
                <TabsTrigger value="month">החודש הקרוב</TabsTrigger>
              </TabsList>
              <TabsContent value="closest" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  מחפש ב-7 הימים הפתוחים הקרובים
                </p>
              </TabsContent>
              <TabsContent value="week" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  מחפש בכל הימים הפתוחים בשבוע הקרוב
                </p>
              </TabsContent>
              <TabsContent value="month" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  מחפש בכל הימים הפתוחים ב-30 הימים הקרובים
                </p>
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full mt-6"
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
                  חפש תורים
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">תוצאות חיפוש</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {results.map((result) => (
                <Card key={result.date} className={result.available ? 'border-green-500' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">
                          {result.dayName}, {new Date(result.date + 'T00:00:00').toLocaleDateString('he-IL')}
                        </span>
                      </div>
                      {result.available ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {result.error ? (
                      <Alert variant="destructive">
                        <AlertDescription>{result.error}</AlertDescription>
                      </Alert>
                    ) : result.available ? (
                      <div className="space-y-3">
                        <p className="text-sm text-green-600 font-medium">
                          {result.times.length} תורים זמינים
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {result.times.slice(0, 6).map((time) => (
                            <span
                              key={time}
                              className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm"
                            >
                              {time}
                            </span>
                          ))}
                          {result.times.length > 6 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                              +{result.times.length - 6} נוספים
                            </span>
                          )}
                        </div>
                        <Button
                          className="w-full"
                          variant="outline"
                          asChild
                        >
                          <a
                            href={generateBookingUrl(result.date)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            הזמן תור
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">אין תורים זמינים</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchPage 