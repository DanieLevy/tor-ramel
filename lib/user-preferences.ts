/**
 * User Preferences Helper
 * Ensures user preferences are always created and provides helper functions
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

// Default preferences for new users
const DEFAULT_PREFERENCES = {
  hot_alerts_enabled: true,
  proactive_notifications_enabled: true,
  weekly_digest_enabled: false,
  expiry_reminders_enabled: true,
  inactivity_alerts_enabled: true,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  notification_cooldown_hours: 4,
}

export interface UserPreferences {
  user_id: string
  hot_alerts_enabled: boolean
  proactive_notifications_enabled: boolean
  weekly_digest_enabled: boolean
  expiry_reminders_enabled: boolean
  inactivity_alerts_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  notification_cooldown_hours: number
  last_proactive_notification_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Ensure user preferences exist for a user
 * Creates default preferences if they don't exist
 */
export const ensureUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
  try {
    if (!userId) {
      console.error('[UserPrefs] Invalid userId provided')
      return null
    }

    // Check if preferences exist
    const { data: existing, error: fetchError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (existing) {
      return existing as UserPreferences
    }

    // Create default preferences
    console.log(`[UserPrefs] Creating default preferences for user ${userId}`)
    
    const { data: created, error: createError } = await supabase
      .from('user_preferences')
      .insert({
        user_id: userId,
        ...DEFAULT_PREFERENCES,
      })
      .select()
      .single()

    if (createError) {
      // Handle race condition - preferences might have been created by another request
      if (createError.code === '23505') {
        console.log(`[UserPrefs] Preferences already exist for user ${userId} (race condition)`)
        const { data: refetched } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .single()
        return refetched as UserPreferences
      }
      
      console.error('[UserPrefs] Failed to create preferences:', createError)
      return null
    }

    console.log(`[UserPrefs] Created preferences for user ${userId}`)
    return created as UserPreferences
  } catch (error) {
    console.error('[UserPrefs] Error ensuring preferences:', error)
    return null
  }
}

/**
 * Get user preferences, creating defaults if they don't exist
 */
export const getUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
  return ensureUserPreferences(userId)
}

/**
 * Update user preferences
 */
export const updateUserPreferences = async (
  userId: string,
  updates: Partial<Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserPreferences | null> => {
  try {
    // Ensure preferences exist first
    await ensureUserPreferences(userId)

    const { data, error } = await supabase
      .from('user_preferences')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('[UserPrefs] Failed to update preferences:', error)
      return null
    }

    console.log(`[UserPrefs] Updated preferences for user ${userId}`)
    return data as UserPreferences
  } catch (error) {
    console.error('[UserPrefs] Error updating preferences:', error)
    return null
  }
}

/**
 * Toggle a specific preference
 */
export const togglePreference = async (
  userId: string,
  preference: keyof Pick<UserPreferences, 
    'hot_alerts_enabled' | 
    'proactive_notifications_enabled' | 
    'weekly_digest_enabled' | 
    'expiry_reminders_enabled' | 
    'inactivity_alerts_enabled'
  >
): Promise<boolean | null> => {
  try {
    const prefs = await ensureUserPreferences(userId)
    if (!prefs) return null

    const currentValue = prefs[preference]
    const newValue = !currentValue

    await supabase
      .from('user_preferences')
      .update({ 
        [preference]: newValue,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    console.log(`[UserPrefs] Toggled ${preference} to ${newValue} for user ${userId}`)
    return newValue
  } catch (error) {
    console.error('[UserPrefs] Error toggling preference:', error)
    return null
  }
}

/**
 * Set quiet hours
 */
export const setQuietHours = async (
  userId: string,
  start: string | null,
  end: string | null
): Promise<boolean> => {
  try {
    await ensureUserPreferences(userId)

    const { error } = await supabase
      .from('user_preferences')
      .update({
        quiet_hours_start: start,
        quiet_hours_end: end,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (error) {
      console.error('[UserPrefs] Failed to set quiet hours:', error)
      return false
    }

    console.log(`[UserPrefs] Set quiet hours ${start}-${end} for user ${userId}`)
    return true
  } catch (error) {
    console.error('[UserPrefs] Error setting quiet hours:', error)
    return false
  }
}

/**
 * Update notification cooldown
 */
export const setNotificationCooldown = async (
  userId: string,
  hours: number
): Promise<boolean> => {
  try {
    await ensureUserPreferences(userId)

    const { error } = await supabase
      .from('user_preferences')
      .update({
        notification_cooldown_hours: hours,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (error) {
      console.error('[UserPrefs] Failed to set cooldown:', error)
      return false
    }

    console.log(`[UserPrefs] Set cooldown to ${hours}h for user ${userId}`)
    return true
  } catch (error) {
    console.error('[UserPrefs] Error setting cooldown:', error)
    return false
  }
}

/**
 * Record when user received a proactive notification
 */
export const recordProactiveNotification = async (userId: string): Promise<void> => {
  try {
    await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        last_proactive_notification_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
  } catch (error) {
    console.error('[UserPrefs] Error recording proactive notification:', error)
  }
}

/**
 * Check if user is eligible for proactive notification (respects cooldown)
 */
export const canReceiveProactiveNotification = async (
  userId: string,
  type: 'hot_alert' | 'opportunity' | 'weekly_summary' | 'expiry_reminder' | 'inactivity'
): Promise<boolean> => {
  try {
    const prefs = await ensureUserPreferences(userId)
    if (!prefs) return false

    // Check if the specific notification type is enabled
    switch (type) {
      case 'hot_alert':
        if (!prefs.hot_alerts_enabled) return false
        break
      case 'opportunity':
        if (!prefs.proactive_notifications_enabled) return false
        break
      case 'weekly_summary':
        if (!prefs.weekly_digest_enabled) return false
        break
      case 'expiry_reminder':
        if (!prefs.expiry_reminders_enabled) return false
        break
      case 'inactivity':
        if (!prefs.inactivity_alerts_enabled) return false
        break
    }

    // Check cooldown
    if (prefs.last_proactive_notification_at) {
      const lastNotif = new Date(prefs.last_proactive_notification_at)
      const cooldownMs = (prefs.notification_cooldown_hours || 4) * 60 * 60 * 1000
      const timeSince = Date.now() - lastNotif.getTime()

      if (timeSince < cooldownMs) {
        console.log(`[UserPrefs] User ${userId} in cooldown (${Math.round(timeSince / 60000)}min < ${prefs.notification_cooldown_hours}h)`)
        return false
      }
    }

    // Check quiet hours (using Israel timezone)
    if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
      const now = new Date()
      const israelTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jerusalem',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now)

      const start = prefs.quiet_hours_start
      const end = prefs.quiet_hours_end

      // Handle overnight quiet hours (e.g., 22:00 to 07:00)
      let inQuietHours = false
      if (start > end) {
        inQuietHours = israelTime >= start || israelTime <= end
      } else {
        inQuietHours = israelTime >= start && israelTime <= end
      }

      if (inQuietHours) {
        console.log(`[UserPrefs] User ${userId} in quiet hours (${israelTime} is between ${start}-${end})`)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('[UserPrefs] Error checking notification eligibility:', error)
    return false // Default to false on error to prevent spam
  }
}

