/**
 * Centralized Push Notification Payload Builder
 * 
 * Builds lightweight, optimized payloads that comply with Apple's 4KB limit.
 * All Hebrew content is properly formatted and concise.
 */

// Maximum payload size for Apple Push Notification service (4KB)
const MAX_PAYLOAD_SIZE = 4096

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
 * Optimized for Apple's 4KB limit
 */
export function buildAppointmentPayload({ 
  appointments, 
  subscriptionId,
  bookingUrl 
}) {
  const count = appointments?.length || 0
  
  // Build concise title
  let title
  if (count === 1) {
    const apt = appointments[0]
    const dayShort = getHebrewDayShort(apt.date)
    const dateShort = formatDateShort(apt.date)
    title = `תור פנוי ${dayShort} ${dateShort}`
  } else if (count <= 3) {
    title = `${count} תורים פנויים`
  } else {
    title = `נמצאו ${count} תורים פנויים`
  }
  
  // Build concise body
  let body
  if (count === 1) {
    const apt = appointments[0]
    const timesCount = apt.newTimes?.length || apt.times?.length || 0
    body = timesCount === 1 
      ? `שעה אחת זמינה - הזמן עכשיו!`
      : `${timesCount} שעות זמינות`
  } else {
    // Show first 2-3 dates only
    const previewDates = appointments.slice(0, 3)
    const dateList = previewDates.map(apt => formatDateShort(apt.date)).join(', ')
    body = count > 3 
      ? `${dateList} ועוד...`
      : dateList
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
        { action: 'book', title: 'הזמן' },
        { action: 'view', title: 'פרטים' }
      ]
    : [
        { action: 'view', title: 'צפה' }
      ]
  
  return buildPayload({ title, body, tag: 'appointment', actions, data })
}

/**
 * Build notification payload for hot alerts (urgent appointments)
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
  
  // Urgent, attention-grabbing title
  const title = daysUntil === 0 
    ? `היום! תור פנוי` 
    : daysUntil === 1 
      ? `מחר! תור פנוי`
      : `תור חם ב${dayName}`
  
  // Concise body with urgency
  const body = daysUntil <= 1
    ? `${timesCount} שעות פנויות - מהר!`
    : `${dateShort} - ${timesCount} שעות`
  
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
        { action: 'book', title: 'הזמן עכשיו' },
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
  totalTimes 
}) {
  const title = 'סיכום שבועי'
  
  const body = availableCount > 0
    ? `${availableCount} ימים עם ${totalTimes} שעות פנויות`
    : 'אין תורים פנויים השבוע'
  
  return buildPayload({
    title,
    body,
    tag: 'weekly-digest',
    actions: [{ action: 'view', title: 'צפה' }],
    data: {
      type: 'digest',
      url: '/search'
    },
    requireInteraction: false
  })
}

/**
 * Build notification payload for expiry reminder
 */
export function buildExpiryReminderPayload({ 
  expiryDate, 
  daysRemaining 
}) {
  const title = daysRemaining === 0 
    ? 'ההתראה מסתיימת היום'
    : 'ההתראה מסתיימת מחר'
  
  const body = 'רוצה להאריך את מעקב התורים?'
  
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
      url: '/subscribe',
      expiry: expiryDate
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
  method 
}) {
  const startShort = formatDateShort(dateRangeStart)
  const endShort = formatDateShort(dateRangeEnd)
  
  const title = 'התראה נוצרה בהצלחה'
  
  const methodText = method === 'both' 
    ? 'פוש + מייל'
    : method === 'push' 
      ? 'פוש'
      : 'מייל'
  
  const body = `${startShort} - ${endShort} (${methodText})`
  
  return buildPayload({
    title,
    body,
    tag: 'subscription-confirm',
    actions: [{ action: 'view', title: 'צפה' }],
    data: {
      type: 'subscription',
      url: '/subscribe'
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
  
  const title = `הזדמנות ב${dayName}`
  const body = `${dateShort} - ${timesCount} שעות נפתחו`
  
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
      { action: 'book', title: 'הזמן' },
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

