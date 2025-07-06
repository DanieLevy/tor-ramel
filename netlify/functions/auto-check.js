const axios = require('axios')
const cheerio = require('cheerio')
const http = require('http')
const https = require('https')
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ============================================================================
// OPTIMIZED AUTO-CHECK FUNCTION
// Performance optimizations with server-friendly approach
// ============================================================================

// Performance tracking
const performanceStats = {
  requestTimes: [],
  cacheHits: 0,
  cacheMisses: 0,
  retries: 0,
  errors: 0
}

// Response cache for the current run (avoids duplicate requests)
const responseCache = new Map()
const CACHE_TTL = 60 * 1000 // 1 minute cache

// Create optimized HTTP agents with better connection pooling
const httpAgent = new http.Agent({ 
  keepAlive: true, 
  maxSockets: 5, // Reduced to avoid overwhelming server
  maxFreeSockets: 2,
  timeout: 5000,
  keepAliveMsecs: 3000,
  scheduling: 'lifo' // Last-in-first-out for better connection reuse
})
const httpsAgent = new https.Agent({ 
  keepAlive: true, 
  maxSockets: 5,
  maxFreeSockets: 2,
  rejectUnauthorized: false,
  timeout: 5000,
  keepAliveMsecs: 3000,
  scheduling: 'lifo'
})

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
  timeout: 4000,
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

// Israel timezone utilities
const ISRAEL_TIMEZONE = 'Asia/Jerusalem'

const formatDateIsrael = (date) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

const getCurrentDateIsrael = () => {
  return new Date(new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date()) + 'T00:00:00')
}

const getDayNameHebrew = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: ISRAEL_TIMEZONE,
    weekday: 'long'
  }).format(date)
}

const generateBookingUrl = (dateStr) => {
  const baseUrl = 'https://mytor.co.il/home.php'
  const params = new URLSearchParams({
    i: 'cmFtZWwzMw==',  // ramel33 encoded
    s: 'MjY1',         // 265
    mm: 'y',
    lang: 'he',
    datef: dateStr,
    signup: 'הצג'      // Hebrew for "Show"
  })
  
  return `${baseUrl}?${params.toString()}`
}

const addDaysIsrael = (date, days) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const isClosedDay = (date) => {
  const dayOfWeek = new Intl.DateTimeFormat('en-US', {
    timeZone: ISRAEL_TIMEZONE,
    weekday: 'long'
  }).format(date)
  
  // Skip checking Monday and Saturday - barbershop is closed these days
  return dayOfWeek === 'Monday' || dayOfWeek === 'Saturday'
}

const getOpenDays = (startDate, totalDays) => {
  const openDays = []
  let currentDate = new Date(startDate)
  let daysChecked = 0
  
  const maxDaysToCheck = Math.min(totalDays * 2, 500)
  
  while (openDays.length < totalDays && daysChecked < maxDaysToCheck) {
    if (!isClosedDay(currentDate)) {
      openDays.push(new Date(currentDate))
    }
    currentDate = addDaysIsrael(currentDate, 1)
    daysChecked++
  }
  
  return openDays
}

// Calculate adaptive batch size based on performance
function getAdaptiveBatchSize(elapsed, totalRemaining) {
  const avgResponseTime = performanceStats.requestTimes.length > 0
    ? performanceStats.requestTimes.reduce((a, b) => a + b, 0) / performanceStats.requestTimes.length
    : 400 // Default estimate
  
  const timeRemaining = 9000 - elapsed // Target 9 seconds max
  const estimatedTimePerBatch = avgResponseTime + 200 // Add buffer for processing
  
  // Calculate optimal batch size
  let batchSize = Math.floor(timeRemaining / estimatedTimePerBatch)
  
  // Apply constraints
  batchSize = Math.max(2, Math.min(5, batchSize)) // Between 2 and 5
  
  // If we're running well, increase batch size
  if (elapsed < 3000 && avgResponseTime < 300) {
    batchSize = Math.min(5, batchSize + 1)
  }
  
  // If we're running slow, decrease batch size
  if (avgResponseTime > 500 || performanceStats.errors > 2) {
    batchSize = Math.max(2, batchSize - 1)
  }
  
  return batchSize
}

// Single date check function with caching
async function checkSingleDate(dateStr, retryCount = 0) {
  const maxRetries = 2
  
  // Check cache first
  const cacheKey = `date_${dateStr}`
  const cached = responseCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    performanceStats.cacheHits++
    console.log(`💾 Cache hit for ${dateStr}`)
    return cached.data
  }
  performanceStats.cacheMisses++
  
  console.log(`🔍 Checking ${dateStr}${retryCount > 0 ? ` (retry ${retryCount})` : ''}...`)
  
  try {
    const startTime = Date.now()
    
    const userId = process.env.USER_ID || '4481'
    const codeAuth = process.env.CODE_AUTH || 'Sa1W2GjL'
    
    if (retryCount === 0) {
      console.log(`🔐 Using credentials: userId=${userId}`)
    }
    
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
    
    // Quick check for no appointments (optimized selectors)
    const dangerText = $('h4.tx-danger').first().text()
    const hasNoAppointments = dangerText.includes('לא נשארו תורים פנויים') || 
                             dangerText.includes('אין תורים זמינים')
    
    if (hasNoAppointments) {
      console.log(`❌ No appointments message found for ${dateStr}`)
      const result = { date: dateStr, available: false, times: [] }
      responseCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }

    // Extract available times efficiently
    const availableTimes = []
    const timeButtons = $('button.btn.btn-outline-dark.btn-block')
    
    timeButtons.each((i, elem) => {
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
    
    // Cache successful results
    responseCache.set(cacheKey, { data: result, timestamp: Date.now() })
    
    return result
    
  } catch (error) {
    const isRetryable = error.response?.status === 500 || 
                       error.response?.status === 503 ||
                       error.code === 'ECONNRESET' || 
                       error.code === 'ETIMEDOUT'
    
    console.error(`❌ Error checking ${dateStr}: ${error.message} (Status: ${error.response?.status || 'N/A'})`)
    
    // Retry logic with exponential backoff
    if (isRetryable && retryCount < maxRetries) {
      performanceStats.retries++
      const backoffTime = Math.min((retryCount + 1) * 300, 1000)
      console.log(`🔄 Retrying ${dateStr} after ${backoffTime}ms...`)
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

// Save results to Supabase
async function saveToSupabase(results) {
  try {
    console.log('💾 Saving results to Supabase...')
    
    // Prepare data for upsert
    const dataToSave = results.map(result => {
      const dayName = result.date ? getDayNameHebrew(result.date) : null
      const bookingUrl = result.date ? generateBookingUrl(result.date) : null
      
      return {
        check_date: result.date,
        available: result.available || false,
        times: result.times || [],
        day_name: dayName,
        booking_url: bookingUrl,
        checked_at: new Date().toISOString()
      }
    })
    
    // Upsert all results (insert or update based on check_date)
    const { data, error } = await supabase
      .from('appointment_checks')
      .upsert(dataToSave, { 
        onConflict: 'check_date',
        returning: 'minimal'
      })
    
    if (error) {
      console.error('❌ Supabase error:', error)
      return false
    }
    
    console.log(`✅ Saved ${dataToSave.length} results to Supabase`)
    
    // Log summary of available appointments
    const availableCount = results.filter(r => r.available === true).length
    if (availableCount > 0) {
      console.log(`🎯 Found ${availableCount} dates with available appointments`)
    }
    
    return true
  } catch (error) {
    console.error('❌ Failed to save to Supabase:', error)
    return false
  }
}

// Main appointment finding function with optimizations
async function findAppointments() {
  console.log('🚀 Starting optimized appointment search')
  console.log(`📅 Current Israel time: ${new Date().toLocaleString('he-IL', { timeZone: ISRAEL_TIMEZONE })}`)
  const startTime = Date.now()
  
  // Reset performance stats
  performanceStats.requestTimes = []
  performanceStats.cacheHits = 0
  performanceStats.cacheMisses = 0
  performanceStats.retries = 0
  performanceStats.errors = 0
  
  const currentDate = getCurrentDateIsrael()
  console.log(`📅 Starting from date: ${formatDateIsrael(currentDate)}`)
  
  // Check next 30 days
  const maxDays = 30
  const openDates = getOpenDays(currentDate, maxDays)
  
  console.log(`📊 Will check ${openDates.length} open dates (30 days, excluding Monday/Saturday)`)
  console.log(`🚫 Skipping ${maxDays - openDates.length} closed days (Mondays & Saturdays)`)
  
  const results = []
  let batchNumber = 0
  
  // Process in adaptive batches
  for (let i = 0; i < openDates.length;) {
    const elapsed = Date.now() - startTime
    const remaining = openDates.length - i
    
    // Get adaptive batch size based on performance
    const batchSize = getAdaptiveBatchSize(elapsed, remaining)
    const batch = openDates.slice(i, i + batchSize)
    batchNumber++
    
    const batchStartTime = Date.now()
    
    console.log(`📦 Processing batch ${batchNumber} (${batchSize} dates): ${batch.map(d => formatDateIsrael(d)).join(', ')}`)
    
    // Process batch with Promise.allSettled for resilience
    const batchPromises = batch.map(date => checkSingleDate(formatDateIsrael(date)))
    const batchResults = await Promise.allSettled(batchPromises)
    
    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        console.error(`🚨 Batch item failed:`, result.reason)
        results.push({
          date: formatDateIsrael(batch[idx]),
          available: null,
          times: [],
          error: result.reason?.message || 'Unknown error'
        })
      }
    })
    
    const batchTime = Date.now() - batchStartTime
    const totalElapsed = Date.now() - startTime
    
    console.log(`📦 Batch ${batchNumber} completed in ${batchTime}ms (total: ${totalElapsed}ms)`)
    
    // Update index
    i += batchSize
    
    // Stop if approaching time limit
    if (totalElapsed > 8500) {
      console.log(`⏰ TIME LIMIT: Stopping at ${totalElapsed}ms to stay under 10 seconds`)
      break
    }
    
    // Dynamic delay between batches based on performance
    if (i < openDates.length) {
      const avgResponseTime = performanceStats.requestTimes.length > 0
        ? performanceStats.requestTimes.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, performanceStats.requestTimes.length)
        : 400
      
      // Adjust delay based on server response time
      const delay = avgResponseTime > 400 ? 300 : 150
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  const elapsed = Math.round((Date.now() - startTime) / 1000)
  const availableResults = results.filter(r => r.available === true)
  const errorResults = results.filter(r => r.available === null)
  
  console.log(`✅ Check completed: ${results.length} checked, ${availableResults.length} available, ${errorResults.length} errors in ${elapsed}s`)
  console.log(`📊 Performance: ${performanceStats.cacheHits} cache hits, ${performanceStats.retries} retries, avg response: ${Math.round(performanceStats.requestTimes.reduce((a, b) => a + b, 0) / performanceStats.requestTimes.length)}ms`)
  
  if (errorResults.length > 0) {
    console.log(`⚠️ Failed dates: ${errorResults.map(r => r.date).join(', ')}`)
  }
  
  // Save all successful results to Supabase (available and not available)
  const successfulResults = results.filter(r => r.available !== null)
  if (successfulResults.length > 0) {
    await saveToSupabase(successfulResults)
  }
  
  return {
    success: true,
    found: availableResults.length > 0,
    appointments: availableResults,
    totalChecked: results.length,
    errors: errorResults.length,
    elapsed: elapsed,
    performance: {
      avgResponseTime: Math.round(performanceStats.requestTimes.reduce((a, b) => a + b, 0) / performanceStats.requestTimes.length),
      cacheHits: performanceStats.cacheHits,
      retries: performanceStats.retries
    }
  }
}

// ============================================================================
// NETLIFY FUNCTION HANDLER
// ============================================================================

// Main handler for both scheduled and manual triggers
async function handler(event, context) {
  const functionStart = Date.now()
  
  try {
    console.log('🚀 AUTO-CHECK: Starting execution')
    
    // Check if this is a scheduled invocation
    let isScheduled = false
    let nextRun = null
    
    // Netlify scheduled functions pass next_run in the body
    if (event.body) {
      try {
        const body = JSON.parse(event.body)
        if (body && body.next_run) {
          isScheduled = true
          nextRun = body.next_run
          console.log(`⏰ Scheduled invocation - Next run: ${nextRun}`)
        }
      } catch (e) {
        // Not a scheduled invocation or invalid body
      }
    }
    
    if (!isScheduled) {
      console.log('🔧 Manual invocation')
    }
    
    const appointmentResults = await findAppointments()
    
    const totalTime = Math.round((Date.now() - functionStart) / 1000)
    console.log(`⚡ FUNCTION COMPLETED in ${totalTime}s`)
    
    const responseBody = {
      success: true,
      executionTime: totalTime,
      isScheduled,
      nextRun,
      data: {
        found: appointmentResults.found,
        appointmentCount: appointmentResults.appointments.length,
        appointments: appointmentResults.appointments,
        totalChecked: appointmentResults.totalChecked
      }
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(responseBody)
    }
    
  } catch (error) {
    const totalTime = Math.round((Date.now() - functionStart) / 1000)
    console.error(`❌ FUNCTION FAILED in ${totalTime}s:`, error.message)
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        executionTime: totalTime
      })
    }
  }
}

// Export for Netlify Functions
module.exports = {
  handler,
  config: {
    schedule: "*/5 * * * *"
  }
}