import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'
import http from 'http'
import https from 'https'

// Response cache for the current request (avoids duplicate requests)
const responseCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minute cache

// Create optimized HTTP agents with better connection pooling
const httpAgent = new http.Agent({ 
  keepAlive: true, 
  maxSockets: 15,
  maxFreeSockets: 8,
  timeout: 2500,
  keepAliveMsecs: 3000
} as any)

const httpsAgent = new https.Agent({ 
  keepAlive: true, 
  maxSockets: 15,
  maxFreeSockets: 8,
  rejectUnauthorized: false,
  timeout: 2500,
  keepAliveMsecs: 3000
} as any)

// Create optimized axios instance
const axiosInstance = axios.create({
  httpAgent,
  httpsAgent,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'he-IL,he;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  },
  timeout: 2500,
  responseType: 'arraybuffer',
  maxRedirects: 2,
  decompress: true,
  validateStatus: (status) => status < 500
})

// Single date check function with caching and retries
async function checkSingleDate(dateStr: string, retryCount = 0): Promise<any> {
  const maxRetries = 2
  
  // Check cache first
  const cacheKey = `date_${dateStr}`
  const cached = responseCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data
  }
  
  try {
    const userId = process.env.USER_ID || '4481'
    const codeAuth = process.env.CODE_AUTH || 'Sa1W2GjL'
    
    const params = {
      i: 'cmFtZWwzMw==', // ramel33
      s: 'MjY1',         // 265
      mm: 'y',
      lang: 'he',
      datef: dateStr
    }

    const url = 'https://mytor.co.il/home.php'

    const response = await axiosInstance.get(url, {
      params,
      headers: {
        'Cookie': `userID=${userId}; codeAuth=${codeAuth}`,
        'Referer': 'https://mytor.co.il'
      }
    })

    // Parse HTML
    const $ = cheerio.load(response.data)
    
    // Check for no appointments message
    const dangerElem = $('h4.tx-danger').first()
    if (dangerElem.length > 0) {
      const dangerText = dangerElem.text()
      if (dangerText.includes('לא נשארו תורים פנויים') || dangerText.includes('אין תורים זמינים')) {
        const result = { date: dateStr, available: false, times: [] }
        responseCache.set(cacheKey, { data: result, timestamp: Date.now() })
        return result
      }
    }

    // Extract available times
    const availableTimes: string[] = []
    $('button.btn.btn-outline-dark.btn-block').each((i, elem) => {
      const timeText = $(elem).text().trim()
      if (/^\d{1,2}:\d{2}$/.test(timeText)) {
        availableTimes.push(timeText)
      }
    })

    const result = {
      date: dateStr,
      available: availableTimes.length > 0,
      times: availableTimes.sort()
    }
    
    // Cache successful results
    responseCache.set(cacheKey, { data: result, timestamp: Date.now() })
    
    return result
    
  } catch (error: any) {
    const isRetryable = error.response?.status === 500 || 
                       error.response?.status === 503 ||
                       error.code === 'ECONNRESET' || 
                       error.code === 'ETIMEDOUT'
    
    // Retry logic with exponential backoff
    if (isRetryable && retryCount < maxRetries) {
      const backoffTime = Math.min(200 * Math.pow(2, retryCount), 800)
      await new Promise(resolve => setTimeout(resolve, backoffTime))
      return checkSingleDate(dateStr, retryCount + 1)
    }
    
    return { 
      date: dateStr, 
      available: false, 
      times: [], 
      error: true
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { dates } = await request.json()

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'Dates array is required' }, { status: 400 })
    }

    // Limit to prevent abuse
    if (dates.length > 30) {
      return NextResponse.json({ error: 'Maximum 30 dates allowed' }, { status: 400 })
    }

    // Process dates with staggered start to avoid server errors
    const results: any[] = []
    const batchSize = 6 // Optimal batch size based on auto-check.mjs experience
    
    for (let i = 0; i < dates.length; i += batchSize) {
      const batch = dates.slice(i, i + batchSize)
      
      // Process batch with staggered start (100ms delay between requests)
      const batchPromises = batch.map((date, index) => {
        const delay = index * 100
        return new Promise<void>(resolve => setTimeout(resolve, delay))
          .then(() => checkSingleDate(date))
      })
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            date: batch[idx],
            available: false,
            times: [],
            error: true
          })
        }
      })
      
      // Small delay between batches if not the last batch
      if (i + batchSize < dates.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    return NextResponse.json({ results })

  } catch (error) {
    console.error('Error in batch check:', error)
    return NextResponse.json({ 
      error: 'Failed to check appointments',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 