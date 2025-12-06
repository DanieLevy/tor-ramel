/**
 * Centralized Push Notification Payload Builder
 * 
 * Builds lightweight, optimized payloads that comply with Apple's 4KB limit.
 * All Hebrew content is properly formatted and concise.
 * Uses universally-supported Unicode emojis for iOS compatibility.
 * 
 * CRITICAL: Apple APNS has a hard 4KB limit. HTTP 413 errors occur when exceeded.
 * Solution: Store large data in database, send only data_id in notification.
 */

// Maximum payload size for Apple Push Notification service (4KB = 4096 bytes)
// We target 3.5KB (3584 bytes) to leave safety margin for encryption overhead
const MAX_PAYLOAD_SIZE = 3584
const ABSOLUTE_MAX_SIZE = 4096

// Payload size warning threshold (90% of target)
const WARNING_THRESHOLD = MAX_PAYLOAD_SIZE * 0.9

/**
 * Universal Emojis - Compatible with iOS 12+ (Unicode 11.0+)
 * These emojis are guaranteed to render correctly across all iOS devices.
 * Using older Unicode versions ensures maximum compatibility.
 */
const EMOJIS = {
  // Status & Actions (Unicode 6.0 - iOS 5+)
  NEW: '🆕',           // New indicator - Unicode 6.0
  CALENDAR: '📅',     // Calendar - Unicode 6.0
  CLOCK: '⏰',        // Alarm clock - Unicode 6.0
  FIRE: '🔥',         // Fire/Hot - Unicode 6.0
  SPARKLES: '✨',     // Sparkles/New - Unicode 6.0
  TADA: '🎉',         // Party/Celebration - Unicode 6.0
  STAR: '⭐',        // Star - Unicode 5.1
  
  // Urgency & Attention (Unicode 6.0 - iOS 5+)
  HOURGLASS: '⏳',   // Time running out - Unicode 6.0
  BELL: '🔔',        // Bell/Notification - Unicode 6.0
  WARNING: '⚠️',     // Warning sign - Unicode 4.0
  ROCKET: '🚀',      // Fast/Launch - Unicode 6.0
  
  // Success & Confirmation (Unicode 6.0 - iOS 5+)
  CHECK: '✅',       // Check mark - Unicode 6.0
  THUMBS_UP: '👍',   // Thumbs up - Unicode 6.0
  
  // Time periods (Unicode 6.0 - iOS 5+)
  SUNNY: '☀️',       // Morning/Day - Unicode 1.1
  MOON: '🌙',        // Evening/Night - Unicode 6.0
  
  // Information (Unicode 6.0 - iOS 5+)
  INFO: 'ℹ️',        // Information - Unicode 3.0
  MEMO: '📝',        // Note/List - Unicode 6.0
}

/**
 * Hebrew day names (short)
 */
const HEBREW_DAYS_SHORT = {
  0: 'א׳',
  1: 'ב׳', 
  2: 'ג׳',
  3: 'ד׳',
  4: 'ה׳',
  5: 'ו׳',
  6: 'ש׳'
}

/**
 * Get Hebrew day abbreviation
 */
function getHebrewDayShort(date) {
  const dayOfWeek = new Date(date).getDay()
  return HEBREW_DAYS_SHORT[dayOfWeek] || ''
}

/**
 * Format date for display (DD/MM)
 */
function formatDateShort(dateStr) {
  const [_year, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

/**
 * Build notification payload for available appointments
 * Optimized for Apple's 4KB limit with engaging emojis
 * ENHANCED: Uses data_id approach for large payloads to prevent HTTP 413 errors
 */
export function buildAppointmentPayload({ 
  appointments, 
  subscriptionId,
  bookingUrl,
  dataId = null  // Optional: pre-stored data ID to avoid embedding large data
}) {
  const count = appointments?.length || 0
  
  // Build concise title with NEW emoji for better engagement
  let title
  if (count === 1) {
    const apt = appointments[0]
    const dayShort = getHebrewDayShort(apt.date)
    const dateShort = formatDateShort(apt.date)
    title = `${EMOJIS.NEW} תור פנוי ${dayShort} ${dateShort}`
  } else if (count <= 3) {
    title = `${EMOJIS.NEW} ${count} תורים פנויים`
  } else {
    title = `${EMOJIS.TADA} נמצאו ${count} תורים פנויים`
  }
  
  // Build concise body with urgency indicators
  let body
  if (count === 1) {
    const apt = appointments[0]
    const timesCount = apt.newTimes?.length || apt.times?.length || 0
    body = timesCount === 1 
      ? `${EMOJIS.CLOCK} שעה אחת זמינה - הזמן עכשיו!`
      : `${EMOJIS.CALENDAR} ${timesCount} שעות זמינות`
  } else {
    // Show first 2-3 dates only
    const previewDates = appointments.slice(0, 3)
    const dateList = previewDates.map(apt => formatDateShort(apt.date)).join(', ')
    body = count > 3 
      ? `${EMOJIS.CALENDAR} ${dateList} ועוד...`
      : `${EMOJIS.CALENDAR} ${dateList}`
  }
  
  // Build URL - use data_id if provided (for large payloads), otherwise minimal inline data
  let actionUrl = `/notification-action?subscription=${subscriptionId}`
  
  if (dataId) {
    // Large payload stored in DB - just send ID (keeps payload tiny!)
    actionUrl += `&data_id=${dataId}`
  } else if (count <= 3) {
    // Small payload - safe to inline (max 3 appointments with 6 times each)
    const appointmentData = appointments.slice(0, 3).map(apt => ({
      date: apt.date,
      times: (apt.newTimes || apt.times || []).slice(0, 6)
    }))
    const compactAppts = encodeURIComponent(JSON.stringify(appointmentData))
    actionUrl += `&appointments=${compactAppts}`
  } else {
    // Medium payload - send only dates, fetch details on click
    const dates = appointments.slice(0, 10).map(apt => apt.date).join(',')
    actionUrl += `&dates=${dates}`
  }
  
  // Build lightweight data
  const data = {
    type: 'appointment',
    url: actionUrl,
    subscription_id: subscriptionId,
    cnt: count
  }
  
  // Only include data_id if present (for client to fetch full data)
  if (dataId) {
    data.data_id = dataId
  }
  
  // Only include booking URL if available (but not in URL to save space)
  if (bookingUrl) {
    data.booking_url = bookingUrl
  }
  
  // Build actions (Book Now only if we have booking URL)
  const actions = bookingUrl
    ? [
        { action: 'book', title: `${EMOJIS.CALENDAR} הזמן` },
        { action: 'view', title: 'פרטים' }
      ]
    : [
        { action: 'view', title: 'צפה' }
      ]
  
  return buildPayload({ 
    title, 
    body, 
    tag: 'appointment', 
    actions, 
    data,
    metadata: { count, has_data_id: !!dataId }
  })
}

/**
 * Build notification payload for hot alerts (urgent appointments)
 * Uses FIRE emoji for urgent, attention-grabbing notifications
 */
export function buildHotAlertPayload({ 
  date, 
  dayName, 
  daysUntil, 
  timesCount,
  times,
  bookingUrl,
  subscriptionId
}) {
  const dateShort = formatDateShort(date)
  
  // Urgent, attention-grabbing title with fire emoji
  const title = daysUntil === 0 
    ? `${EMOJIS.FIRE} היום! תור פנוי` 
    : daysUntil === 1 
      ? `${EMOJIS.FIRE} מחר! תור פנוי`
      : `${EMOJIS.FIRE} תור חם ב${dayName}`
  
  // Concise body with urgency and rocket emoji
  const body = daysUntil <= 1
    ? `${EMOJIS.ROCKET} ${timesCount} שעות פנויות - מהר!`
    : `${EMOJIS.CALENDAR} ${dateShort} - ${timesCount} שעות`
  
  // Build action URL that includes appointment data for decision page
  const appointmentData = [{ date, times: (times || []).slice(0, 6) }]
  let actionUrl = `/notification-action?type=hot-alert`
  
  if (subscriptionId) {
    actionUrl += `&subscription=${subscriptionId}`
  }
  actionUrl += `&appointments=${encodeURIComponent(JSON.stringify(appointmentData))}`
  
  if (bookingUrl) {
    actionUrl += `&booking_url=${encodeURIComponent(bookingUrl)}`
  }
  
  const data = {
    type: 'hot-alert',
    url: actionUrl,
    date,
    urgent: daysUntil <= 1,
    subscription_id: subscriptionId
  }
  
  if (bookingUrl) {
    data.booking_url = bookingUrl
  }
  
  const actions = bookingUrl
    ? [
        { action: 'book', title: `${EMOJIS.ROCKET} הזמן עכשיו` },
        { action: 'view', title: 'פרטים' }
      ]
    : [
        { action: 'view', title: 'צפה' }
      ]
  
  return buildPayload({ 
    title, 
    body, 
    tag: 'hot-alert', 
    actions, 
    data,
    requireInteraction: true  // Hot alerts need attention
  })
}

/**
 * Build notification payload for weekly digest
 */
export function buildWeeklyDigestPayload({ 
  availableCount, 
  totalTimes,
  weekStart,
  weekEnd
}) {
  const title = `${EMOJIS.MEMO} סיכום שבועי`
  
  const body = availableCount > 0
    ? `${EMOJIS.STAR} ${availableCount} ימים עם ${totalTimes} שעות פנויות`
    : `${EMOJIS.INFO} אין תורים פנויים השבוע`
  
  // Build URL for weekly digest page
  let url = `/weekly-digest?count=${availableCount}&times=${totalTimes}`
  if (weekStart && weekEnd) {
    url += `&start=${weekStart}&end=${weekEnd}`
  }
  
  return buildPayload({
    title,
    body,
    tag: 'weekly-digest',
    actions: [{ action: 'view', title: 'צפה' }],
    data: {
      type: 'digest',
      url,
      available_count: availableCount,
      total_times: totalTimes,
      week_start: weekStart,
      week_end: weekEnd
    },
    requireInteraction: false
  })
}

/**
 * Build notification payload for expiry reminder
 */
export function buildExpiryReminderPayload({ 
  expiryDate, 
  daysRemaining,
  subscriptionId 
}) {
  const title = daysRemaining === 0 
    ? `${EMOJIS.HOURGLASS} ההתראה מסתיימת היום`
    : `${EMOJIS.HOURGLASS} ההתראה מסתיימת מחר`
  
  const body = `${EMOJIS.BELL} רוצה להאריך את מעקב התורים?`
  
  // Build URL for expiry reminder page
  let url = '/expiry-reminder'
  if (subscriptionId) {
    url += `?subscription=${subscriptionId}&expiry=${expiryDate}&remaining=${daysRemaining}`
  }
  
  return buildPayload({
    title,
    body,
    tag: 'expiry-reminder',
    actions: [
      { action: 'extend', title: 'הארך' },
      { action: 'dismiss', title: 'התעלם' }
    ],
    data: {
      type: 'expiry',
      url,
      expiry: expiryDate,
      remaining: daysRemaining,
      subscription_id: subscriptionId
    },
    requireInteraction: true
  })
}

/**
 * Build notification payload for subscription confirmation
 */
export function buildSubscriptionConfirmPayload({ 
  dateRangeStart, 
  dateRangeEnd,
  method,
  subscriptionId
}) {
  const startShort = formatDateShort(dateRangeStart)
  const endShort = formatDateShort(dateRangeEnd)
  
  const title = `${EMOJIS.CHECK} התראה נוצרה בהצלחה`
  
  const methodText = method === 'both' 
    ? 'פוש + מייל'
    : method === 'push' 
      ? 'פוש'
      : 'מייל'
  
  const body = `${EMOJIS.CALENDAR} ${startShort} - ${endShort} (${methodText})`
  
  // Build URL for subscription confirmed page
  let url = `/subscription-confirmed?start=${dateRangeStart}&end=${dateRangeEnd}&method=${method}`
  if (subscriptionId) {
    url += `&subscription=${subscriptionId}`
  }
  
  return buildPayload({
    title,
    body,
    tag: 'subscription-confirm',
    actions: [{ action: 'view', title: 'צפה' }],
    data: {
      type: 'subscription',
      url,
      subscription_id: subscriptionId,
      date_start: dateRangeStart,
      date_end: dateRangeEnd,
      method
    },
    requireInteraction: false
  })
}

/**
 * Build notification payload for opportunity discovery
 */
export function buildOpportunityPayload({ 
  date, 
  dayName, 
  timesCount,
  times,
  bookingUrl,
  subscriptionId
}) {
  const dateShort = formatDateShort(date)
  
  const title = `${EMOJIS.SPARKLES} הזדמנות ב${dayName}`
  const body = `${EMOJIS.NEW} ${dateShort} - ${timesCount} שעות נפתחו`
  
  // Build action URL that redirects to notification-action page
  const appointmentData = [{ date, times: (times || []).slice(0, 6) }]
  let actionUrl = `/notification-action?type=opportunity`
  
  if (subscriptionId) {
    actionUrl += `&subscription=${subscriptionId}`
  }
  actionUrl += `&appointments=${encodeURIComponent(JSON.stringify(appointmentData))}`
  
  if (bookingUrl) {
    actionUrl += `&booking_url=${encodeURIComponent(bookingUrl)}`
  }
  
  return buildPayload({
    title,
    body,
    tag: 'opportunity',
    actions: [
      { action: 'book', title: `${EMOJIS.CALENDAR} הזמן` },
      { action: 'view', title: 'פרטים' }
    ],
    data: {
      type: 'opportunity',
      url: actionUrl,
      date,
      subscription_id: subscriptionId,
      booking_url: bookingUrl
    },
    requireInteraction: false
  })
}

/**
 * Core payload builder - ensures all payloads are under 4KB with aggressive optimization
 * ENHANCED: Multi-stage reduction strategy to prevent HTTP 413 errors
 */
function buildPayload({ 
  title, 
  body, 
  tag, 
  actions = [], 
  data = {},
  requireInteraction = true,
  icon = '/icons/icon-192x192.png',
  badge = '/icons/icon-72x72.png',
  metadata = {}  // For logging/debugging only, not sent in payload
}) {
  // Build the notification object
  const notification = {
    title: truncate(title, 50),      // Max 50 chars for title
    body: truncate(body, 100),       // Max 100 chars for body
    icon,
    badge,
    tag,
    requireInteraction,
    data: {
      ...data,
      ts: Date.now()  // Shortened timestamp key
    }
  }
  
  // Only include actions if present
  if (actions.length > 0) {
    notification.actions = actions
  }
  
  const payload = {
    notification,
    badgeCount: 1
  }
  
  // Stage 1: Check initial size
  let payloadStr = JSON.stringify(payload)
  let payloadSize = Buffer.byteLength(payloadStr, 'utf8')
  
  // Log size for monitoring
  console.log(`[PushPayload] Initial size: ${payloadSize} bytes (max: ${MAX_PAYLOAD_SIZE}, absolute: ${ABSOLUTE_MAX_SIZE})`, metadata)
  
  // Stage 2: Warn if approaching limit
  if (payloadSize > WARNING_THRESHOLD) {
    console.warn(`[PushPayload] ⚠️ Size ${payloadSize} approaching ${MAX_PAYLOAD_SIZE} limit`)
  }
  
  // Stage 3: Reduction if exceeding target
  if (payloadSize > MAX_PAYLOAD_SIZE) {
    console.warn(`[PushPayload] 🔧 Reducing payload from ${payloadSize} bytes...`)
    
    // Reduction Step 1: Remove actions buttons
    if (notification.actions && notification.actions.length > 1) {
      notification.actions = [notification.actions[0]]  // Keep only first action
      payloadStr = JSON.stringify(payload)
      payloadSize = Buffer.byteLength(payloadStr, 'utf8')
      console.log(`[PushPayload] After removing extra actions: ${payloadSize} bytes`)
    }
    
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      // Reduction Step 2: Remove all actions
      delete notification.actions
      payloadStr = JSON.stringify(payload)
      payloadSize = Buffer.byteLength(payloadStr, 'utf8')
      console.log(`[PushPayload] After removing all actions: ${payloadSize} bytes`)
    }
    
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      // Reduction Step 3: Shorten body
      notification.body = truncate(notification.body, 50)
      payloadStr = JSON.stringify(payload)
      payloadSize = Buffer.byteLength(payloadStr, 'utf8')
      console.log(`[PushPayload] After shortening body: ${payloadSize} bytes`)
    }
    
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      // Reduction Step 4: Minimize data object
      const essentialData = {
        url: notification.data.url || '/',
        type: notification.data.type,
        ts: Date.now()
      }
      notification.data = essentialData
      payloadStr = JSON.stringify(payload)
      payloadSize = Buffer.byteLength(payloadStr, 'utf8')
      console.log(`[PushPayload] After minimizing data: ${payloadSize} bytes`)
    }
    
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      // Reduction Step 5: Emergency - strip to bare minimum
      notification.body = truncate(notification.body, 30)
      notification.title = truncate(notification.title, 30)
      notification.data = { url: '/', ts: Date.now() }
      payloadStr = JSON.stringify(payload)
      payloadSize = Buffer.byteLength(payloadStr, 'utf8')
      console.warn(`[PushPayload] 🚨 Emergency reduction: ${payloadSize} bytes`)
    }
  }
  
  // Final check against absolute maximum
  if (payloadSize > ABSOLUTE_MAX_SIZE) {
    console.error(`[PushPayload] ❌ CRITICAL: Payload ${payloadSize} exceeds absolute limit ${ABSOLUTE_MAX_SIZE}!`)
    // Last resort: bare minimum notification
    return JSON.stringify({
      notification: {
        title: 'התראה חדשה',
        body: 'יש עדכון חדש',
        icon,
        badge,
        tag,
        data: { url: '/', ts: Date.now() }
      },
      badgeCount: 1
    })
  }
  
  console.log(`[PushPayload] ✅ Final payload size: ${payloadSize} bytes`)
  return payloadStr
}

/**
 * Truncate string to max length
 */
function truncate(str, maxLen) {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.substring(0, maxLen - 1) + '…'
}

export default {
  buildAppointmentPayload,
  buildHotAlertPayload,
  buildWeeklyDigestPayload,
  buildExpiryReminderPayload,
  buildSubscriptionConfirmPayload,
  buildOpportunityPayload
}

