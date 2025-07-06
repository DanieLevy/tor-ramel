import axios from 'axios'
import * as cheerio from 'cheerio'
import http from 'http'
import https from 'https'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { processNotificationQueue } from './notification-processor.mjs'

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
const CACHE_TTL = 5 * 60 * 1000 // 5 minute cache for better performance

// Create optimized HTTP agents with better connection pooling
const httpAgent = new http.Agent({ 
  keepAlive: true, 
  maxSockets: 15, // Increased for better parallelism
  maxFreeSockets: 8,
  timeout: 2500, // Faster timeout for quicker retries
  keepAliveMsecs: 3000,
  scheduling: 'lifo' // Last-in-first-out for better connection reuse
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
    : 300 // Default estimate
  
  const timeRemaining = 9500 - elapsed // Target 9.5 seconds max
  
  // Account for staggered delays (100ms per request in batch)
  // Last request in batch starts at (batchSize-1) * 100ms
  const staggerDelay = 100
  
  // Calculate optimal batch size considering stagger delays
  let batchSize = 6 // Start with higher default for speed
  
  // Estimate time for a batch: stagger delay + avg response time
  const estimatedBatchTime = (batchSize - 1) * staggerDelay + avgResponseTime + 100 // Reduced buffer
  
  // Adjust batch size based on remaining time and performance
  if (timeRemaining < 1500) {
    batchSize = 3 // Minimum for last batch
  } else if (timeRemaining < 3000) {
    batchSize = 4 // Medium for mid-run
  } else if (timeRemaining > 5000 && avgResponseTime < 400) {
    batchSize = 8 // Can handle more at start
  }
  
  // Reduce batch size only if we're getting many errors
  if (performanceStats.errors > 2 || performanceStats.retries > 5) {
    batchSize = Math.max(3, batchSize - 2)
  }
  
  // Allow up to 8 for better throughput
  return Math.min(8, Math.max(3, batchSize))
}

// Single date check function with caching
async function checkSingleDate(dateStr, retryCount = 0) {
  const maxRetries = 2 // Increased to handle more 500 errors
  
  // Check cache first
  const cacheKey = `date_${dateStr}`
  const cached = responseCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    performanceStats.cacheHits++
    console.log(`💾 Cache hit for ${dateStr}`)
    return cached.data
  }
  performanceStats.cacheMisses++
  
  if (retryCount > 0 || performanceStats.requestTimes.length < 5) {
    console.log(`🔍 Checking ${dateStr}${retryCount > 0 ? ` (retry ${retryCount})` : ''}...`)
  }
  
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
    // Only log first few responses or slow ones
    if (performanceStats.requestTimes.length <= 3 || responseTime > 1000) {
      console.log(`📡 Response received for ${dateStr}: status=${response.status}, size=${response.data.length} bytes, time=${responseTime}ms`)
    }

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
        if (performanceStats.requestTimes.length <= 3) {
          console.log(`❌ No appointments message found for ${dateStr}`)
        }
        const result = { date: dateStr, available: false, times: [] }
        responseCache.set(cacheKey, { data: result, timestamp: Date.now() })
        return result
      }
    }

    // Extract available times efficiently - single pass
    const availableTimes = []
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
    
    // Cache successful results
    responseCache.set(cacheKey, { data: result, timestamp: Date.now() })
    
    return result
    
  } catch (error) {
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

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

async function checkSubscriptionsAndQueueNotifications(appointmentResults) {
  try {
    console.log('🔔 Checking notification subscriptions...')
    
    // Get all active subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('notification_subscriptions')
      .select('*')
      .eq('is_active', true)
    
    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      return
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active subscriptions found')
      return
    }
    
    console.log(`Found ${subscriptions.length} active subscriptions`)
    
    // Filter appointments that have available slots
    const availableAppointments = appointmentResults.filter(r => r.available && r.times.length > 0)
    
    if (availableAppointments.length === 0) {
      console.log('No available appointments to notify about')
      return
    }
    
    let notificationsQueued = 0
    
    // Check each subscription
    for (const subscription of subscriptions) {
      try {
        let matchingDates = []
        
        if (subscription.subscription_date) {
          // Single date subscription
          const match = availableAppointments.find(a => a.date === subscription.subscription_date)
          if (match) {
            matchingDates.push(match)
          }
        } else if (subscription.date_range_start && subscription.date_range_end) {
          // Date range subscription
          matchingDates = availableAppointments.filter(a => {
            return a.date >= subscription.date_range_start && 
                   a.date <= subscription.date_range_end
          })
        }
        
        // Process each matching date
        for (const appointment of matchingDates) {
          // Get ignored times for this user and date
          const { data: ignoredData } = await supabase
            .from('ignored_appointment_times')
            .select('ignored_times')
            .eq('user_id', subscription.user_id)
            .eq('appointment_date', appointment.date)
          
          const ignoredTimes = ignoredData ? 
            ignoredData.flatMap(d => d.ignored_times || []) : []
          
          // Filter out ignored times
          const newTimes = appointment.times.filter(time => !ignoredTimes.includes(time))
          
          if (newTimes.length === 0) {
            console.log(`All times ignored for subscription ${subscription.id} on ${appointment.date}`)
            continue
          }
          
          // Check if notification was already sent for these exact times
          const { data: existingNotification } = await supabase
            .from('notified_appointments')
            .select('id')
            .eq('subscription_id', subscription.id)
            .eq('appointment_date', appointment.date)
            .eq('notified_times', newTimes)
            .single()
          
          if (existingNotification) {
            console.log(`Notification already sent for subscription ${subscription.id} on ${appointment.date}`)
            continue
          }
          
          // Queue the notification
          const { error: queueError } = await supabase
            .from('notification_queue')
            .insert({
              subscription_id: subscription.id,
              appointment_date: appointment.date,
              available_times: appointment.times,
              new_times: newTimes,
              status: 'pending'
            })
          
          if (queueError) {
            console.error('Error queueing notification:', queueError)
          } else {
            notificationsQueued++
            console.log(`✅ Queued notification for subscription ${subscription.id} on ${appointment.date}`)
          }
        }
      } catch (error) {
        console.error(`Error processing subscription ${subscription.id}:`, error)
      }
    }
    
    console.log(`📧 Queued ${notificationsQueued} notifications`)
    
    return notificationsQueued
    
  } catch (error) {
    console.error('Error in notification system:', error)
    return 0
  }
}

// Main appointment finding function with optimizations
async function findAppointments() {
  console.log('🚀 Starting optimized appointment search')
  console.log(`📅 Current Israel time: ${new Date().toLocaleString('he-IL', { timeZone: ISRAEL_TIMEZONE })}`)
  
  // Debug: Show day calculation only on first run
  if (!performanceStats._debugShown) {
    performanceStats._debugShown = true
    const debugDate = new Date()
    console.log('🔍 Debug - Days of the week check:')
    for (let i = 0; i < 7; i++) {
      const checkDate = addDaysIsrael(debugDate, i)
      const dayName = new Intl.DateTimeFormat('en-US', { timeZone: ISRAEL_TIMEZONE, weekday: 'long' }).format(checkDate)
      const dateStr = formatDateIsrael(checkDate)
      console.log(`   ${dateStr}: ${dayName} ${isClosedDay(checkDate) ? '(CLOSED)' : '(Open)'}`)
    }
  }
  
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
    
    // Process batch with staggered start to avoid 500 errors
    // Based on test results, small delays between requests prevent server errors
    const batchPromises = batch.map((date, index) => {
      // Stagger requests by 100ms to avoid overwhelming the server
      const delay = index * 100
      return new Promise(resolve => setTimeout(resolve, delay))
        .then(() => checkSingleDate(formatDateIsrael(date)))
    })
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
    
    // Stop if approaching time limit (leaving 0.5 seconds for cleanup)
    if (totalElapsed > 9500) {
      console.log(`⏰ TIME LIMIT: Stopping at ${totalElapsed}ms`)
      break
    }
    
    // Minimal delay between batches (only if having errors)
    if (i < openDates.length && performanceStats.errors > 0) {
      // Only delay if we're seeing errors
      const delay = performanceStats.errors > 2 ? 150 : 50
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
    
    // Check subscriptions and queue notifications
    const notificationsQueued = await checkSubscriptionsAndQueueNotifications(successfulResults)
    
    // Process notifications immediately if any were queued
    if (notificationsQueued > 0) {
      const notificationStart = Date.now()
      try {
        const result = await processNotificationQueue(5) // Process max 5 to save time
        const notificationTime = Date.now() - notificationStart
        console.log(`📧 Notification processing completed in ${notificationTime}ms: ${result.processed} sent, ${result.failed} failed`)
      } catch (error) {
        console.error('❌ Error processing notifications:', error)
      }
    }
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
// NETLIFY FUNCTION HANDLER (2025 Format)
// ============================================================================

// Main handler for scheduled function - runs every 5 minutes
export default async (req) => {
  const functionStart = Date.now()
  
  try {
    console.log('🚀 AUTO-CHECK: Starting execution')
    
    // Check if this is a scheduled invocation
    let isScheduled = false
    let nextRun = null
    
    // Netlify scheduled functions pass next_run in the request body
    try {
      const body = await req.json()
      if (body && body.next_run) {
        isScheduled = true
        nextRun = body.next_run
        console.log(`⏰ Scheduled invocation - Next run: ${nextRun}`)
      }
    } catch (e) {
      // Not a scheduled invocation or invalid body
      console.log('🔧 Manual invocation (no next_run in body)')
    }
    
    const appointmentResults = await findAppointments()
    
    const totalTime = Math.round((Date.now() - functionStart) / 1000)
    console.log(`⚡ FUNCTION COMPLETED in ${totalTime}s`)
    
    const responseBody = {
      success: true,
      executionTime: totalTime,
      isScheduled,
      nextRun,
      timestamp: new Date().toISOString(),
      data: {
        found: appointmentResults.found,
        appointmentCount: appointmentResults.appointments.length,
        appointments: appointmentResults.appointments,
        totalChecked: appointmentResults.totalChecked
      }
    }
    
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
    
  } catch (error) {
    const totalTime = Math.round((Date.now() - functionStart) / 1000)
    console.error(`❌ FUNCTION FAILED in ${totalTime}s:`, error.message)
    console.error(error.stack)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      executionTime: totalTime,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

// Schedule configuration - runs every 5 minutes
export const config = {
  schedule: "*/5 * * * *"
}