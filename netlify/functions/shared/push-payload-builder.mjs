/**
 * Centralized Push Notification Payload Builder
 * 
 * Builds lightweight, optimized payloads that comply with Apple's 4KB limit.
 * All Hebrew content is properly formatted and concise.
 * Uses universally-supported Unicode emojis for iOS compatibility.
 */

// Maximum payload size for Apple Push Notification service (4KB)
const MAX_PAYLOAD_SIZE = 4096

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
 */
export function buildAppointmentPayload({ 
  appointments, 
  subscriptionId,
  bookingUrl 
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
  
  // Build URL for notification-action page with minimal appointment data
  const appointmentData = appointments?.slice(0, 5).map(apt => ({
    date: apt.date,
    times: (apt.newTimes || apt.times || []).slice(0, 6)
  })) || []
  
  // Build URL - redirect to notification-action page
  let actionUrl = `/notification-action?subscription=${subscriptionId}`
  
  // Add compact appointments data
  if (appointmentData.length > 0) {
    const compactAppts = encodeURIComponent(JSON.stringify(appointmentData))
    actionUrl += `&appointments=${compactAppts}`
  }
  
  // Build lightweight data
  const data = {
    type: 'appointment',
    url: actionUrl,
    subscription_id: subscriptionId,
    cnt: count
  }
  
  // Only include booking URL if available
  if (bookingUrl) {
    data.booking_url = bookingUrl
    actionUrl += `&booking_url=${encodeURIComponent(bookingUrl)}`
    data.url = actionUrl
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
  
  return buildPayload({ title, body, tag: 'appointment', actions, data })
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
 * Core payload builder - ensures all payloads are under 4KB
 */
function buildPayload({ 
  title, 
  body, 
  tag, 
  actions = [], 
  data = {},
  requireInteraction = true,
  icon = '/icons/icon-192x192.png',
  badge = '/icons/icon-72x72.png'
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
  
  const payloadStr = JSON.stringify(payload)
  
  // Check size and warn if close to limit
  if (payloadStr.length > MAX_PAYLOAD_SIZE * 0.9) {
    console.warn(`[PushPayload] Payload size ${payloadStr.length} approaching limit`)
  }
  
  if (payloadStr.length > MAX_PAYLOAD_SIZE) {
    console.error(`[PushPayload] Payload size ${payloadStr.length} exceeds limit! Truncating...`)
    // Remove non-essential data
    delete notification.data
    notification.data = { url: data.url || '/' }
  }
  
  return JSON.stringify(payload)
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

