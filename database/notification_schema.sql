-- Notification System Database Schema for תור רם-אל
-- This schema handles email notifications for appointment availability

-- 1. Notification Subscriptions Table
-- Stores user subscriptions for specific dates or date ranges
CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_date DATE, -- For single date subscriptions
    date_range_start DATE, -- For date range subscriptions
    date_range_end DATE, -- For date range subscriptions
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    completed_at TIMESTAMPTZ, -- When user found a suitable appointment
    
    -- Ensure either single date OR date range is set
    CONSTRAINT valid_date_config CHECK (
        (subscription_date IS NOT NULL AND date_range_start IS NULL AND date_range_end IS NULL) OR
        (subscription_date IS NULL AND date_range_start IS NOT NULL AND date_range_end IS NOT NULL)
    ),
    
    -- Ensure date range is valid
    CONSTRAINT valid_date_range CHECK (
        date_range_start IS NULL OR date_range_start <= date_range_end
    )
);

-- 2. Notified Appointments Table
-- Tracks notifications sent to users
CREATE TABLE IF NOT EXISTS notified_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    notified_times TEXT[] NOT NULL, -- Array of times like ['09:00', '10:00']
    notification_sent_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    user_response TEXT CHECK (user_response IN ('approved', 'declined', NULL)),
    response_at TIMESTAMPTZ,
    email_id TEXT, -- For tracking email delivery
    
    -- Ensure we don't send duplicate notifications for same date/subscription
    UNIQUE(subscription_id, appointment_date, notified_times)
);

-- 3. Ignored Appointment Times Table
-- Tracks which appointment times users have declined
CREATE TABLE IF NOT EXISTS ignored_appointment_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    ignored_times TEXT[] NOT NULL, -- Array of times like ['09:00', '10:00']
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    
    -- Ensure unique per user/date combination
    UNIQUE(user_id, appointment_date)
);

-- 4. Notification Queue Table
-- Queue for pending notifications to be processed
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    available_times TEXT[] NOT NULL, -- All available times found
    new_times TEXT[] NOT NULL, -- Only new times (not previously notified/ignored)
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Prevent duplicate queue entries
    UNIQUE(subscription_id, appointment_date, status)
);

-- Indexes for performance
CREATE INDEX idx_subscriptions_active ON notification_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX idx_subscriptions_user ON notification_subscriptions(user_id);
CREATE INDEX idx_subscriptions_single_date ON notification_subscriptions(subscription_date) WHERE subscription_date IS NOT NULL;
CREATE INDEX idx_subscriptions_date_range ON notification_subscriptions(date_range_start, date_range_end) WHERE date_range_start IS NOT NULL;

CREATE INDEX idx_notified_subscription ON notified_appointments(subscription_id);
CREATE INDEX idx_notified_date ON notified_appointments(appointment_date);

CREATE INDEX idx_ignored_user_date ON ignored_appointment_times(user_id, appointment_date);

CREATE INDEX idx_queue_status ON notification_queue(status) WHERE status = 'pending';
CREATE INDEX idx_queue_subscription ON notification_queue(subscription_id);

-- Enable Row Level Security (RLS)
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notified_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ignored_appointment_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON notification_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions" ON notification_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON notification_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notified_appointments
    FOR SELECT USING (
        subscription_id IN (
            SELECT id FROM notification_subscriptions WHERE user_id = auth.uid()
        )
    );

-- Users can manage their own ignored times
CREATE POLICY "Users can view own ignored times" ON ignored_appointment_times
    FOR ALL USING (auth.uid() = user_id);

-- Notification queue is only accessible by service role (auto-check function)
-- No RLS policies for regular users 