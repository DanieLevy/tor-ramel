import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { ISRAEL_TIMEZONE, getDayNameHebrew } from './shared/date-utils.mjs'
import { isWithinQuietHours, getDaysUntil } from './shared/proactive-notifications.mjs'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Configure web push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.VAPID_EMAIL || 'admin@tor-ramel.netlify.app'),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

// Inactivity threshold in days
const INACTIVITY_DAYS = 7

/**
 * Get inactive users (haven't opened app in X days)
 */
async function getInactiveUsers() {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - INACTIVITY_DAYS)
  
  // Users with preferences and last_app_open older than cutoff
  const { data: inactiveWithPrefs, error: prefError } = await supabase
    .from('user_preferences')
    .select('user_id, last_app_open, quiet_hours_start, quiet_hours_end, inactivity_alerts_enabled, notification_cooldown_hours, last_proactive_notification_at')
    .lt('last_app_open', cutoffDate.toISOString())
    .eq('inactivity_alerts_enabled', true)
  
  if (prefError) {
    console.error('Error fetching inactive users with prefs:', prefError)
  }
  
  // Also get users without preferences (default behavior)
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, last_login')
    .eq('is_active', true)
    .or(`last_login.lt.${cutoffDate.toISOString()},last_login.is.null`)
  
  // Users with preferences
  const userIdsWithPrefs = new Set((inactiveWithPrefs || []).map(u => u.user_id))
  
  // Users without preferences who are inactive
  const inactiveWithoutPrefs = (allUsers || [])
    .filter(u => !userIdsWithPrefs.has(u.id))
    .map(u => ({
      user_id: u.id,
      last_app_open: u.last_login,
      quiet_hours_start: '22:00',
      quiet_hours_end: '07:00',
      inactivity_alerts_enabled: true,
      notification_cooldown_hours: 4,
      last_proactive_notification_at: null
    }))
  
  return [...(inactiveWithPrefs || []), ...inactiveWithoutPrefs]
}

/**
 * Get available appointments for the next 14 days
 */
async function getUpcomingAppointments() {
  const today = new Date().toISOString().split('T')[0]
  
  const twoWeeks = new Date()
  twoWeeks.setDate(twoWeeks.getDate() + 14)
  const twoWeeksStr = twoWeeks.toISOString().split('T')[0]
  
  const { data: appointments, error } = await supabase
    .from('appointment_checks')
    .select('*')
    .eq('available', true)
    .gte('check_date', today)
    .lte('check_date', twoWeeksStr)
    .order('check_date', { ascending: true })
  
  if (error) {
    console.error('Error fetching appointments:', error)
    return []
  }
  
  return (appointments || []).filter(a => a.times && a.times.length > 0)
}

/**
 * Send push notification to user
 */
async function sendPushToUser(userId, title, body, data = {}) {
  try {
    const { data: pushSubs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
    
    if (error || !pushSubs || pushSubs.length === 0) {
      return { sent: 0, failed: 0 }
    }
    
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        ...data,
        url: '/',
        timestamp: new Date().toISOString()
      }
    })
    
    let sent = 0
    let failed = 0
    
    for (const sub of pushSubs) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payload)
        
        sent++
        
        await supabase
          .from('push_subscriptions')
          .update({ last_used: new Date().toISOString() })
          .eq('id', sub.id)
          
      } catch (pushError) {
        console.error(`Push failed:`, pushError.message)
        failed++
        
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', sub.id)
        }
      }
    }
    
    return { sent, failed }
    
  } catch (error) {
    console.error(`Error sending push to user ${userId}:`, error)
    return { sent: 0, failed: 1 }
  }
}

/**
 * Create in-app notification
 */
async function createInAppNotification(userId, title, body, data = {}) {
  try {
    await supabase
      .from('in_app_notifications')
      .insert({
        user_id: userId,
        title,
        body,
        notification_type: 'inactivity',
        data,
        is_read: false
      })
  } catch (error) {
    console.error('Error creating in-app notification:', error)
  }
}

/**
 * Log proactive notification
 */
async function logProactiveNotification(userId, relatedDates) {
  try {
    const dedupKey = `inactivity-${new Date().toISOString().split('T')[0]}`
    
    await supabase
      .from('proactive_notification_log')
      .insert({
        user_id: userId,
        notification_type: 'inactivity',
        related_dates: relatedDates,
        dedup_key: dedupKey,
        push_sent: true,
        in_app_created: true
      })
    
    // Update last proactive notification time
    await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        last_proactive_notification_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      
  } catch (error) {
    console.error('Error logging notification:', error)
  }
}

/**
 * Process inactivity check
 */
async function processInactivityCheck() {
  console.log('👋 Processing inactivity check...')
  
  // Get available appointments
  const appointments = await getUpcomingAppointments()
  
  if (appointments.length === 0) {
    console.log('No available appointments - skipping inactivity check')
    return { sent: 0, skipped: 0, reason: 'no_appointments' }
  }
  
  console.log(`👋 Found ${appointments.length} available appointments`)
  
  // Get inactive users
  const inactiveUsers = await getInactiveUsers()
  
  if (inactiveUsers.length === 0) {
    console.log('No inactive users found')
    return { sent: 0, skipped: 0, reason: 'no_inactive_users' }
  }
  
  console.log(`👋 Found ${inactiveUsers.length} inactive users`)
  
  // Get the closest appointment
  const closest = appointments[0]
  const closestDayName = getDayNameHebrew(closest.check_date)
  const daysUntil = getDaysUntil(closest.check_date)
  
  // Build notification content
  const title = '👋 היי! לא ראינו אותך זמן מה'
  let body
  if (daysUntil === 0) {
    body = `יש ${appointments.length} תורים פנויים! הכי קרוב: היום בשעה ${closest.times[0]}`
  } else if (daysUntil === 1) {
    body = `יש ${appointments.length} תורים פנויים! הכי קרוב: מחר (${closestDayName})`
  } else {
    body = `יש ${appointments.length} תורים פנויים השבועיים הקרובים. הכי קרוב: ${closestDayName}`
  }
  
  let totalSent = 0
  let totalSkipped = 0
  const relatedDates = appointments.slice(0, 5).map(a => a.check_date)
  
  for (const user of inactiveUsers) {
    const userId = user.user_id
    
    // Check quiet hours
    if (isWithinQuietHours(user.quiet_hours_start, user.quiet_hours_end)) {
      totalSkipped++
      continue
    }
    
    // Check cooldown
    if (user.last_proactive_notification_at) {
      const hoursSince = (Date.now() - new Date(user.last_proactive_notification_at).getTime()) / (1000 * 60 * 60)
      if (hoursSince < 24) { // At least 24 hours between inactivity notifications
        totalSkipped++
        continue
      }
    }
    
    // Check if already notified today
    const { data: existingLog } = await supabase
      .from('proactive_notification_log')
      .select('id')
      .eq('user_id', userId)
      .eq('notification_type', 'inactivity')
      .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Once per week max
      .single()
    
    if (existingLog) {
      totalSkipped++
      continue
    }
    
    // Send push notification
    const pushResult = await sendPushToUser(userId, title, body, {
      type: 'inactivity',
      appointments_count: appointments.length,
      closest_date: closest.check_date
    })
    
    if (pushResult.sent > 0) {
      // Create in-app notification
      await createInAppNotification(userId, title, body, {
        appointments_count: appointments.length,
        closest_appointment: {
          date: closest.check_date,
          day_name: closest.day_name,
          times: closest.times,
          booking_url: closest.booking_url
        }
      })
      
      // Log the notification
      await logProactiveNotification(userId, relatedDates)
      
      totalSent++
    }
  }
  
  console.log(`👋 Inactivity check: ${totalSent} sent, ${totalSkipped} skipped`)
  return { sent: totalSent, skipped: totalSkipped }
}

// Netlify Function Handler
export default async (req) => {
  const functionStart = Date.now()
  
  try {
    console.log('👋 INACTIVITY-CHECK: Starting execution')
    console.log(`📅 Current Israel time: ${new Date().toLocaleString('he-IL', { timeZone: ISRAEL_TIMEZONE })}`)
    
    const result = await processInactivityCheck()
    
    const totalTime = Math.round((Date.now() - functionStart) / 1000)
    console.log(`⚡ FUNCTION COMPLETED in ${totalTime}s`)
    
    return new Response(JSON.stringify({
      success: true,
      executionTime: totalTime,
      timestamp: new Date().toISOString(),
      result
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
    
  } catch (error) {
    const totalTime = Math.round((Date.now() - functionStart) / 1000)
    console.error(`❌ FUNCTION FAILED in ${totalTime}s:`, error.message)
    
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

// Schedule: Daily at 10:00 Israel time (07:00 UTC in winter, 08:00 UTC in summer)
// Using 08:00 UTC
export const config = {
  schedule: "0 8 * * *"
}

