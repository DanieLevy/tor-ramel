import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { ISRAEL_TIMEZONE, getDayNameHebrew } from './shared/date-utils.mjs'
import { isWithinQuietHours, getDaysUntil } from './shared/proactive-notifications.mjs'
import { sendWeeklyDigestEmail } from './shared/email-service.mjs'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Configure web push - use NEXT_PUBLIC_VAPID_PUBLIC_KEY for consistency
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@tor-ramel.netlify.app'

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)
    console.log('✅ [Weekly] VAPID keys configured successfully')
  } catch (error) {
    console.error('❌ [Weekly] Failed to configure VAPID keys:', error)
  }
} else {
  console.warn('⚠️ [Weekly] VAPID keys missing - push notifications will not work')
}

/**
 * Get available appointments for the next 7 days
 */
async function getWeeklyAvailability() {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]
  
  const { data: appointments, error } = await supabase
    .from('appointment_checks')
    .select('*')
    .eq('available', true)
    .gte('check_date', todayStr)
    .lte('check_date', nextWeekStr)
    .order('check_date', { ascending: true })
  
  if (error) {
    console.error('Error fetching weekly availability:', error)
    return []
  }
  
  return appointments || []
}

/**
 * Send push notification to user
 * Payload structure matches sw.js expectations: { notification: {...}, badgeCount: number }
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
    
    // Build payload matching sw.js structure
    const payload = JSON.stringify({
      notification: {
        title,
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'weekly-digest',
        requireInteraction: false,
        data: {
          ...data,
          url: '/',
          timestamp: new Date().toISOString()
        }
      },
      badgeCount: 1
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
        
        // Update last_used and delivery status
        await supabase
          .from('push_subscriptions')
          .update({ 
            last_used: new Date().toISOString(),
            last_delivery_status: 'success',
            consecutive_failures: 0
          })
          .eq('id', sub.id)
          
      } catch (pushError) {
        console.error(`[Weekly] Push failed:`, pushError.message)
        failed++
        
        // Update failure tracking
        const { data: currentSub } = await supabase
          .from('push_subscriptions')
          .select('consecutive_failures')
          .eq('id', sub.id)
          .single()
        
        const newFailureCount = (currentSub?.consecutive_failures || 0) + 1
        
        if (pushError.statusCode === 410 || pushError.statusCode === 404 || newFailureCount >= 5) {
          await supabase
            .from('push_subscriptions')
            .update({ 
              is_active: false,
              last_delivery_status: 'failed',
              last_failure_reason: pushError.message,
              consecutive_failures: newFailureCount
            })
            .eq('id', sub.id)
        } else {
          await supabase
            .from('push_subscriptions')
            .update({ 
              last_delivery_status: 'failed',
              last_failure_reason: pushError.message,
              consecutive_failures: newFailureCount
            })
            .eq('id', sub.id)
        }
      }
    }
    
    return { sent, failed }
    
  } catch (error) {
    console.error(`[Weekly] Error sending push to user ${userId}:`, error)
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
        notification_type: 'weekly_summary',
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
async function logProactiveNotification(userId, relatedDates, emailSent = false, pushSent = false) {
  try {
    const dedupKey = `weekly-${new Date().toISOString().split('T')[0]}`
    
    await supabase
      .from('proactive_notification_log')
      .insert({
        user_id: userId,
        notification_type: 'weekly_summary',
        related_dates: relatedDates,
        data: { email_sent: emailSent },
        dedup_key: dedupKey,
        push_sent: pushSent,
        in_app_created: true
      })
      
  } catch (error) {
    console.error('Error logging notification:', error)
  }
}

/**
 * Send notification to user based on their method preference
 */
async function sendNotificationToUser(userId, userEmail, prefs, title, body, emailData, pushData) {
  const method = prefs?.default_notification_method || 'email'
  let emailSent = false
  let pushSent = false
  
  console.log(`[Weekly] Sending to ${userEmail} via ${method}`)
  
  // Send email if method is 'email' or 'both'
  if (method === 'email' || method === 'both') {
    try {
      emailSent = await sendWeeklyDigestEmail(userEmail, emailData)
      if (emailSent) {
        console.log(`✅ [Weekly] Email sent to ${userEmail}`)
      }
    } catch (error) {
      console.error(`❌ [Weekly] Email failed for ${userEmail}:`, error.message)
    }
  }
  
  // Send push if method is 'push' or 'both'
  if (method === 'push' || method === 'both') {
    const pushResult = await sendPushToUser(userId, title, body, pushData)
    pushSent = pushResult.sent > 0
    if (pushSent) {
      console.log(`✅ [Weekly] Push sent to ${userEmail}`)
    }
  }
  
  // Return true if at least one notification was sent based on preference
  const success = (method === 'email' && emailSent) ||
                  (method === 'push' && pushSent) ||
                  (method === 'both' && (emailSent || pushSent))
  
  return { success, emailSent, pushSent }
}

/**
 * Process weekly digest for all eligible users
 */
async function processWeeklyDigest() {
  console.log('📅 Processing weekly digest...')
  
  // Get available appointments for the week
  const weeklyAppointments = await getWeeklyAvailability()
  
  if (weeklyAppointments.length === 0) {
    console.log('No available appointments this week')
    return { sent: 0, skipped: 0, reason: 'no_appointments' }
  }
  
  console.log(`📅 Found ${weeklyAppointments.length} available appointments this week`)
  
  // Calculate total time slots
  const totalSlots = weeklyAppointments.reduce((sum, apt) => 
    sum + (apt.times?.length || 0), 0
  )
  
  // Get the closest appointment
  const closest = weeklyAppointments[0]
  const closestDayName = getDayNameHebrew(closest.check_date)
  const daysUntil = getDaysUntil(closest.check_date)
  
  // Build notification content
  const title = `📅 סיכום שבועי - ${weeklyAppointments.length} תורים פנויים`
  let body
  if (daysUntil === 0) {
    body = `הכי קרוב: היום בשעה ${closest.times?.[0] || 'N/A'}. לחץ לפרטים`
  } else if (daysUntil === 1) {
    body = `הכי קרוב: מחר (${closestDayName}) בשעה ${closest.times?.[0] || 'N/A'}`
  } else {
    body = `הכי קרוב: ${closestDayName} בשעה ${closest.times?.[0] || 'N/A'}. ${totalSlots} זמנים זמינים`
  }
  
  // Get users with preferences (includes notification method)
  const { data: usersWithPrefs, error } = await supabase
    .from('user_preferences')
    .select('user_id, quiet_hours_start, quiet_hours_end, weekly_digest_enabled, default_notification_method')
  
  if (error) {
    console.error('Error fetching user preferences:', error)
  }
  
  // Get all active users with their emails
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, email')
    .eq('is_active', true)
  
  if (!allUsers || allUsers.length === 0) {
    console.log('No active users found')
    return { sent: 0, skipped: 0, reason: 'no_users' }
  }
  
  // Build user map with preferences
  const userPrefsMap = new Map((usersWithPrefs || []).map(p => [p.user_id, p]))
  
  // Filter eligible users (weekly_digest_enabled = true or not set)
  const eligibleUsers = allUsers.filter(user => {
    const prefs = userPrefsMap.get(user.id)
    return !prefs || prefs.weekly_digest_enabled !== false
  })
  
  if (eligibleUsers.length === 0) {
    console.log('No eligible users for weekly digest')
    return { sent: 0, skipped: 0, reason: 'no_eligible_users' }
  }
  
  console.log(`📅 ${eligibleUsers.length} users eligible for weekly digest`)
  
  let totalSent = 0
  let totalSkipped = 0
  const relatedDates = weeklyAppointments.map(a => a.check_date)
  
  // Prepare email data
  const emailData = {
    appointments: weeklyAppointments.map(a => ({
      check_date: a.check_date,
      day_name: a.day_name || getDayNameHebrew(a.check_date),
      times: a.times || []
    })),
    totalSlots,
    closestDate: closest.check_date,
    closestDayName,
    closestTime: closest.times?.[0] || 'N/A'
  }
  
  // Prepare push data
  const pushData = {
    type: 'weekly_summary',
    appointments_count: weeklyAppointments.length,
    total_slots: totalSlots,
    closest_date: closest.check_date
  }
  
  for (const user of eligibleUsers) {
    const prefs = userPrefsMap.get(user.id) || {
      quiet_hours_start: '22:00',
      quiet_hours_end: '07:00',
      default_notification_method: 'email'
    }
    
    // Check quiet hours
    if (isWithinQuietHours(prefs.quiet_hours_start, prefs.quiet_hours_end)) {
      totalSkipped++
      continue
    }
    
    // Check if already sent this week
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)
    
    const { data: existingLog } = await supabase
      .from('proactive_notification_log')
      .select('id')
      .eq('user_id', user.id)
      .eq('notification_type', 'weekly_summary')
      .gte('sent_at', weekStart.toISOString())
      .single()
    
    if (existingLog) {
      totalSkipped++
      continue
    }
    
    // Send notification based on user's preference
    const result = await sendNotificationToUser(
      user.id,
      user.email,
      prefs,
      title,
      body,
      emailData,
      pushData
    )
    
    if (result.success) {
      // Create in-app notification
      await createInAppNotification(user.id, title, body, {
        appointments: weeklyAppointments.map(a => ({
          date: a.check_date,
          day_name: a.day_name,
          times: a.times,
          booking_url: a.booking_url
        }))
      })
      
      // Log the notification
      await logProactiveNotification(user.id, relatedDates, result.emailSent, result.pushSent)
      
      totalSent++
    } else {
      totalSkipped++
    }
  }
  
  console.log(`📅 Weekly digest: ${totalSent} sent, ${totalSkipped} skipped`)
  return { sent: totalSent, skipped: totalSkipped }
}

// Netlify Function Handler
export default async (_req) => {
  const functionStart = Date.now()
  
  try {
    console.log('📅 WEEKLY-DIGEST: Starting execution')
    console.log(`📅 Current Israel time: ${new Date().toLocaleString('he-IL', { timeZone: ISRAEL_TIMEZONE })}`)
    
    const result = await processWeeklyDigest()
    
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

// Schedule: Every Sunday at 08:00 Israel time (05:00 UTC in winter, 06:00 UTC in summer)
// Using 06:00 UTC as a middle ground
export const config = {
  schedule: "0 6 * * 0"
}
