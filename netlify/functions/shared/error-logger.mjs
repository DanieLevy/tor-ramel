/**
 * Production Error Logging System for Netlify Functions
 * 
 * ES Module version for use in Netlify scheduled functions.
 * Captures failures and logs to Supabase error_logs table.
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Sanitize sensitive data from objects
 */
function sanitizeData(data, sensitiveKeys = ['password', 'token', 'secret', 'auth', 'key', 'credential', 'authorization']) {
  if (!data || typeof data !== 'object') return data
  
  const sanitized = {}
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value, sensitiveKeys)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

/**
 * Extract stack trace from error
 */
function getStackTrace(error) {
  if (error instanceof Error && error.stack) {
    return error.stack.substring(0, 2000)
  }
  return undefined
}

/**
 * Log error to database
 */
export async function logError({
  error_type,
  message,
  source,
  error = null,
  operation = null,
  user_id = null,
  user_email = null,
  subscription_id = null,
  notification_id = null,
  push_subscription_id = null,
  metadata = {}
}) {
  try {
    const errorMessage = error instanceof Error ? error.message : (message || String(error))
    
    const logEntry = {
      error_type: error_type || 'unknown_error',
      message: errorMessage.substring(0, 5000),
      stack_trace: getStackTrace(error)?.substring(0, 5000),
      source,
      operation,
      user_id,
      user_email,
      subscription_id,
      notification_id,
      push_subscription_id,
      metadata: sanitizeData(metadata),
      environment: process.env.NODE_ENV || 'production'
    }
    
    const { error: dbError } = await supabase
      .from('error_logs')
      .insert(logEntry)
    
    if (dbError) {
      console.error('[ErrorLogger] Failed to write to database:', dbError)
      console.error('[ErrorLogger] Original error:', logEntry)
    } else {
      console.log(`[ErrorLogger] ❌ Logged ${error_type}: ${errorMessage.substring(0, 100)}`)
    }
  } catch (err) {
    console.error('[ErrorLogger] Exception while logging:', err)
  }
}

/**
 * Log Netlify function error
 */
export async function logFunctionError(error, functionName, options = {}) {
  await logError({
    error_type: 'function_error',
    message: error instanceof Error ? error.message : String(error),
    source: `netlify/functions/${functionName}`,
    error,
    operation: options.operation,
    user_id: options.user_id,
    subscription_id: options.subscription_id,
    metadata: options.metadata || {}
  })
}

/**
 * Log push notification error
 */
export async function logPushError(error, options = {}) {
  await logError({
    error_type: 'push_error',
    message: error instanceof Error ? error.message : String(error),
    source: options.source || 'notification-processor',
    error,
    operation: options.operation || 'send_push',
    user_id: options.user_id,
    user_email: options.user_email,
    push_subscription_id: options.push_subscription_id,
    subscription_id: options.subscription_id,
    metadata: {
      endpoint: options.endpoint?.substring(0, 100),
      status_code: options.status_code,
      device_type: options.device_type,
      ...options.metadata
    }
  })
}

/**
 * Log email sending error
 */
export async function logEmailError(error, options = {}) {
  await logError({
    error_type: 'email_error',
    message: error instanceof Error ? error.message : String(error),
    source: options.source || 'email-service',
    error,
    operation: options.email_type || 'send_email',
    user_id: options.user_id,
    user_email: options.user_email,
    subscription_id: options.subscription_id,
    metadata: options.metadata || {}
  })
}

/**
 * Log database error
 */
export async function logDatabaseError(error, source, options = {}) {
  await logError({
    error_type: 'database_error',
    message: error instanceof Error ? error.message : String(error),
    source,
    error,
    operation: options.operation,
    user_id: options.user_id,
    metadata: {
      table: options.table,
      query: options.query?.substring(0, 500),
      ...options.metadata
    }
  })
}

/**
 * Log service/external API error
 */
export async function logServiceError(error, serviceName, options = {}) {
  await logError({
    error_type: 'service_error',
    message: error instanceof Error ? error.message : String(error),
    source: serviceName,
    error,
    operation: options.operation,
    user_id: options.user_id,
    metadata: {
      endpoint: options.endpoint,
      status_code: options.status_code,
      ...options.metadata
    }
  })
}

/**
 * Log notification processing error
 */
export async function logNotificationError(error, options = {}) {
  await logError({
    error_type: options.error_type || 'function_error',
    message: error instanceof Error ? error.message : String(error),
    source: options.source || 'notification-processor',
    error,
    operation: options.operation,
    user_id: options.user_id,
    user_email: options.user_email,
    subscription_id: options.subscription_id,
    notification_id: options.notification_id,
    metadata: {
      notification_method: options.notification_method,
      appointment_date: options.appointment_date,
      ...options.metadata
    }
  })
}

