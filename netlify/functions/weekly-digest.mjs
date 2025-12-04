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
async function logProactiveNotification(userId, relatedDates) {
  try {
    const dedupKey = `weekly-${new Date().toISOString().split('T')[0]}`
    
    await supabase
      .from('proactive_notification_log')
      .insert({
        user_id: userId,
        notification_type: 'weekly_summary',
        related_dates: relatedDates,
        dedup_key: dedupKey,
        push_sent: true,
        in_app_created: true
      })
      
  } catch (error) {
    console.error('Error logging notification:', error)
  }
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
  
  // Get users who opted in to weekly digest
  const { data: eligibleUsers, error } = await supabase
    .from('user_preferences')
    .select('user_id, quiet_hours_start, quiet_hours_end')
    .eq('weekly_digest_enabled', true)
  
  if (error) {
    console.error('Error fetching eligible users:', error)
    return { sent: 0, skipped: 0, reason: 'db_error' }
  }
  
  // Also include users without preferences (default is enabled)
  const { data: allUsers } = await supabase
    .from('users')
    .select('id')
    .eq('is_active', true)
  
  const usersWithPrefs = new Set((eligibleUsers || []).map(u => u.user_id))
  const usersWithoutPrefs = (allUsers || []).filter(u => !usersWithPrefs.has(u.id))
  
  // Combine: users with weekly_digest_enabled + users without preferences
  const allEligibleUsers = [
    ...(eligibleUsers || []),
    ...usersWithoutPrefs.map(u => ({ 
      user_id: u.id, 
      quiet_hours_start: '22:00', 
      quiet_hours_end: '07:00' 
    }))
  ]
  
  if (allEligibleUsers.length === 0) {
    console.log('No eligible users for weekly digest')
    return { sent: 0, skipped: 0, reason: 'no_users' }
  }
  
  console.log(`📅 ${allEligibleUsers.length} users eligible for weekly digest`)
  
  let totalSent = 0
  let totalSkipped = 0
  const relatedDates = weeklyAppointments.map(a => a.check_date)
  
  for (const userPref of allEligibleUsers) {
    const userId = userPref.user_id
    
    // Check quiet hours
    if (isWithinQuietHours(userPref.quiet_hours_start, userPref.quiet_hours_end)) {
      totalSkipped++
      continue
    }
    
    // Check if already sent this week
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)
    
    const { data: existingLog } = await supabase
      .from('proactive_notification_log')
      .select('id')
      .eq('user_id', userId)
      .eq('notification_type', 'weekly_summary')
      .gte('sent_at', weekStart.toISOString())
      .single()
    
    if (existingLog) {
      totalSkipped++
      continue
    }
    
    // Send push notification
    const pushResult = await sendPushToUser(userId, title, body, {
      type: 'weekly_summary',
      appointments_count: weeklyAppointments.length,
      total_slots: totalSlots,
      closest_date: closest.check_date
    })
    
    if (pushResult.sent > 0) {
      // Create in-app notification
      await createInAppNotification(userId, title, body, {
        appointments: weeklyAppointments.map(a => ({
          date: a.check_date,
          day_name: a.day_name,
          times: a.times,
          booking_url: a.booking_url
        }))
      })
      
      // Log the notification
      await logProactiveNotification(userId, relatedDates)
      
      totalSent++
    }
  }
  
  console.log(`📅 Weekly digest: ${totalSent} sent, ${totalSkipped} skipped`)
  return { sent: totalSent, skipped: totalSkipped }
}

// Netlify Function Handler
export default async (req) => {
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



