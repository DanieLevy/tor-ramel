import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'
import http from 'http'
import https from 'https'

// Performance tracking
const performanceStats = {
  requestTimes: [],
  retries: 0,
  errors: 0
}

// Create optimized HTTP agents with better connection pooling
const httpAgent = new http.Agent({ 
  keepAlive: true, 
  maxSockets: 15, // Increased for better parallelism
  maxFreeSockets: 8,
  timeout: 2500, // Faster timeout for quicker retries
  keepAliveMsecs: 3000,
  scheduling: 'lifo' // Last-in-first-out for better connection reuse
} as any)

const httpsAgent = new https.Agent({ 
  keepAlive: true, 
  maxSockets: 15,
  maxFreeSockets: 8,
  rejectUnauthorized: false,
  timeout: 2500,
  keepAliveMsecs: 3000,
  scheduling: 'lifo'
} as any)

// Create optimized axios instance
const axiosInstance = axios.create({
  httpAgent,
  httpsAgent,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'he-IL,he;q=0.9',
    'Accept-Encoding': 'gzip, deflate', // Removed 'br' for better compatibility
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  },
  timeout: 2500, // Further reduced for faster failures
  responseType: 'arraybuffer',
  maxRedirects: 2, // Reduced from 3
  decompress: true,
  validateStatus: (status) => status < 500
})

// Add request/response interceptors for debugging
axiosInstance.interceptors.response.use(
  response => {
    // Track response time for adaptive batching
    const responseTime = parseInt(response.headers['x-response-time'] || '0')
    if (responseTime > 0) {
      performanceStats.requestTimes.push(responseTime)
    }
    return response
  },
  error => {
    performanceStats.errors++
    if (error.response) {
      console.error(`🚨 Server error for ${error.config?.params?.datef}: ${error.response.status} ${error.response.statusText}`)
      
      if (error.response.status === 500 && error.response.data) {
        try {
          const errorText = error.response.data.toString('utf-8')
          if (errorText.length < 500) {
            console.error(`   Server message: ${errorText.substring(0, 200)}...`)
          }
        } catch (e) {
          // Ignore decoding errors
        }
      }
    } else if (error.request) {
      console.error(`🚨 No response received for ${error.config?.params?.datef}: ${error.message}`)
    } else {
      console.error(`🚨 Request setup error: ${error.message}`)
    }
    return Promise.reject(error)
  }
)

// Single date check function with retry logic - exact copy from auto-check
async function checkSingleDate(dateStr: string, retryCount = 0): Promise<any> {
  const maxRetries = 2 // Increased to handle more 500 errors
  
  console.log(`🔍 Checking ${dateStr}${retryCount > 0 ? ` (retry ${retryCount})` : ''}...`)
  
  try {
    const startTime = Date.now()
    
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
    
    const responseTime = Date.now() - startTime
    performanceStats.requestTimes.push(responseTime)
    console.log(`📡 Response received for ${dateStr}: status=${response.status}, size=${response.data.length} bytes, time=${responseTime}ms`)

    // Parse HTML with minimal processing
    let $
    try {
      $ = cheerio.load(response.data, {
        normalizeWhitespace: false,
        decodeEntities: false,
        xmlMode: false,
        lowerCaseTags: false // Faster parsing
      })
    } catch (parseError) {
      console.error(`📄 HTML parsing error for ${dateStr}:`, parseError.message)
      throw new Error('Failed to parse HTML response')
    }
    
    // Quick check for no appointments (optimized - check first, parse once)
    const dangerElem = $('h4.tx-danger').first()
    if (dangerElem.length > 0) {
      const dangerText = dangerElem.text()
      if (dangerText.includes('לא נשארו תורים פנויים') || dangerText.includes('אין תורים זמינים')) {
        console.log(`❌ No appointments message found for ${dateStr}`)
        const result = { date: dateStr, available: false, times: [] }
        return result
      }
    }

    // Extract available times efficiently - single pass
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
    
    console.log(`📊 Result for ${dateStr}: ${result.available ? '✅' : '❌'} ${availableTimes.length} slots found`)
    
    return result
    
  } catch (error: any) {
    const isRetryable = error.response?.status === 500 || 
                       error.response?.status === 503 ||
                       error.code === 'ECONNRESET' || 
                       error.code === 'ETIMEDOUT'
    
    console.error(`❌ Error checking ${dateStr}: ${error.message} (Status: ${error.response?.status || 'N/A'})`)
    
    // Retry logic with faster backoff
    if (isRetryable && retryCount < maxRetries) {
      performanceStats.retries++
      // Faster backoff: 200ms, 400ms, 800ms
      const backoffTime = Math.min(200 * Math.pow(2, retryCount), 800)
      console.log(`🔄 Retrying ${dateStr} after ${backoffTime}ms (attempt ${retryCount + 1}/${maxRetries})...`)
      await new Promise(resolve => setTimeout(resolve, backoffTime))
      return checkSingleDate(dateStr, retryCount + 1)
    }
    
    return { 
      date: dateStr, 
      available: null, 
      times: [], 
      error: error.message,
      errorCode: error.response?.status || error.code
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

    const result = await checkSingleDate(date)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error checking appointment:', error)
    return NextResponse.json({ 
      error: 'Failed to check appointment',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json()

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

    const result = await checkSingleDate(date)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error checking appointment:', error)
    return NextResponse.json({ 
      error: 'Failed to check appointment',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 