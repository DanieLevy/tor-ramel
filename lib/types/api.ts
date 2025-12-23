/**
 * Shared API Response Types
 * Ensures type safety between client and server
 */

// ============================================
// User & Auth Types
// ============================================

export interface User {
  userId: string
  email: string
  username?: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

// ============================================
// Subscription Types
// ============================================

export type SubscriptionStatus = 'active' | 'paused' | 'completed'
export type NotificationMethod = 'email' | 'push' | 'both'

export interface TimeRange {
  start: string
  end: string
}

export interface Subscription {
  id: string
  user_id: string
  subscription_date: string | null
  date_range_start: string | null
  date_range_end: string | null
  is_active: boolean
  created_at: string
  completed_at: string | null
  updated_at: string | null
  subscription_status: SubscriptionStatus
  notification_method: NotificationMethod
  preferred_time_ranges: TimeRange[] | null
  paused_at: string | null
  paused_until: string | null
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

export interface SubscriptionCreatePayload {
  subscription_date?: string
  date_range_start?: string
  date_range_end?: string
  notification_method?: NotificationMethod
  preferred_time_ranges?: TimeRange[]
}

export interface SubscriptionUpdatePayload {
  subscription_status?: SubscriptionStatus
  notification_method?: NotificationMethod
  preferred_time_ranges?: TimeRange[]
  paused_until?: string
}

// ============================================
// Appointment Types
// ============================================

export interface Appointment {
  date: string
  dayName: string | null
  times: string[]
  bookingUrl: string | null
  available: boolean
}

export interface AppointmentCheck {
  id: string
  check_date: string
  available: boolean
  times: string[]
  day_name: string | null
  booking_url: string | null
  checked_at: string
}

export interface AppointmentStats {
  lastCheckTime: string | null
  todayChecks: number
  availableAppointments: number
  nearestAppointment: {
    date: string
    dayName: string | null
    times: string[]
    bookingUrl: string | null
  } | null
}

// ============================================
// Home Stats Types
// ============================================

export interface HomeStats {
  availableAppointments: number
  nearestDate: string | null
  activeSubscriptions: number
  totalNotificationsSent: number
  ignoredTimesCount: number
  lastCheckTime: string | null
  todayChecks: number
  nextCheckIn: number
  unreadNotifications?: number
}

// ============================================
// Notification Types
// ============================================

export type InAppNotificationType = 
  | 'appointment' 
  | 'system' 
  | 'subscription' 
  | 'proactive' 
  | 'hot_alert' 
  | 'weekly_summary' 
  | 'expiry_reminder' 
  | 'inactivity'

export interface InAppNotification {
  id: string
  user_id: string
  subscription_id: string | null
  title: string
  body: string
  notification_type: InAppNotificationType
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
  read_at: string | null
}

// ============================================
// User Preferences Types
// ============================================

export interface UserPreferences {
  id: string
  user_id: string
  proactive_notifications_enabled: boolean
  hot_alerts_enabled: boolean
  weekly_digest_enabled: boolean
  inactivity_alerts_enabled: boolean
  expiry_reminders_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  preferred_times: TimeRange[]
  notification_cooldown_hours: number
  default_notification_method: NotificationMethod
  max_notifications_per_day: number
  notification_cooldown_minutes: number
  batch_notifications: boolean
  batch_interval_hours: number
  preferred_delivery_start: string | null
  preferred_delivery_end: string | null
}

// ============================================
// API Error Types
// ============================================

export interface ApiError {
  error: string
  status?: number
  message?: string
  details?: Record<string, unknown>
}

// ============================================
// Helper Types
// ============================================

export type ApiResponse<T> = T | ApiError

export const isApiError = (response: unknown): response is ApiError => {
  return typeof response === 'object' && response !== null && 'error' in response
}

