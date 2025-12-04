import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { ISRAEL_TIMEZONE, getDayNameHebrew } from './date-utils.mjs'

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
 * Check if current time is within quiet hours for a user
 */
export function isWithinQuietHours(quietHoursStart, quietHoursEnd) {
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
  
  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (quietHoursStart > quietHoursEnd) {
    return currentTime >= quietHoursStart || currentTime <= quietHoursEnd
  }
  
  return currentTime >= quietHoursStart && currentTime <= quietHoursEnd
}

/**
 * Calculate days until a date
 */
export function getDaysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const targetDate = new Date(dateStr + 'T00:00:00')
  const diffTime = targetDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * Send a push notification to a user
 */
async function sendPushToUser(userId, title, body, data = {}) {
  try {
    // Get user's push subscriptions
    const { data: pushSubs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
    
    if (error || !pushSubs || pushSubs.length === 0) {
      console.log(`No active push subscriptions for user ${userId}`)
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
        
        // Update last_used
        await supabase
          .from('push_subscriptions')
          .update({ last_used: new Date().toISOString() })
          .eq('id', sub.id)
          
      } catch (pushError) {
        console.error(`Push failed for subscription ${sub.id}:`, pushError.message)
        failed++
        
        // If subscription is invalid, deactivate it
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
 * Create an in-app notification
 */
async function createInAppNotification(userId, title, body, notificationType, data = {}) {
  try {
    const { error } = await supabase
      .from('in_app_notifications')
      .insert({
        user_id: userId,
        title,
        body,
        notification_type: notificationType,
        data,
        is_read: false
      })
    
    if (error) {
      console.error('Error creating in-app notification:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error creating in-app notification:', error)
    return false
  }
}

/**
 * Log a proactive notification to prevent duplicates
 */
async function logProactiveNotification(userId, notificationType, relatedDates, data = {}) {
  try {
    const dedupKey = `${userId}-${notificationType}-${relatedDates.sort().join(',')}`
    
    const { error } = await supabase
      .from('proactive_notification_log')
      .insert({
        user_id: userId,
        notification_type: notificationType,
        related_dates: relatedDates,
        data,
        dedup_key: dedupKey,
        push_sent: true,
        in_app_created: true
      })
    
    if (error) {
      console.error('Error logging proactive notification:', error)
    }
    
    // Update user's last proactive notification time
    await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        last_proactive_notification_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      
  } catch (error) {
    console.error('Error logging proactive notification:', error)
  }
}

/**
 * Check if user is eligible for proactive notification
 */
async function isEligibleForProactive(userId, notificationType, cooldownHours = 4) {
  try {
    // Check user preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    // Check if user has opted out
    if (prefs) {
      if (notificationType === 'hot_alert' && !prefs.hot_alerts_enabled) return false
      if (notificationType === 'opportunity' && !prefs.proactive_notifications_enabled) return false
      if (notificationType === 'weekly_summary' && !prefs.weekly_digest_enabled) return false
      if (notificationType === 'expiry_reminder' && !prefs.expiry_reminders_enabled) return false
      if (notificationType === 'inactivity' && !prefs.inactivity_alerts_enabled) return false
      
      // Check quiet hours
      if (isWithinQuietHours(prefs.quiet_hours_start, prefs.quiet_hours_end)) {
        console.log(`User ${userId} is in quiet hours`)
        return false
      }
      
      // Check cooldown
      if (prefs.last_proactive_notification_at) {
        const lastNotif = new Date(prefs.last_proactive_notification_at)
        const hoursSince = (Date.now() - lastNotif.getTime()) / (1000 * 60 * 60)
        const userCooldown = prefs.notification_cooldown_hours || cooldownHours
        
        if (hoursSince < userCooldown) {
          console.log(`User ${userId} in cooldown (${hoursSince.toFixed(1)}h < ${userCooldown}h)`)
          return false
        }
      }
    }
    
    return true
    
  } catch (error) {
    console.error('Error checking eligibility:', error)
    return true // Default to eligible on error
  }
}

/**
 * HOT ALERTS: Send urgent notifications for appointments within 1-3 days
 */
export async function processHotAlerts(availableAppointments) {
  console.log('🔥 Processing hot alerts...')
  
  // Filter for appointments within 1-3 days
  const hotAppointments = availableAppointments.filter(apt => {
    const daysUntil = getDaysUntil(apt.date)
    return daysUntil >= 0 && daysUntil <= 3 && apt.times && apt.times.length > 0
  })
  
  if (hotAppointments.length === 0) {
    console.log('No hot appointments found')
    return { sent: 0, skipped: 0 }
  }
  
  console.log(`🔥 Found ${hotAppointments.length} hot appointments`)
  
  // Get all users with push subscriptions and hot_alerts_enabled
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('is_active', true)
  
  if (error || !users) {
    console.error('Error fetching users:', error)
    return { sent: 0, skipped: 0 }
  }
  
  let totalSent = 0
  let totalSkipped = 0
  
  // Get the hottest (closest) appointment
  const hottestApt = hotAppointments.reduce((closest, apt) => {
    const days = getDaysUntil(apt.date)
    const closestDays = getDaysUntil(closest.date)
    return days < closestDays ? apt : closest
  }, hotAppointments[0])
  
  const daysUntil = getDaysUntil(hottestApt.date)
  const dayName = getDayNameHebrew(hottestApt.date)
  
  // Build notification content
  let title, body
  if (daysUntil === 0) {
    title = '🔥 תור היום!'
    body = `הזדמנות נדירה! תור פנוי היום בשעה ${hottestApt.times[0]} - לחץ להזמנה מיידית`
  } else if (daysUntil === 1) {
    title = '🔥 תור מחר!'
    body = `תור פנוי מחר (${dayName}) בשעה ${hottestApt.times[0]} - הזדמנות אחרונה!`
  } else {
    title = `🔥 תור חם! עוד ${daysUntil} ימים`
    body = `תור פנוי ב${dayName} בשעה ${hottestApt.times[0]} - כדאי למהר!`
  }
  
  const relatedDates = [hottestApt.date]
  
  for (const user of users) {
    // Check if already notified about this specific hot appointment
    const { data: existingLog } = await supabase
      .from('proactive_notification_log')
      .select('id')
      .eq('user_id', user.id)
      .eq('notification_type', 'hot_alert')
      .contains('related_dates', relatedDates)
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single()
    
    if (existingLog) {
      totalSkipped++
      continue
    }
    
    // Check eligibility
    const eligible = await isEligibleForProactive(user.id, 'hot_alert')
    if (!eligible) {
      totalSkipped++
      continue
    }
    
    // Send push notification
    const pushResult = await sendPushToUser(user.id, title, body, {
      type: 'hot_alert',
      appointment_date: hottestApt.date,
      times: hottestApt.times
    })
    
    if (pushResult.sent > 0) {
      // Create in-app notification
      await createInAppNotification(user.id, title, body, 'hot_alert', {
        appointment_date: hottestApt.date,
        times: hottestApt.times,
        booking_url: hottestApt.booking_url
      })
      
      // Log the notification
      await logProactiveNotification(user.id, 'hot_alert', relatedDates, {
        appointment_date: hottestApt.date,
        times: hottestApt.times
      })
      
      totalSent++
    }
  }
  
  console.log(`🔥 Hot alerts: ${totalSent} sent, ${totalSkipped} skipped`)
  return { sent: totalSent, skipped: totalSkipped }
}

/**
 * OPPORTUNITY DISCOVERY: Notify users without active subscriptions about available appointments
 */
export async function processOpportunityDiscovery(availableAppointments) {
  console.log('💡 Processing opportunity discovery...')
  
  // Filter for appointments within next 7 days
  const upcomingAppointments = availableAppointments.filter(apt => {
    const daysUntil = getDaysUntil(apt.date)
    return daysUntil >= 0 && daysUntil <= 7 && apt.times && apt.times.length > 0
  })
  
  if (upcomingAppointments.length === 0) {
    console.log('No upcoming appointments for opportunity discovery')
    return { sent: 0, skipped: 0 }
  }
  
  console.log(`💡 Found ${upcomingAppointments.length} upcoming appointments`)
  
  // Get users WITHOUT active subscriptions
  const { data: usersWithSubs } = await supabase
    .from('notification_subscriptions')
    .select('user_id')
    .eq('is_active', true)
    .eq('subscription_status', 'active')
  
  const userIdsWithSubs = new Set((usersWithSubs || []).map(s => s.user_id))
  
  // Get all active users
  const { data: allUsers, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('is_active', true)
  
  if (error || !allUsers) {
    console.error('Error fetching users:', error)
    return { sent: 0, skipped: 0 }
  }
  
  // Filter to users without active subscriptions
  const usersWithoutSubs = allUsers.filter(u => !userIdsWithSubs.has(u.id))
  
  if (usersWithoutSubs.length === 0) {
    console.log('All users have active subscriptions')
    return { sent: 0, skipped: 0 }
  }
  
  console.log(`💡 ${usersWithoutSubs.length} users without active subscriptions`)
  
  let totalSent = 0
  let totalSkipped = 0
  
  // Get the best (closest) appointment
  const bestApt = upcomingAppointments.reduce((closest, apt) => {
    const days = getDaysUntil(apt.date)
    const closestDays = getDaysUntil(closest.date)
    return days < closestDays ? apt : closest
  }, upcomingAppointments[0])
  
  const daysUntil = getDaysUntil(bestApt.date)
  const dayName = getDayNameHebrew(bestApt.date)
  
  // Build notification content
  const title = '💡 מצאנו תור בשבילך!'
  let body
  if (daysUntil === 0) {
    body = `יש תור פנוי היום בשעה ${bestApt.times[0]} - לחץ להזמנה`
  } else if (daysUntil === 1) {
    body = `יש תור פנוי מחר (${dayName}) בשעה ${bestApt.times[0]}`
  } else {
    body = `יש תור פנוי ב${dayName} הבא בשעה ${bestApt.times[0]}`
  }
  
  const relatedDates = upcomingAppointments.map(a => a.date)
  
  for (const user of usersWithoutSubs) {
    // Check if already notified about opportunity recently
    const { data: existingLog } = await supabase
      .from('proactive_notification_log')
      .select('id')
      .eq('user_id', user.id)
      .eq('notification_type', 'opportunity')
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single()
    
    if (existingLog) {
      totalSkipped++
      continue
    }
    
    // Check eligibility
    const eligible = await isEligibleForProactive(user.id, 'opportunity')
    if (!eligible) {
      totalSkipped++
      continue
    }
    
    // Send push notification
    const pushResult = await sendPushToUser(user.id, title, body, {
      type: 'opportunity',
      appointment_date: bestApt.date,
      times: bestApt.times
    })
    
    if (pushResult.sent > 0) {
      // Create in-app notification
      await createInAppNotification(user.id, title, body, 'proactive', {
        appointment_date: bestApt.date,
        times: bestApt.times,
        booking_url: bestApt.booking_url,
        available_count: upcomingAppointments.length
      })
      
      // Log the notification
      await logProactiveNotification(user.id, 'opportunity', [bestApt.date], {
        appointment_date: bestApt.date,
        times: bestApt.times,
        available_count: upcomingAppointments.length
      })
      
      totalSent++
    }
  }
  
  console.log(`💡 Opportunity discovery: ${totalSent} sent, ${totalSkipped} skipped`)
  return { sent: totalSent, skipped: totalSkipped }
}



