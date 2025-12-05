import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { ISRAEL_TIMEZONE, getDayNameHebrew } from './date-utils.mjs'
import { sendHotAlertEmail, sendOpportunityEmail } from './email-service.mjs'
import { buildHotAlertPayload, buildOpportunityPayload } from './push-payload-builder.mjs'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Configure web push - use NEXT_PUBLIC_VAPID_PUBLIC_KEY for consistency across the app
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@tor-ramel.netlify.app'

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)
    console.log('✅ [Proactive] VAPID keys configured successfully')
  } catch (error) {
    console.error('❌ [Proactive] Failed to configure VAPID keys:', error)
  }
} else {
  console.warn('⚠️ [Proactive] VAPID keys missing - push notifications will not work')
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
 * Get user's notification preferences
 */
async function getUserPreferences(userId) {
  const { data: prefs, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    console.error(`[Proactive] Error fetching user preferences for ${userId}:`, error)
  }
  
  // Return defaults if no preferences found
  // IMPORTANT: quiet_hours should be null by default - users must explicitly set them
  return prefs || {
    default_notification_method: 'email',
    hot_alerts_enabled: true,
    weekly_digest_enabled: true,
    expiry_reminders_enabled: true,
    inactivity_alerts_enabled: true,
    proactive_notifications_enabled: true,
    quiet_hours_start: null, // No default quiet hours - user must set explicitly
    quiet_hours_end: null,   // No default quiet hours - user must set explicitly
    notification_cooldown_hours: 4
  }
}

/**
 * Send a push notification to a user with pre-built payload
 */
async function sendPushToUser(userId, payload) {
  try {
    // Get user's push subscriptions
    const { data: pushSubs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
    
    if (error || !pushSubs || pushSubs.length === 0) {
      console.log(`[Proactive] No active push subscriptions for user ${userId}`)
      return { sent: 0, failed: 0 }
    }
    
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
        console.error(`[Proactive] Push failed for subscription ${sub.id}:`, pushError.message)
        failed++
        
        // Update failure status
        const { data: currentSub } = await supabase
          .from('push_subscriptions')
          .select('consecutive_failures')
          .eq('id', sub.id)
          .single()
        
        const newFailureCount = (currentSub?.consecutive_failures || 0) + 1
        
        // If subscription is invalid or too many failures, deactivate it
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
          console.log(`[Proactive] Deactivated subscription ${sub.id} after ${newFailureCount} failures`)
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
    console.error(`[Proactive] Error sending push to user ${userId}:`, error)
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
async function logProactiveNotification(userId, notificationType, relatedDates, data = {}, emailSent = false, pushSent = false) {
  try {
    const dedupKey = `${userId}-${notificationType}-${relatedDates.sort().join(',')}`
    
    const { error } = await supabase
      .from('proactive_notification_log')
      .insert({
        user_id: userId,
        notification_type: notificationType,
        related_dates: relatedDates,
        data: { ...data, email_sent: emailSent },
        dedup_key: dedupKey,
        push_sent: pushSent,
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
async function isEligibleForProactive(userId, notificationType, prefs = null) {
  try {
    // Get preferences if not passed
    if (!prefs) {
      prefs = await getUserPreferences(userId)
    }
    
    // Check if user has opted out
    if (prefs) {
      if (notificationType === 'hot_alert' && prefs.hot_alerts_enabled === false) return { eligible: false, prefs }
      if (notificationType === 'opportunity' && prefs.proactive_notifications_enabled === false) return { eligible: false, prefs }
      if (notificationType === 'weekly_summary' && prefs.weekly_digest_enabled === false) return { eligible: false, prefs }
      if (notificationType === 'expiry_reminder' && prefs.expiry_reminders_enabled === false) return { eligible: false, prefs }
      if (notificationType === 'inactivity' && prefs.inactivity_alerts_enabled === false) return { eligible: false, prefs }
      
      // Check quiet hours
      if (isWithinQuietHours(prefs.quiet_hours_start, prefs.quiet_hours_end)) {
        console.log(`User ${userId} is in quiet hours`)
        return { eligible: false, prefs }
      }
      
      // Check cooldown
      if (prefs.last_proactive_notification_at) {
        const lastNotif = new Date(prefs.last_proactive_notification_at)
        const hoursSince = (Date.now() - lastNotif.getTime()) / (1000 * 60 * 60)
        const userCooldown = prefs.notification_cooldown_hours || 4
        
        if (hoursSince < userCooldown) {
          console.log(`User ${userId} in cooldown (${hoursSince.toFixed(1)}h < ${userCooldown}h)`)
          return { eligible: false, prefs }
        }
      }
    }
    
    return { eligible: true, prefs }
    
  } catch (error) {
    console.error('Error checking eligibility:', error)
    return { eligible: true, prefs: null } // Default to eligible on error
  }
}

/**
 * Send notification to user based on their method preference
 */
async function sendNotificationToUser(userId, userEmail, prefs, notificationType, emailData, pushPayload) {
  const method = prefs?.default_notification_method || 'email'
  let emailSent = false
  let pushSent = false
  
  console.log(`[Proactive] Sending ${notificationType} to ${userEmail} via ${method}`)
  
  // Send email if method is 'email' or 'both'
  if (method === 'email' || method === 'both') {
    try {
      if (notificationType === 'hot_alert') {
        emailSent = await sendHotAlertEmail(userEmail, emailData)
      } else if (notificationType === 'opportunity') {
        emailSent = await sendOpportunityEmail(userEmail, emailData)
      }
      
      if (emailSent) {
        console.log(`✅ [Proactive] Email sent to ${userEmail}`)
      }
    } catch (error) {
      console.error(`❌ [Proactive] Email failed for ${userEmail}:`, error.message)
    }
  }
  
  // Send push if method is 'push' or 'both'
  if (method === 'push' || method === 'both') {
    const pushResult = await sendPushToUser(userId, pushPayload)
    pushSent = pushResult.sent > 0
    
    if (pushSent) {
      console.log(`✅ [Proactive] Push sent to ${userEmail}`)
    }
  }
  
  // Return true if at least one notification was sent based on preference
  const success = (method === 'email' && emailSent) ||
                  (method === 'push' && pushSent) ||
                  (method === 'both' && (emailSent || pushSent))
  
  return { success, emailSent, pushSent }
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
  
  // Get all active users
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
    
    // Check eligibility and get preferences
    const { eligible, prefs } = await isEligibleForProactive(user.id, 'hot_alert')
    if (!eligible) {
      totalSkipped++
      continue
    }
    
    // Prepare email data
    const emailData = {
      date: hottestApt.date,
      dayName,
      times: hottestApt.times,
      daysUntil,
      bookingUrl: hottestApt.booking_url
    }
    
    // Build optimized push payload using centralized builder
    const pushPayload = buildHotAlertPayload({
      date: hottestApt.date,
      dayName,
      daysUntil,
      timesCount: hottestApt.times.length,
      bookingUrl: hottestApt.booking_url
    })
    
    // Send notification based on user's preference
    const result = await sendNotificationToUser(
      user.id, 
      user.email, 
      prefs, 
      'hot_alert', 
      emailData, 
      pushPayload
    )
    
    if (result.success) {
      // Build in-app notification content
      let inAppTitle, inAppBody
      if (daysUntil === 0) {
        inAppTitle = 'תור היום!'
        inAppBody = `${hottestApt.times.length} שעות פנויות - הזדמנות אחרונה!`
      } else if (daysUntil === 1) {
        inAppTitle = 'תור מחר!'
        inAppBody = `${dayName} - ${hottestApt.times.length} שעות פנויות`
      } else {
        inAppTitle = `תור חם ב${dayName}`
        inAppBody = `עוד ${daysUntil} ימים - ${hottestApt.times.length} שעות`
      }
      
      // Create in-app notification
      await createInAppNotification(user.id, inAppTitle, inAppBody, 'hot_alert', {
        appointment_date: hottestApt.date,
        times: hottestApt.times,
        booking_url: hottestApt.booking_url
      })
      
      // Log the notification
      await logProactiveNotification(user.id, 'hot_alert', relatedDates, {
        appointment_date: hottestApt.date,
        times: hottestApt.times
      }, result.emailSent, result.pushSent)
      
      totalSent++
    } else {
      totalSkipped++
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
  
  // Calculate total slots
  const totalSlots = upcomingAppointments.reduce((sum, apt) => sum + (apt.times?.length || 0), 0)
  
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
    
    // Check eligibility and get preferences
    const { eligible, prefs } = await isEligibleForProactive(user.id, 'opportunity')
    if (!eligible) {
      totalSkipped++
      continue
    }
    
    // Prepare email data
    const emailData = {
      appointments: upcomingAppointments.map(apt => ({
        date: apt.date,
        dayName: getDayNameHebrew(apt.date),
        times: apt.times,
        booking_url: apt.booking_url
      })),
      totalSlots
    }
    
    // Build optimized push payload using centralized builder
    const pushPayload = buildOpportunityPayload({
      date: bestApt.date,
      dayName,
      timesCount: bestApt.times.length
    })
    
    // Send notification based on user's preference
    const result = await sendNotificationToUser(
      user.id, 
      user.email, 
      prefs, 
      'opportunity', 
      emailData, 
      pushPayload
    )
    
    if (result.success) {
      // Build in-app notification content
      let inAppTitle, inAppBody
      if (daysUntil === 0) {
        inAppTitle = 'מצאנו תור היום!'
        inAppBody = `${bestApt.times.length} שעות זמינות`
      } else if (daysUntil === 1) {
        inAppTitle = 'תור מחר!'
        inAppBody = `${dayName} - ${bestApt.times.length} שעות`
      } else {
        inAppTitle = `תור ב${dayName}`
        inAppBody = `${bestApt.times.length} שעות פנויות`
      }
      
      // Create in-app notification
      await createInAppNotification(user.id, inAppTitle, inAppBody, 'proactive', {
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
      }, result.emailSent, result.pushSent)
      
      totalSent++
    } else {
      totalSkipped++
    }
  }
  
  console.log(`💡 Opportunity discovery: ${totalSent} sent, ${totalSkipped} skipped`)
  return { sent: totalSent, skipped: totalSkipped }
}
