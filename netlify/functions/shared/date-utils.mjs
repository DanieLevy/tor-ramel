/**
 * Shared date utilities for Israel timezone and Hebrew formatting
 * Used by Netlify functions
 */

export const ISRAEL_TIMEZONE = 'Asia/Jerusalem'

/**
 * Format a date to YYYY-MM-DD in Israel timezone
 */
export const formatDateIsrael = (date) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

/**
 * Get current date at midnight in Israel timezone
 */
export const getCurrentDateIsrael = () => {
  return new Date(new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date()) + 'T00:00:00')
}

/**
 * Get Hebrew day name for a date string (YYYY-MM-DD)
 */
export const getDayNameHebrew = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: ISRAEL_TIMEZONE,
    weekday: 'long'
  }).format(date)
}

/**
 * Add days to a date
 */
export const addDaysIsrael = (date, days) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Check if a date is a closed day (Monday or Saturday)
 */
export const isClosedDay = (date) => {
  const dayOfWeek = new Intl.DateTimeFormat('en-US', {
    timeZone: ISRAEL_TIMEZONE,
    weekday: 'long'
  }).format(date)
  
  return dayOfWeek === 'Monday' || dayOfWeek === 'Saturday'
}

/**
 * Get open days starting from a date, excluding Mondays and Saturdays
 */
export const getOpenDays = (startDate, totalDays) => {
  const openDays = []
  let currentDate = new Date(startDate)
  let daysChecked = 0
  let closedDaysCount = 0
  
  const maxDaysToCheck = Math.min(totalDays * 2, 500)
  
  while (openDays.length < totalDays && daysChecked < maxDaysToCheck) {
    if (!isClosedDay(currentDate)) {
      openDays.push(new Date(currentDate))
    } else {
      closedDaysCount++
    }
    currentDate = addDaysIsrael(currentDate, 1)
    daysChecked++
  }
  
  return { openDays, closedDaysCount }
}

/**
 * Generate booking URL for a specific date
 */
export const generateBookingUrl = (dateStr) => {
  const baseUrl = 'https://mytor.co.il/home.php'
  const params = new URLSearchParams({
    i: 'cmFtZWwzMw==',  // ramel33 encoded
    s: 'MjY1',         // 265
    mm: 'y',
    lang: 'he',
    datef: dateStr,
    signup: 'הצג'      // Hebrew for "Show"
  })
  
  return `${baseUrl}?${params.toString()}`
}

