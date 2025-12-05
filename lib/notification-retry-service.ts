/**
 * Notification Retry Service
 * Handles retry logic with exponential backoff for failed push notifications
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 3,
  // Exponential backoff intervals in milliseconds: 1min, 5min, 15min
  backoffIntervals: [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000],
  // Maximum consecutive failures before auto-disabling subscription
  maxConsecutiveFailures: 5,
}

// Error types that should trigger immediate subscription deactivation
const PERMANENT_ERROR_CODES = [410, 404, 401]

// Error types that are retryable
const RETRYABLE_ERROR_CODES = [408, 429, 500, 502, 503, 504]

export type RetryStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled'

export interface RetryQueueEntry {
  id: string
  original_queue_id: string | null
  push_subscription_id: string
  user_id: string
  retry_count: number
  max_retries: number
  next_retry_at: string
  last_error: string | null
  payload: {
    notification: {
      title: string
      body: string
      icon?: string
      badge?: string
      tag?: string
      data?: Record<string, unknown>
    }
    badgeCount?: number
  }
  status: RetryStatus
  created_at: string
  updated_at: string
}

/**
 * Check if an error is permanent (subscription should be deactivated)
 */
export const isPermanentError = (statusCode: number): boolean => {
  return PERMANENT_ERROR_CODES.includes(statusCode)
}

/**
 * Check if an error is retryable
 */
export const isRetryableError = (statusCode: number): boolean => {
  return RETRYABLE_ERROR_CODES.includes(statusCode)
}

/**
 * Calculate the next retry time based on retry count
 */
export const calculateNextRetryTime = (retryCount: number): Date => {
  const intervalIndex = Math.min(retryCount, RETRY_CONFIG.backoffIntervals.length - 1)
  const interval = RETRY_CONFIG.backoffIntervals[intervalIndex]
  return new Date(Date.now() + interval)
}

/**
 * Add a failed notification to the retry queue
 */
export const addToRetryQueue = async (
  pushSubscriptionId: string,
  userId: string,
  payload: RetryQueueEntry['payload'],
  error: string,
  originalQueueId?: string
): Promise<{ success: boolean; retryId?: string; error?: string }> => {
  try {
    const nextRetryAt = calculateNextRetryTime(0)

    const { data, error: insertError } = await supabase
      .from('notification_retry_queue')
      .insert({
        original_queue_id: originalQueueId || null,
        push_subscription_id: pushSubscriptionId,
        user_id: userId,
        retry_count: 0,
        max_retries: RETRY_CONFIG.maxRetries,
        next_retry_at: nextRetryAt.toISOString(),
        last_error: error,
        payload,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[RetryService] Failed to add to retry queue:', insertError)
      return { success: false, error: insertError.message }
    }

    console.log(`[RetryService] Added to retry queue: ${data.id}, next retry at ${nextRetryAt.toISOString()}`)
    return { success: true, retryId: data.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('[RetryService] Error adding to retry queue:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Update retry entry after an attempt
 */
export const updateRetryEntry = async (
  retryId: string,
  success: boolean,
  error?: string
): Promise<void> => {
  try {
    if (success) {
      // Mark as successful
      await supabase
        .from('notification_retry_queue')
        .update({
          status: 'success',
          last_error: null,
        })
        .eq('id', retryId)

      console.log(`[RetryService] Retry ${retryId} succeeded`)
      return
    }

    // Get current retry entry
    const { data: entry, error: fetchError } = await supabase
      .from('notification_retry_queue')
      .select('retry_count, max_retries, push_subscription_id')
      .eq('id', retryId)
      .single()

    if (fetchError || !entry) {
      console.error('[RetryService] Failed to fetch retry entry:', fetchError)
      return
    }

    const newRetryCount = entry.retry_count + 1

    if (newRetryCount >= entry.max_retries) {
      // Max retries reached, mark as failed
      await supabase
        .from('notification_retry_queue')
        .update({
          status: 'failed',
          retry_count: newRetryCount,
          last_error: error || 'Max retries exceeded',
        })
        .eq('id', retryId)

      console.log(`[RetryService] Retry ${retryId} failed after ${newRetryCount} attempts`)

      // Increment consecutive failures on subscription
      await incrementSubscriptionFailures(entry.push_subscription_id, error || 'Max retries exceeded')
    } else {
      // Schedule next retry with exponential backoff
      const nextRetryAt = calculateNextRetryTime(newRetryCount)

      await supabase
        .from('notification_retry_queue')
        .update({
          status: 'pending',
          retry_count: newRetryCount,
          next_retry_at: nextRetryAt.toISOString(),
          last_error: error,
        })
        .eq('id', retryId)

      console.log(`[RetryService] Retry ${retryId} scheduled for ${nextRetryAt.toISOString()} (attempt ${newRetryCount + 1}/${entry.max_retries})`)
    }
  } catch (err) {
    console.error('[RetryService] Error updating retry entry:', err)
  }
}

/**
 * Get pending retries that are due for processing
 */
export const getPendingRetries = async (limit = 50): Promise<RetryQueueEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('notification_retry_queue')
      .select(`
        *,
        push_subscriptions:push_subscription_id (
          endpoint,
          p256dh,
          auth,
          is_active
        )
      `)
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())
      .order('next_retry_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('[RetryService] Failed to fetch pending retries:', error)
      return []
    }

    // Filter out entries where subscription is no longer active
    return (data || []).filter(entry => entry.push_subscriptions?.is_active)
  } catch (err) {
    console.error('[RetryService] Error fetching pending retries:', err)
    return []
  }
}

/**
 * Mark retry as processing (to prevent duplicate processing)
 */
export const markRetryAsProcessing = async (retryId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notification_retry_queue')
      .update({ status: 'processing' })
      .eq('id', retryId)
      .eq('status', 'pending') // Only update if still pending

    return !error
  } catch (err) {
    console.error('[RetryService] Error marking retry as processing:', err)
    return false
  }
}

/**
 * Increment consecutive failures on a subscription
 */
export const incrementSubscriptionFailures = async (
  subscriptionId: string,
  errorMessage: string
): Promise<void> => {
  try {
    // Get current failure count
    const { data: subscription, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('consecutive_failures')
      .eq('id', subscriptionId)
      .single()

    if (fetchError || !subscription) {
      return
    }

    const newFailureCount = (subscription.consecutive_failures || 0) + 1

    // Check if we should disable the subscription
    if (newFailureCount >= RETRY_CONFIG.maxConsecutiveFailures) {
      await supabase
        .from('push_subscriptions')
        .update({
          is_active: false,
          consecutive_failures: newFailureCount,
          last_delivery_status: 'failed',
          last_failure_reason: `Auto-disabled after ${newFailureCount} consecutive failures: ${errorMessage}`,
        })
        .eq('id', subscriptionId)

      console.log(`[RetryService] Subscription ${subscriptionId} auto-disabled after ${newFailureCount} failures`)
    } else {
      await supabase
        .from('push_subscriptions')
        .update({
          consecutive_failures: newFailureCount,
          last_delivery_status: 'failed',
          last_failure_reason: errorMessage,
        })
        .eq('id', subscriptionId)
    }
  } catch (err) {
    console.error('[RetryService] Error updating subscription failures:', err)
  }
}

/**
 * Reset consecutive failures on a subscription after successful delivery
 */
export const resetSubscriptionFailures = async (subscriptionId: string): Promise<void> => {
  try {
    await supabase
      .from('push_subscriptions')
      .update({
        consecutive_failures: 0,
        last_delivery_status: 'success',
        last_failure_reason: null,
        last_used: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
  } catch (err) {
    console.error('[RetryService] Error resetting subscription failures:', err)
  }
}

/**
 * Cancel all pending retries for a subscription (e.g., when subscription is deleted)
 */
export const cancelPendingRetries = async (subscriptionId: string): Promise<void> => {
  try {
    await supabase
      .from('notification_retry_queue')
      .update({ status: 'cancelled' })
      .eq('push_subscription_id', subscriptionId)
      .eq('status', 'pending')

    console.log(`[RetryService] Cancelled pending retries for subscription ${subscriptionId}`)
  } catch (err) {
    console.error('[RetryService] Error cancelling pending retries:', err)
  }
}

/**
 * Get retry statistics for a user
 */
export const getRetryStats = async (userId: string): Promise<{
  pending: number
  failed: number
  succeeded: number
}> => {
  try {
    const { data, error } = await supabase
      .from('notification_retry_queue')
      .select('status')
      .eq('user_id', userId)

    if (error) {
      return { pending: 0, failed: 0, succeeded: 0 }
    }

    const stats = { pending: 0, failed: 0, succeeded: 0 }
    for (const entry of data || []) {
      if (entry.status === 'pending' || entry.status === 'processing') {
        stats.pending++
      } else if (entry.status === 'failed') {
        stats.failed++
      } else if (entry.status === 'success') {
        stats.succeeded++
      }
    }

    return stats
  } catch (err) {
    console.error('[RetryService] Error getting retry stats:', err)
    return { pending: 0, failed: 0, succeeded: 0 }
  }
}

/**
 * Cleanup old retry entries (older than 7 days)
 */
export const cleanupOldRetries = async (): Promise<number> => {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 7)

    const { data, error } = await supabase
      .from('notification_retry_queue')
      .delete()
      .in('status', ['success', 'failed', 'cancelled'])
      .lt('created_at', cutoffDate.toISOString())
      .select('id')

    if (error) {
      console.error('[RetryService] Error cleaning up old retries:', error)
      return 0
    }

    const count = data?.length || 0
    if (count > 0) {
      console.log(`[RetryService] Cleaned up ${count} old retry entries`)
    }
    return count
  } catch (err) {
    console.error('[RetryService] Error cleaning up old retries:', err)
    return 0
  }
}

