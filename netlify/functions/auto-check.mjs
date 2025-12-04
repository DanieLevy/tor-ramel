import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { processNotificationQueue } from './notification-processor.mjs'
import { AppointmentChecker } from './shared/appointment-checker.mjs'
import { 
  ISRAEL_TIMEZONE, 
  formatDateIsrael, 
  getCurrentDateIsrael, 
  getDayNameHebrew,
  addDaysIsrael,
  isClosedDay,
  getOpenDays,
  generateBookingUrl
} from './shared/date-utils.mjs'
import { 
  processHotAlerts, 
  processOpportunityDiscovery 
} from './shared/proactive-notifications.mjs'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Create appointment checker instance
const checker = new AppointmentChecker({ enableCaching: false })

// ============================================================================
// SUPABASE OPERATIONS
// ============================================================================

/**
 * Save results to Supabase
 */
async function saveToSupabase(results) {
  try {
    console.log('💾 Saving results to Supabase...')
    
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
    
    const { error } = await supabase
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

/**
 * Filter times by preferred time ranges
 */
function filterTimesByPreferences(times, preferredTimeRanges) {
  if (!preferredTimeRanges || preferredTimeRanges.length === 0) {
    return times
  }
  
  return times.filter(time => {
    return preferredTimeRanges.some(range => {
      return time >= range.start && time <= range.end
    })
  })
}

/**
 * Check if current time is within quiet hours
 */
function isWithinQuietHours(quietHoursStart, quietHoursEnd) {
  if (!quietHoursStart || !quietHoursEnd) {
    return false
  }
  
  const now = new Date()
  const currentTime = now.toLocaleTimeString('en-US', { 
    timeZone: ISRAEL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  
  if (quietHoursStart > quietHoursEnd) {
    return currentTime >= quietHoursStart || currentTime <= quietHoursEnd
  }
  
  return currentTime >= quietHoursStart && currentTime <= quietHoursEnd
}

/**
 * Check for pending notifications
 */
async function checkPendingNotifications() {
  try {
    const { count, error } = await supabase
      .from('notification_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    
    if (error) {
      console.error('Error checking pending notifications:', error)
      return 0
    }
    
    if (count > 0) {
      console.log(`📬 Found ${count} pending notifications to process`)
    }
    return count || 0
  } catch (error) {
    console.error('Error checking pending notifications:', error)
    return 0
  }
}

/**
 * Check subscriptions and queue notifications for available appointments
 */
async function checkSubscriptionsAndQueueNotifications(appointmentResults) {
  try {
    console.log('🔔 Checking notification subscriptions...')
    
    const { data: subscriptions, error: subError } = await supabase
      .from('notification_subscriptions')
      .select('*')
      .eq('is_active', true)
      .in('subscription_status', ['active'])
    
    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      return
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active subscriptions found')
      return
    }
    
    console.log(`Found ${subscriptions.length} active subscriptions`)
    
    const availableAppointments = appointmentResults.filter(r => r.available && r.times.length > 0)
    
    if (availableAppointments.length === 0) {
      console.log('No available appointments to notify about')
      return
    }
    
    let notificationsQueued = 0
    
    for (const subscription of subscriptions) {
      try {
        if (isWithinQuietHours(subscription.quiet_hours_start, subscription.quiet_hours_end)) {
          console.log(`🔕 Subscription ${subscription.id} is in quiet hours, skipping`)
          continue
        }
        
        let matchingDates = []
        
        if (subscription.subscription_date) {
          const match = availableAppointments.find(a => a.date === subscription.subscription_date)
          if (match) {
            matchingDates.push(match)
          }
        } else if (subscription.date_range_start && subscription.date_range_end) {
          matchingDates = availableAppointments.filter(a => {
            return a.date >= subscription.date_range_start && 
                   a.date <= subscription.date_range_end
          })
        }
        
        if (matchingDates.length === 0) {
          continue
        }
        
        const appointmentsToNotify = []
        
        for (const appointment of matchingDates) {
          const { data: ignoredData } = await supabase
            .from('ignored_appointment_times')
            .select('ignored_times')
            .eq('subscription_id', subscription.id)
            .eq('appointment_date', appointment.date)
          
          const ignoredTimes = ignoredData ? 
            ignoredData.flatMap(d => d.ignored_times || []) : []
          
          let filteredTimes = appointment.times.filter(time => !ignoredTimes.includes(time))
          filteredTimes = filterTimesByPreferences(filteredTimes, subscription.preferred_time_ranges)
          
          const newTimes = filteredTimes
          
          if (newTimes.length === 0) {
            console.log(`All times filtered out for subscription ${subscription.id} on ${appointment.date}`)
            continue
          }
          
          if (newTimes.length < appointment.times.length) {
            const ignoredCount = ignoredTimes.length
            const timeRangeCount = (appointment.times.length - ignoredTimes.length) - newTimes.length
            console.log(`📝 Filtered ${appointment.times.length - newTimes.length} times for subscription ${subscription.id} on ${appointment.date} (ignored: ${ignoredCount}, time range: ${timeRangeCount})`)
          }
          
          const { data: existingNotification } = await supabase
            .from('notified_appointments')
            .select('id')
            .eq('subscription_id', subscription.id)
            .eq('appointment_date', appointment.date)
            .eq('notified_times', newTimes)
            .single()
          
          if (existingNotification) {
            console.log(`Notification already sent for subscription ${subscription.id} on ${appointment.date} with times ${newTimes.join(',')}`)
            continue
          }
          
          const dayName = new Intl.DateTimeFormat('he-IL', {
            timeZone: ISRAEL_TIMEZONE,
            weekday: 'long'
          }).format(new Date(appointment.date + 'T00:00:00'))
          
          appointmentsToNotify.push({
            date: appointment.date,
            dayName,
            times: appointment.times,
            newTimes
          })
        }
        
        if (appointmentsToNotify.length > 0) {
          const { data: existingPending } = await supabase
            .from('notification_queue')
            .select('id')
            .eq('subscription_id', subscription.id)
            .eq('status', 'pending')
            .single()
          
          if (existingPending) {
            console.log(`Pending notification already exists for subscription ${subscription.id}`)
            continue
          }
          
          const { data: recentlySent } = await supabase
            .from('notification_queue')
            .select('id')
            .eq('subscription_id', subscription.id)
            .eq('status', 'sent')
            .gte('processed_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
            .limit(1)
            .single()
          
          if (recentlySent) {
            console.log(`Recently sent notification exists for subscription ${subscription.id} (within last hour)`)
            continue
          }
          
          const batchId = crypto.randomUUID()
          
          const { error: queueError } = await supabase
            .from('notification_queue')
            .insert({
              subscription_id: subscription.id,
              appointments: appointmentsToNotify,
              batch_id: batchId,
              status: 'pending',
              appointment_date: appointmentsToNotify[0].date,
              available_times: appointmentsToNotify[0].times,
              new_times: appointmentsToNotify[0].newTimes
            })
          
          if (queueError) {
            console.error('Error queueing notification:', queueError)
          } else {
            notificationsQueued++
            console.log(`✅ Queued grouped notification for subscription ${subscription.id} with ${appointmentsToNotify.length} dates`)
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

// ============================================================================
// MAIN APPOINTMENT FINDER
// ============================================================================

/**
 * Main appointment finding function with optimizations
 */
async function findAppointments() {
  console.log('🚀 Starting optimized appointment search')
  console.log(`📅 Current Israel time: ${new Date().toLocaleString('he-IL', { timeZone: ISRAEL_TIMEZONE })}`)
  
  const startTime = Date.now()
  
  // Reset checker stats for this run
  checker.resetStats()
  
  const currentDate = getCurrentDateIsrael()
  console.log(`📅 Starting from date: ${formatDateIsrael(currentDate)}`)
  
  const maxDays = 30
  const { openDays, closedDaysCount } = getOpenDays(currentDate, maxDays)
  
  console.log(`📊 Will check ${openDays.length} open dates (30 days, excluding Monday/Saturday)`)
  console.log(`🚫 Skipping ${closedDaysCount} closed days (Mondays & Saturdays)`)
  
  const results = []
  let batchNumber = 0
  
  // Process in adaptive batches
  for (let i = 0; i < openDays.length;) {
    const elapsed = Date.now() - startTime
    const remaining = openDays.length - i
    
    const batchSize = checker.getAdaptiveBatchSize(elapsed, remaining)
    const batch = openDays.slice(i, i + batchSize)
    batchNumber++
    
    const batchStartTime = Date.now()
    
    console.log(`📦 Processing batch ${batchNumber} (${batchSize} dates): ${batch.map(d => formatDateIsrael(d)).join(', ')}`)
    
    // Process batch with staggered start
    const batchPromises = batch.map((date, index) => {
      const delay = index * 100
      return new Promise(resolve => setTimeout(resolve, delay))
        .then(() => checker.checkSingleDate(formatDateIsrael(date)))
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
    
    i += batchSize
    
    if (totalElapsed > 9500) {
      console.log(`⏰ TIME LIMIT: Stopping at ${totalElapsed}ms`)
      break
    }
    
    const stats = checker.getStats()
    if (i < openDays.length && stats.errors > 0) {
      const delay = stats.errors > 2 ? 150 : 50
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  const elapsed = Math.round((Date.now() - startTime) / 1000)
  const availableResults = results.filter(r => r.available === true)
  const errorResults = results.filter(r => r.available === null)
  
  console.log(`✅ Check completed: ${results.length} checked, ${availableResults.length} available, ${errorResults.length} errors in ${elapsed}s`)
  
  const stats = checker.getStats()
  const avgResponseTime = stats.requestTimes.length > 0 
    ? Math.round(stats.requestTimes.reduce((a, b) => a + b, 0) / stats.requestTimes.length)
    : 0
  
  console.log(`📊 Performance: ${stats.retries} retries, avg response: ${avgResponseTime}ms`)
  
  if (errorResults.length > 0) {
    console.log(`⚠️ Failed dates: ${errorResults.map(r => r.date).join(', ')}`)
  }
  
  // Save successful results to Supabase
  const successfulResults = results.filter(r => r.available !== null)
  if (successfulResults.length > 0) {
    await saveToSupabase(successfulResults)
    
    const notificationsQueued = await checkSubscriptionsAndQueueNotifications(successfulResults)
    const pendingNotifications = await checkPendingNotifications()
    
    if (notificationsQueued > 0 || pendingNotifications > 0) {
      const notificationStart = Date.now()
      try {
        const result = await processNotificationQueue(5)
        const notificationTime = Date.now() - notificationStart
        console.log(`📧 Notification processing completed in ${notificationTime}ms: ${result.processed} sent, ${result.failed} failed`)
      } catch (error) {
        console.error('❌ Error processing notifications:', error)
      }
    }
    
    // Process proactive notifications (hot alerts & opportunity discovery)
    const availableWithTimes = successfulResults.filter(r => r.available && r.times && r.times.length > 0)
    if (availableWithTimes.length > 0) {
      console.log('🔔 Processing proactive notifications...')
      
      try {
        // Hot alerts for urgent appointments (1-3 days)
        const hotAlertResult = await processHotAlerts(availableWithTimes)
        console.log(`🔥 Hot alerts: ${hotAlertResult.sent} sent, ${hotAlertResult.skipped} skipped`)
        
        // Opportunity discovery for users without subscriptions
        const opportunityResult = await processOpportunityDiscovery(availableWithTimes)
        console.log(`💡 Opportunity discovery: ${opportunityResult.sent} sent, ${opportunityResult.skipped} skipped`)
        
      } catch (error) {
        console.error('❌ Error processing proactive notifications:', error)
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
      avgResponseTime: avgResponseTime,
      retries: stats.retries
    }
  }
}

// ============================================================================
// NETLIFY FUNCTION HANDLER
// ============================================================================

export default async (req) => {
  const functionStart = Date.now()
  
  try {
    console.log('🚀 AUTO-CHECK: Starting execution')
    
    let isScheduled = false
    let nextRun = null
    
    try {
      const body = await req.json()
      if (body && body.next_run) {
        isScheduled = true
        nextRun = body.next_run
        console.log(`⏰ Scheduled invocation - Next run: ${nextRun}`)
      }
    } catch (e) {
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
