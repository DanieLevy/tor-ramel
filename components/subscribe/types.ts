// Shared types for subscribe components

export interface Subscription {
  id: string
  subscription_date: string | null
  date_range_start: string | null
  date_range_end: string | null
  is_active: boolean
  notification_method: NotificationMethod
  created_at: string
  completed_at: string | null
}

export type NotificationMethod = 'email' | 'push' | 'both'

export type DateMode = 'single' | 'range'

export interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

export interface DaysInfo {
  text: string
  color: string
  bgColor: string
  borderColor: string
}



