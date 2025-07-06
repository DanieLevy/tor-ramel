import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Cleanup expired subscriptions
export async function cleanupExpiredSubscriptions() {
  try {
    console.log('🧹 Cleaning up expired subscriptions...')
    
    const today = new Date().toISOString().split('T')[0]
    
    // Deactivate single date subscriptions that have passed
    const { data: expiredSingle, error: singleError } = await supabase
      .from('notification_subscriptions')
      .update({ 
        is_active: false,
        completed_at: new Date().toISOString()
      })
      .eq('is_active', true)
      .not('subscription_date', 'is', null)
      .lt('subscription_date', today)
      .select()
    
    if (singleError) {
      console.error('Error deactivating expired single subscriptions:', singleError)
    } else if (expiredSingle && expiredSingle.length > 0) {
      console.log(`✅ Deactivated ${expiredSingle.length} expired single date subscriptions`)
    }
    
    // Deactivate date range subscriptions that have passed
    const { data: expiredRange, error: rangeError } = await supabase
      .from('notification_subscriptions')
      .update({ 
        is_active: false,
        completed_at: new Date().toISOString()
      })
      .eq('is_active', true)
      .not('date_range_end', 'is', null)
      .lt('date_range_end', today)
      .select()
    
    if (rangeError) {
      console.error('Error deactivating expired range subscriptions:', rangeError)
    } else if (expiredRange && expiredRange.length > 0) {
      console.log(`✅ Deactivated ${expiredRange.length} expired date range subscriptions`)
    }
    
  } catch (error) {
    console.error('Error in cleanup process:', error)
  }
}

// Cleanup old notification queue items
export async function cleanupNotificationQueue() {
  try {
    console.log('🧹 Cleaning up old notification queue items...')
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: deleted, error } = await supabase
      .from('notification_queue')
      .delete()
      .in('status', ['sent', 'failed', 'skipped'])
      .lt('created_at', sevenDaysAgo)
      .select()
    
    if (error) {
      console.error('Error cleaning notification queue:', error)
    } else if (deleted && deleted.length > 0) {
      console.log(`✅ Deleted ${deleted.length} old queue items`)
    }
    
  } catch (error) {
    console.error('Error in queue cleanup:', error)
  }
}

// Retry failed notifications
export async function retryFailedNotifications() {
  try {
    console.log('🔄 Retrying failed notifications...')
    
    // Get recent failed notifications (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: failed, error } = await supabase
      .from('notification_queue')
      .update({ 
        status: 'pending',
        error_message: null
      })
      .eq('status', 'failed')
      .gte('created_at', oneDayAgo)
      .select()
    
    if (error) {
      console.error('Error resetting failed notifications:', error)
    } else if (failed && failed.length > 0) {
      console.log(`✅ Reset ${failed.length} failed notifications for retry`)
    }
    
  } catch (error) {
    console.error('Error in retry process:', error)
  }
}

// Validate subscription data
export function validateSubscriptionData(data: any): { valid: boolean; error?: string } {
  if (!data) {
    return { valid: false, error: 'No data provided' }
  }
  
  if (data.subscription_date) {
    // Validate single date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(data.subscription_date)) {
      return { valid: false, error: 'Invalid date format' }
    }
    
    const date = new Date(data.subscription_date + 'T00:00:00')
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid date' }
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) {
      return { valid: false, error: 'Date cannot be in the past' }
    }
  } else if (data.date_range_start && data.date_range_end) {
    // Validate date range
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(data.date_range_start) || !dateRegex.test(data.date_range_end)) {
      return { valid: false, error: 'Invalid date format' }
    }
    
    const startDate = new Date(data.date_range_start + 'T00:00:00')
    const endDate = new Date(data.date_range_end + 'T00:00:00')
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { valid: false, error: 'Invalid dates' }
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (startDate < today) {
      return { valid: false, error: 'Start date cannot be in the past' }
    }
    
    if (endDate < startDate) {
      return { valid: false, error: 'End date must be after start date' }
    }
    
    // Maximum range of 30 days
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 30) {
      return { valid: false, error: 'Date range cannot exceed 30 days' }
    }
  } else {
    return { valid: false, error: 'Must provide either single date or date range' }
  }
  
  return { valid: true }
}

// Get subscription summary for user
export async function getUserSubscriptionSummary(userId: string) {
  try {
    const { data: subscriptions, error } = await supabase
      .from('notification_subscriptions')
      .select(`
        *,
        notified_appointments(
          appointment_date,
          times_array,
          notification_sent_at,
          user_response
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching user subscriptions:', error)
      return null
    }
    
    return subscriptions
  } catch (error) {
    console.error('Error getting subscription summary:', error)
    return null
  }
} 