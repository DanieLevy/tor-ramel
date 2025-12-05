import { format } from 'date-fns'
import { Bell, Mail, Smartphone } from 'lucide-react'
import type { Subscription, NotificationMethod, DaysInfo } from './types'

/**
 * Check if a date should be disabled in the calendar
 * Disables: past dates, dates > 30 days, Mondays (1) and Saturdays (6)
 */
export const isDateDisabled = (date: Date): boolean => {
  const israeliDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }))
  const day = israeliDate.getDay()
  
  const now = new Date()
  const israeliToday = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }))
  israeliToday.setHours(0, 0, 0, 0)
  
  const maxDate = new Date(israeliToday)
  maxDate.setDate(maxDate.getDate() + 30)
  
  const israeliInputDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }))
  israeliInputDate.setHours(0, 0, 0, 0)
  
  return israeliInputDate < israeliToday || israeliInputDate > maxDate || day === 1 || day === 6
}

/**
 * Format subscription date for display
 */
export const formatSubscriptionDate = (sub: Subscription): string => {
  if (sub.subscription_date) {
    return format(new Date(sub.subscription_date + 'T00:00:00'), 'dd/MM/yyyy')
  }
  if (sub.date_range_start && sub.date_range_end) {
    return `${format(new Date(sub.date_range_start + 'T00:00:00'), 'dd/MM')} - ${format(new Date(sub.date_range_end + 'T00:00:00'), 'dd/MM/yyyy')}`
  }
  return ''
}

/**
 * Get icon for notification method
 */
export const getNotificationMethodIcon = (method: NotificationMethod) => {
  switch (method) {
    case 'email': return Mail
    case 'push': return Smartphone
    case 'both': return Bell
    default: return Bell
  }
}

/**
 * Get notification method label in Hebrew
 */
export const getNotificationMethodLabel = (method: NotificationMethod): string => {
  switch (method) {
    case 'email': return 'מייל'
    case 'push': return 'Push'
    case 'both': return 'שניהם'
    default: return 'מייל'
  }
}

/**
 * Get days info with styling for subscription status - clean solid colors
 */
export const getDaysInfo = (sub: Subscription): DaysInfo => {
  if (typeof window === 'undefined') return { text: '', color: '', bgColor: '', borderColor: '' }
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (sub.subscription_date) {
    const targetDate = new Date(sub.subscription_date + 'T00:00:00')
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return { 
      text: 'עבר', 
      color: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-50 dark:bg-red-950/40',
      borderColor: 'border-red-200 dark:border-red-800'
    }
    if (diffDays === 0) return { 
      text: 'היום', 
      color: 'text-green-700 dark:text-green-300',
      bgColor: 'bg-green-50 dark:bg-green-950/40',
      borderColor: 'border-green-200 dark:border-green-800'
    }
    if (diffDays === 1) return { 
      text: 'מחר', 
      color: 'text-blue-700 dark:text-blue-300',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      borderColor: 'border-blue-200 dark:border-blue-800'
    }
    if (diffDays <= 7) return { 
      text: `בעוד ${diffDays} ימים`, 
      color: 'text-orange-700 dark:text-orange-300',
      bgColor: 'bg-orange-50 dark:bg-orange-950/40',
      borderColor: 'border-orange-200 dark:border-orange-800'
    }
    return {
      text: `בעוד ${diffDays} ימים`, 
      color: 'text-purple-700 dark:text-purple-300',
      bgColor: 'bg-purple-50 dark:bg-purple-950/40',
      borderColor: 'border-purple-200 dark:border-purple-800'
    }
  }
  
  if (sub.date_range_start && sub.date_range_end) {
    const endDate = new Date(sub.date_range_end + 'T00:00:00')
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return { 
      text: 'הסתיים', 
      color: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-50 dark:bg-red-950/40',
      borderColor: 'border-red-200 dark:border-red-800'
    }
    if (diffDays === 0) return { 
      text: 'נגמר היום', 
      color: 'text-orange-700 dark:text-orange-300',
      bgColor: 'bg-orange-50 dark:bg-orange-950/40',
      borderColor: 'border-orange-200 dark:border-orange-800'
    }
    if (diffDays <= 7) return { 
      text: `נגמר בעוד ${diffDays} ימים`, 
      color: 'text-orange-700 dark:text-orange-300',
      bgColor: 'bg-orange-50 dark:bg-orange-950/40',
      borderColor: 'border-orange-200 dark:border-orange-800'
    }
    return { 
      text: `נגמר בעוד ${diffDays} ימים`, 
      color: 'text-purple-700 dark:text-purple-300',
      bgColor: 'bg-purple-50 dark:bg-purple-950/40',
      borderColor: 'border-purple-200 dark:border-purple-800'
    }
  }
  
  return { text: '', color: '', bgColor: '', borderColor: '' }
}

/**
 * Check if subscription has duplicate dates with other subscriptions
 */
export const hasDuplicateDates = (sub: Subscription, allSubs: Subscription[]): boolean => {
  return allSubs.some(otherSub => {
    if (otherSub.id === sub.id || !otherSub.is_active) return false
    
    if (sub.subscription_date && otherSub.subscription_date) {
      return sub.subscription_date === otherSub.subscription_date
    }
    
    if (sub.date_range_start && sub.date_range_end && otherSub.date_range_start && otherSub.date_range_end) {
      return sub.date_range_start === otherSub.date_range_start && 
             sub.date_range_end === otherSub.date_range_end
    }
    
    return false
  })
}
