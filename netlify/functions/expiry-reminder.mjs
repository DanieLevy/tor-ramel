import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { ISRAEL_TIMEZONE } from './shared/date-utils.mjs'
import { isWithinQuietHours } from './shared/proactive-notifications.mjs'
import { sendExpiryReminderEmail } from './shared/email-service.mjs'

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
    console.log('✅ [Expiry] VAPID keys configured successfully')
  } catch (error) {
    console.error('❌ [Expiry] Failed to configure VAPID keys:', error)
  }
} else {
  console.warn('⚠️ [Expiry] VAPID keys missing - push notifications will not work')
}

/**
 * Get subscriptions expiring today or tomorrow
 */
async function getExpiringSubscriptions() {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  
  // Get subscriptions where date_range_end is today or tomorrow
  const { data: subscriptions, error } = await supabase
    .from('notification_subscriptions')
    .select(`
      *,
      users!notification_subscriptions_user_id_fkey(id, email)
    `)
    .eq('is_active', true)
    .eq('subscription_status', 'active')
    .or(`date_range_end.eq.${todayStr},date_range_end.eq.${tomorrowStr}`)
  
  if (error) {
    console.error('Error fetching expiring subscriptions:', error)
    return []
  }
  
  return subscriptions || []
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
        tag: 'expiry-reminder',
        requireInteraction: true,
        data: {
          ...data,
          url: '/subscribe',
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
        console.error(`[Expiry] Push failed:`, pushError.message)
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
    console.error(`[Expiry] Error sending push to user ${userId}:`, error)
    return { sent: 0, failed: 1 }
  }
}

/**
 * Create in-app notification
 */
async function createInAppNotification(userId, subscriptionId, title, body, data = {}) {
  try {
    await supabase
      .from('in_app_notifications')
      .insert({
        user_id: userId,
        subscription_id: subscriptionId,
        title,
        body,
        notification_type: 'expiry_reminder',
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
async function logProactiveNotification(userId, subscriptionId, endDate, emailSent = false, pushSent = false) {
  try {
    const dedupKey = `expiry-${subscriptionId}-${endDate}`
    
    await supabase
      .from('proactive_notification_log')
      .insert({
        user_id: userId,
        notification_type: 'expiry_reminder',
        related_dates: [endDate],
        dedup_key: dedupKey,
        data: { subscription_id: subscriptionId, email_sent: emailSent },
        push_sent: pushSent,
        in_app_created: true
      })
      
  } catch (error) {
    console.error('Error logging notification:', error)
  }
}

/**
 * Get user preferences
 */
async function getUserPreferences(userId) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user preferences:', error)
  }
  
  return data || {
    expiry_reminders_enabled: true,
    default_notification_method: 'email',
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00'
  }
}

/**
 * Send notification to user based on their method preference
 */
async function sendNotificationToUser(userId, userEmail, prefs, title, body, emailData, pushData) {
  const method = prefs?.default_notification_method || 'email'
  let emailSent = false
  let pushSent = false
  
  console.log(`[Expiry] Sending to ${userEmail} via ${method}`)
  
  // Send email if method is 'email' or 'both'
  if (method === 'email' || method === 'both') {
    try {
      emailSent = await sendExpiryReminderEmail(userEmail, emailData)
      if (emailSent) {
        console.log(`✅ [Expiry] Email sent to ${userEmail}`)
      }
    } catch (error) {
      console.error(`❌ [Expiry] Email failed for ${userEmail}:`, error.message)
    }
  }
  
  // Send push if method is 'push' or 'both'
  if (method === 'push' || method === 'both') {
    const pushResult = await sendPushToUser(userId, title, body, pushData)
    pushSent = pushResult.sent > 0
    if (pushSent) {
      console.log(`✅ [Expiry] Push sent to ${userEmail}`)
    }
  }
  
  // Return true if at least one notification was sent based on preference
  const success = (method === 'email' && emailSent) ||
                  (method === 'push' && pushSent) ||
                  (method === 'both' && (emailSent || pushSent))
  
  return { success, emailSent, pushSent }
}

/**
 * Process expiry reminders
 */
async function processExpiryReminders() {
  console.log('⏰ Processing expiry reminders...')
  
  const expiringSubscriptions = await getExpiringSubscriptions()
  
  if (expiringSubscriptions.length === 0) {
    console.log('No expiring subscriptions found')
    return { sent: 0, skipped: 0, reason: 'no_expiring' }
  }
  
  console.log(`⏰ Found ${expiringSubscriptions.length} expiring subscriptions`)
  
  const today = new Date().toISOString().split('T')[0]
  
  let totalSent = 0
  let totalSkipped = 0
  
  for (const subscription of expiringSubscriptions) {
    const userId = subscription.user_id
    const userEmail = subscription.users?.email
    const endDate = subscription.date_range_end
    const isToday = endDate === today
    
    if (!userEmail) {
      console.log(`[Expiry] No email found for user ${userId}`)
      totalSkipped++
      continue
    }
    
    // Get user preferences
    const prefs = await getUserPreferences(userId)
    
    // Check if user opted out
    if (prefs.expiry_reminders_enabled === false) {
      totalSkipped++
      continue
    }
    
    // Check quiet hours
    if (isWithinQuietHours(prefs.quiet_hours_start, prefs.quiet_hours_end)) {
      totalSkipped++
      continue
    }
    
    // Check if already notified
    const dedupKey = `expiry-${subscription.id}-${endDate}`
    const { data: existingLog } = await supabase
      .from('proactive_notification_log')
      .select('id')
      .eq('dedup_key', dedupKey)
      .single()
    
    if (existingLog) {
      totalSkipped++
      continue
    }
    
    // Format date range for display
    const startDate = new Date(subscription.date_range_start + 'T00:00:00')
    const endDateObj = new Date(endDate + 'T00:00:00')
    const dateRange = `${startDate.toLocaleDateString('he-IL')} - ${endDateObj.toLocaleDateString('he-IL')}`
    
    // Build notification content
    const title = '⏰ ההתראה שלך מסתיימת בקרוב'
    const body = isToday 
      ? `החיפוש עבור ${dateRange} מסתיים היום. רוצה להאריך?`
      : `החיפוש עבור ${dateRange} מסתיים מחר. לחץ להארכה`
    
    // Prepare email data
    const emailData = {
      subscriptionDateRange: dateRange,
      daysRemaining: isToday ? 0 : 1,
      subscriptionId: subscription.id
    }
    
    // Prepare push data
    const pushData = {
      type: 'expiry_reminder',
      subscription_id: subscription.id,
      end_date: endDate,
      is_today: isToday
    }
    
    // Send notification based on user's preference
    const result = await sendNotificationToUser(
      userId,
      userEmail,
      prefs,
      title,
      body,
      emailData,
      pushData
    )
    
    if (result.success) {
      // Create in-app notification
      await createInAppNotification(userId, subscription.id, title, body, {
        subscription_id: subscription.id,
        date_range_start: subscription.date_range_start,
        date_range_end: endDate
      })
      
      // Log the notification
      await logProactiveNotification(userId, subscription.id, endDate, result.emailSent, result.pushSent)
      
      totalSent++
    } else {
      totalSkipped++
    }
  }
  
  console.log(`⏰ Expiry reminders: ${totalSent} sent, ${totalSkipped} skipped`)
  return { sent: totalSent, skipped: totalSkipped }
}

// Netlify Function Handler
export default async (_req) => {
  const functionStart = Date.now()
  
  try {
    console.log('⏰ EXPIRY-REMINDER: Starting execution')
    console.log(`📅 Current Israel time: ${new Date().toLocaleString('he-IL', { timeZone: ISRAEL_TIMEZONE })}`)
    
    const result = await processExpiryReminders()
    
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

// Schedule: Daily at 09:00 Israel time (06:00 UTC in winter, 07:00 UTC in summer)
// Using 07:00 UTC
export const config = {
  schedule: "0 7 * * *"
}
