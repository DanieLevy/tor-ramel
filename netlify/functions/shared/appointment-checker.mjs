/**
 * Shared appointment checking logic for Netlify functions
 * JavaScript version of lib/appointment-checker.ts
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import http from 'http'
import https from 'https'

// ============================================================================
// CONSTANTS
// ============================================================================

const MYTOR_URL = 'https://mytor.co.il/home.php'
const MYTOR_PARAMS = {
  i: 'cmFtZWwzMw==', // ramel33
  s: 'MjY1',         // 265
  mm: 'y',
  lang: 'he'
}

// ============================================================================
// HTTP CONFIGURATION
// ============================================================================

// Create optimized HTTP agents with connection pooling
const httpAgent = new http.Agent({ 
  keepAlive: true, 
  maxSockets: 15,
  maxFreeSockets: 8,
  timeout: 2500,
  keepAliveMsecs: 3000,
  scheduling: 'lifo'
})

const httpsAgent = new https.Agent({ 
  keepAlive: true, 
  maxSockets: 15,
  maxFreeSockets: 8,
  rejectUnauthorized: false,
  timeout: 2500,
  keepAliveMsecs: 3000,
  scheduling: 'lifo'
})

// ============================================================================
// APPOINTMENT CHECKER CLASS
// ============================================================================

export class AppointmentChecker {
  constructor(config = {}) {
    this.config = {
      enableCaching: false,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      maxRetries: 2,
      timeout: 2500,
      ...config
    }
    this.cache = new Map()
    this.stats = {
      requestTimes: [],
      retries: 0,
      errors: 0
    }
    this.axiosInstance = this.createAxiosInstance()
  }

  createAxiosInstance() {
    const instance = axios.create({
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
      timeout: this.config.timeout,
      responseType: 'arraybuffer',
      maxRedirects: 2,
      decompress: true,
      validateStatus: (status) => status < 500
    })

    // Add response interceptor for tracking
    instance.interceptors.response.use(
      response => {
        const responseTime = parseInt(response.headers['x-response-time'] || '0')
        if (responseTime > 0) {
          this.stats.requestTimes.push(responseTime)
        }
        return response
      },
      error => {
        this.stats.errors++
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

    return instance
  }

  /**
   * Check a single date for available appointments
   */
  async checkSingleDate(dateStr, retryCount = 0) {
    // Check cache first if enabled
    if (this.config.enableCaching) {
      const cacheKey = `date_${dateStr}`
      const cached = this.cache.get(cacheKey)
      if (cached && (Date.now() - cached.timestamp < this.config.cacheTTL)) {
        console.log(`📦 Using cached result for ${dateStr}`)
        return cached.data
      }
    }

    console.log(`🔍 Checking ${dateStr}${retryCount > 0 ? ` (retry ${retryCount})` : ''}...`)

    try {
      const startTime = Date.now()
      
      const userId = process.env.USER_ID || '4481'
      const codeAuth = process.env.CODE_AUTH || 'Sa1W2GjL'
      
      const response = await this.axiosInstance.get(MYTOR_URL, {
        params: {
          ...MYTOR_PARAMS,
          datef: dateStr
        },
        headers: {
          'Cookie': `userID=${userId}; codeAuth=${codeAuth}`,
          'Referer': 'https://mytor.co.il'
        }
      })
      
      const responseTime = Date.now() - startTime
      this.stats.requestTimes.push(responseTime)
      console.log(`📡 Response received for ${dateStr}: status=${response.status}, size=${response.data.length} bytes, time=${responseTime}ms`)

      // Parse HTML
      const result = this.parseResponse(dateStr, response.data)
      
      // Cache successful results
      if (this.config.enableCaching) {
        this.cache.set(`date_${dateStr}`, { data: result, timestamp: Date.now() })
      }
      
      return result
      
    } catch (error) {
      return this.handleError(error, dateStr, retryCount)
    }
  }

  /**
   * Check multiple dates in batch with staggered requests
   */
  async checkBatch(dates, batchSize = 6, staggerDelay = 100) {
    const results = []
    
    for (let i = 0; i < dates.length; i += batchSize) {
      const batch = dates.slice(i, i + batchSize)
      
      // Process batch with staggered start
      const batchPromises = batch.map((date, index) => {
        const delay = index * staggerDelay
        return new Promise(resolve => setTimeout(resolve, delay))
          .then(() => this.checkSingleDate(date))
      })
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            date: batch[idx],
            available: null,
            times: [],
            error: result.reason?.message || 'Unknown error'
          })
        }
      })
      
      // Small delay between batches if not the last batch
      if (i + batchSize < dates.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    
    return results
  }

  /**
   * Parse HTML response and extract available times
   */
  parseResponse(dateStr, data) {
    let $
    try {
      const html = Buffer.from(data).toString('utf-8')
      $ = cheerio.load(html, {
        normalizeWhitespace: false,
        decodeEntities: false,
        xmlMode: false,
        lowerCaseTags: false
      })
    } catch (parseError) {
      console.error(`📄 HTML parsing error for ${dateStr}:`, parseError.message)
      throw new Error('Failed to parse HTML response')
    }
    
    // Quick check for no appointments
    const dangerElem = $('h4.tx-danger').first()
    if (dangerElem.length > 0) {
      const dangerText = dangerElem.text()
      if (dangerText.includes('לא נשארו תורים פנויים') || dangerText.includes('אין תורים זמינים')) {
        console.log(`❌ No appointments message found for ${dateStr}`)
        return { date: dateStr, available: false, times: [] }
      }
    }

    // Extract available times
    const availableTimes = []
    $('button.btn.btn-outline-dark.btn-block').each((_, elem) => {
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
  }

  /**
   * Handle errors with retry logic
   */
  async handleError(error, dateStr, retryCount) {
    const isRetryable = error.response?.status === 500 || 
                       error.response?.status === 503 ||
                       error.code === 'ECONNRESET' || 
                       error.code === 'ETIMEDOUT'
    
    console.error(`❌ Error checking ${dateStr}: ${error.message} (Status: ${error.response?.status || 'N/A'})`)
    
    // Retry with exponential backoff
    if (isRetryable && retryCount < this.config.maxRetries) {
      this.stats.retries++
      const backoffTime = Math.min(200 * Math.pow(2, retryCount), 800)
      console.log(`🔄 Retrying ${dateStr} after ${backoffTime}ms (attempt ${retryCount + 1}/${this.config.maxRetries})...`)
      await new Promise(resolve => setTimeout(resolve, backoffTime))
      return this.checkSingleDate(dateStr, retryCount + 1)
    }
    
    return { 
      date: dateStr, 
      available: null, 
      times: [], 
      error: error.message,
      errorCode: error.response?.status || error.code
    }
  }

  /**
   * Get current performance statistics
   */
  getStats() {
    return { ...this.stats }
  }

  /**
   * Reset performance statistics
   */
  resetStats() {
    this.stats = {
      requestTimes: [],
      retries: 0,
      errors: 0
    }
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * Get adaptive batch size based on performance
   */
  getAdaptiveBatchSize(elapsed, totalRemaining, maxTimeMs = 9500) {
    const avgResponseTime = this.stats.requestTimes.length > 0
      ? this.stats.requestTimes.reduce((a, b) => a + b, 0) / this.stats.requestTimes.length
      : 300
    
    const timeRemaining = maxTimeMs - elapsed
    let batchSize = 6
    
    if (timeRemaining < 1500) {
      batchSize = 3
    } else if (timeRemaining < 3000) {
      batchSize = 4
    } else if (timeRemaining > 5000 && avgResponseTime < 400) {
      batchSize = 8
    }
    
    // Reduce batch size if seeing many errors
    if (this.stats.errors > 2 || this.stats.retries > 5) {
      batchSize = Math.max(3, batchSize - 2)
    }
    
    return Math.min(8, Math.max(3, batchSize))
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let defaultChecker = null

/**
 * Get the default appointment checker (no caching for fresh data)
 */
export const getDefaultChecker = () => {
  if (!defaultChecker) {
    defaultChecker = new AppointmentChecker({ enableCaching: false })
  }
  return defaultChecker
}



