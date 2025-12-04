// Auto-generated Supabase types - December 2025
// Run `npx supabase gen types typescript` to regenerate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointment_checks: {
        Row: {
          available: boolean
          booking_url: string | null
          check_date: string
          checked_at: string | null
          day_name: string | null
          id: string
          times: string[] | null
        }
        Insert: {
          available: boolean
          booking_url?: string | null
          check_date: string
          checked_at?: string | null
          day_name?: string | null
          id?: string
          times?: string[] | null
        }
        Update: {
          available?: boolean
          booking_url?: string | null
          check_date?: string
          checked_at?: string | null
          day_name?: string | null
          id?: string
          times?: string[] | null
        }
        Relationships: []
      }
      ignored_appointment_times: {
        Row: {
          appointment_date: string
          created_at: string | null
          id: string
          ignored_times: string[]
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          appointment_date: string
          created_at?: string | null
          id?: string
          ignored_times: string[]
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          appointment_date?: string
          created_at?: string | null
          id?: string
          ignored_times?: string[]
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ignored_appointment_times_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "notification_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ignored_appointment_times_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      in_app_notifications: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          notification_type: string | null
          read_at: string | null
          subscription_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          notification_type?: string | null
          read_at?: string | null
          subscription_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          notification_type?: string | null
          read_at?: string | null
          subscription_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "notification_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_app_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          appointment_date: string | null
          appointments: Json | null
          available_times: string[]
          batch_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          new_times: string[]
          processed_at: string | null
          status: string | null
          subscription_id: string
        }
        Insert: {
          appointment_date?: string | null
          appointments?: Json | null
          available_times: string[]
          batch_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          new_times: string[]
          processed_at?: string | null
          status?: string | null
          subscription_id: string
        }
        Update: {
          appointment_date?: string | null
          appointments?: Json | null
          available_times?: string[]
          batch_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          new_times?: string[]
          processed_at?: string | null
          status?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "notification_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_subscriptions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          date_range_end: string | null
          date_range_start: string | null
          id: string
          is_active: boolean | null
          notification_method: string
          paused_at: string | null
          paused_until: string | null
          preferred_time_ranges: Json | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          subscription_date: string | null
          subscription_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          is_active?: boolean | null
          notification_method?: string
          paused_at?: string | null
          paused_until?: string | null
          preferred_time_ranges?: Json | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          subscription_date?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          is_active?: boolean | null
          notification_method?: string
          paused_at?: string | null
          paused_until?: string | null
          preferred_time_ranges?: Json | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          subscription_date?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notified_appointments: {
        Row: {
          appointment_date: string
          email_id: string | null
          id: string
          notification_sent_at: string | null
          notified_times: string[]
          response_at: string | null
          subscription_id: string
          user_response: string | null
        }
        Insert: {
          appointment_date: string
          email_id?: string | null
          id?: string
          notification_sent_at?: string | null
          notified_times: string[]
          response_at?: string | null
          subscription_id: string
          user_response?: string | null
        }
        Update: {
          appointment_date?: string
          email_id?: string | null
          id?: string
          notification_sent_at?: string | null
          notified_times?: string[]
          response_at?: string | null
          subscription_id?: string
          user_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notified_appointments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "notification_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_type: string
          email: string | null
          endpoint: string
          id: string
          is_active: boolean
          last_used: string
          p256dh: string
          user_agent: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_type: string
          email?: string | null
          endpoint: string
          id?: string
          is_active?: boolean
          last_used?: string
          p256dh: string
          user_agent?: string | null
          user_id?: string | null
          username?: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_type?: string
          email?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean
          last_used?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_otps: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          otp_code: string
          used: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          otp_code: string
          used?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          otp_code?: string
          used?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_otps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login: string | null
          last_notification_check: string | null
          password: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_notification_check?: string | null
          password?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_notification_check?: string | null
          password?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_otps: { Args: Record<PropertyKey, never>; Returns: number }
      cleanup_old_appointment_checks: { Args: Record<PropertyKey, never>; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Commonly used table types
export type User = Tables<'users'>
export type Subscription = Tables<'notification_subscriptions'>
export type AppointmentCheck = Tables<'appointment_checks'>
export type PushSubscription = Tables<'push_subscriptions'>
export type InAppNotification = Tables<'in_app_notifications'>
export type NotifiedAppointment = Tables<'notified_appointments'>
export type NotificationQueue = Tables<'notification_queue'>
export type IgnoredAppointmentTime = Tables<'ignored_appointment_times'>
export type UserOtp = Tables<'user_otps'>



