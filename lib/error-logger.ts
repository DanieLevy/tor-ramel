/**
 * Production Error Logging System
 * 
 * Captures failures across the entire application:
 * - Next.js API routes
 * - Frontend components
 * - Service workers
 * - External service calls
 * 
 * Only logs failures, not verbose debug info.
 * Designed for efficient production debugging.
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side logging
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Error types for categorization
export type ErrorType = 
  | 'api_error'
  | 'function_error'
  | 'push_error'
  | 'email_error'
  | 'database_error'
  | 'auth_error'
  | 'validation_error'
  | 'network_error'
  | 'service_error'
  | 'frontend_error'
  | 'worker_error'
  | 'unknown_error';

// Error log entry structure
export interface ErrorLogEntry {
  // Required fields
  error_type: ErrorType;
  message: string;
  source: string;  // File/function/component name
  
  // Optional details
  error_code?: string;
  stack_trace?: string;
  operation?: string;  // What was being attempted
  
  // User context
  user_id?: string;
  user_email?: string;
  
  // Related entities
  subscription_id?: string;
  notification_id?: string;
  push_subscription_id?: string;
  
  // Request context
  request_method?: string;
  request_path?: string;
  request_body?: Record<string, unknown>;
  request_headers?: Record<string, string>;
  
  // Environment
  user_agent?: string;
  ip_address?: string;
  
  // Additional context
  metadata?: Record<string, unknown>;
}

/**
 * Sanitize headers - remove sensitive information
 */
function sanitizeHeaders(headers: Record<string, string> | Headers | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  
  const sensitiveKeys = ['authorization', 'cookie', 'x-api-key', 'api-key', 'token', 'password'];
  const sanitized: Record<string, string> = {};
  
  const headerObj = headers instanceof Headers 
    ? Object.fromEntries(headers.entries())
    : headers;
  
  for (const [key, value] of Object.entries(headerObj)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Sanitize request body - remove sensitive fields
 */
function sanitizeBody(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object') return undefined;
  
  const sensitiveKeys = ['password', 'token', 'secret', 'auth', 'key', 'credential'];
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Extract stack trace from error
 */
function getStackTrace(error: unknown): string | undefined {
  if (error instanceof Error && error.stack) {
    // Limit stack trace length to prevent huge logs
    return error.stack.substring(0, 2000);
  }
  return undefined;
}

/**
 * Main error logging class
 */
class ErrorLogger {
  private static instance: ErrorLogger;
  private pendingLogs: ErrorLogEntry[] = [];
  private isProcessing = false;
  
  private constructor() {}
  
  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }
  
  /**
   * Log an error to the database
   */
  async log(entry: ErrorLogEntry): Promise<void> {
    try {
      // Validate required fields
      if (!entry.message || !entry.source || !entry.error_type) {
        console.error('[ErrorLogger] Missing required fields:', { entry });
        return;
      }
      
      // Build the log entry
      const logEntry = {
        error_type: entry.error_type,
        error_code: entry.error_code,
        message: entry.message.substring(0, 5000), // Limit message length
        stack_trace: entry.stack_trace?.substring(0, 5000),
        source: entry.source,
        operation: entry.operation,
        user_id: entry.user_id || null,
        user_email: entry.user_email,
        subscription_id: entry.subscription_id,
        notification_id: entry.notification_id,
        push_subscription_id: entry.push_subscription_id,
        request_method: entry.request_method,
        request_path: entry.request_path,
        request_body: entry.request_body ? sanitizeBody(entry.request_body) : null,
        request_headers: entry.request_headers ? sanitizeHeaders(entry.request_headers) : null,
        user_agent: entry.user_agent,
        ip_address: entry.ip_address,
        metadata: entry.metadata || {},
        environment: process.env.NODE_ENV || 'production'
      };
      
      // Insert into database
      const { error: dbError } = await supabase
        .from('error_logs')
        .insert(logEntry);
      
      if (dbError) {
        // Log to console as fallback
        console.error('[ErrorLogger] Failed to write to database:', dbError);
        console.error('[ErrorLogger] Original error:', logEntry);
      } else {
        console.log(`[ErrorLogger] ❌ Logged ${entry.error_type}: ${entry.message.substring(0, 100)}`);
      }
      
    } catch (err) {
      // Fallback to console if logging fails
      console.error('[ErrorLogger] Exception while logging:', err);
      console.error('[ErrorLogger] Original error:', entry);
    }
  }
  
  /**
   * Log API route error
   */
  async logApiError(
    error: unknown,
    source: string,
    options: {
      operation?: string;
      user_id?: string;
      user_email?: string;
      request?: Request;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    let requestBody: Record<string, unknown> | undefined;
    let requestHeaders: Record<string, string> | undefined;
    
    if (options.request) {
      try {
        const clonedRequest = options.request.clone();
        const body = await clonedRequest.text();
        requestBody = body ? JSON.parse(body) : undefined;
      } catch {
        // Body might not be JSON
      }
      requestHeaders = Object.fromEntries(options.request.headers.entries());
    }
    
    await this.log({
      error_type: 'api_error',
      message: errorMessage,
      stack_trace: getStackTrace(error),
      source,
      operation: options.operation,
      user_id: options.user_id,
      user_email: options.user_email,
      request_method: options.request?.method,
      request_path: options.request ? new URL(options.request.url).pathname : undefined,
      request_body: requestBody,
      request_headers: requestHeaders,
      metadata: options.metadata
    });
  }
  
  /**
   * Log push notification error
   */
  async logPushError(
    error: unknown,
    options: {
      user_id?: string;
      user_email?: string;
      push_subscription_id?: string;
      subscription_id?: string;
      operation?: string;
      endpoint?: string;
      status_code?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await this.log({
      error_type: 'push_error',
      message: errorMessage,
      stack_trace: getStackTrace(error),
      source: 'push-notification-service',
      operation: options.operation || 'send_push',
      user_id: options.user_id,
      user_email: options.user_email,
      push_subscription_id: options.push_subscription_id,
      subscription_id: options.subscription_id,
      metadata: {
        ...options.metadata,
        endpoint: options.endpoint?.substring(0, 100), // Truncate endpoint
        status_code: options.status_code
      }
    });
  }
  
  /**
   * Log email sending error
   */
  async logEmailError(
    error: unknown,
    options: {
      user_id?: string;
      user_email?: string;
      subscription_id?: string;
      email_type?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await this.log({
      error_type: 'email_error',
      message: errorMessage,
      stack_trace: getStackTrace(error),
      source: 'email-service',
      operation: options.email_type || 'send_email',
      user_id: options.user_id,
      user_email: options.user_email,
      subscription_id: options.subscription_id,
      metadata: options.metadata
    });
  }
  
  /**
   * Log database error
   */
  async logDatabaseError(
    error: unknown,
    source: string,
    options: {
      operation?: string;
      table?: string;
      query?: string;
      user_id?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await this.log({
      error_type: 'database_error',
      message: errorMessage,
      stack_trace: getStackTrace(error),
      source,
      operation: options.operation,
      user_id: options.user_id,
      metadata: {
        ...options.metadata,
        table: options.table,
        query: options.query?.substring(0, 500) // Truncate query
      }
    });
  }
  
  /**
   * Log authentication error
   */
  async logAuthError(
    error: unknown,
    source: string,
    options: {
      operation?: string;
      user_email?: string;
      ip_address?: string;
      user_agent?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await this.log({
      error_type: 'auth_error',
      message: errorMessage,
      stack_trace: getStackTrace(error),
      source,
      operation: options.operation,
      user_email: options.user_email,
      ip_address: options.ip_address,
      user_agent: options.user_agent,
      metadata: options.metadata
    });
  }
  
  /**
   * Log Netlify function error
   */
  async logFunctionError(
    error: unknown,
    functionName: string,
    options: {
      operation?: string;
      user_id?: string;
      subscription_id?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await this.log({
      error_type: 'function_error',
      message: errorMessage,
      stack_trace: getStackTrace(error),
      source: `netlify/functions/${functionName}`,
      operation: options.operation,
      user_id: options.user_id,
      subscription_id: options.subscription_id,
      metadata: options.metadata
    });
  }
  
  /**
   * Log service error (external APIs, etc.)
   */
  async logServiceError(
    error: unknown,
    serviceName: string,
    options: {
      operation?: string;
      endpoint?: string;
      status_code?: number;
      user_id?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await this.log({
      error_type: 'service_error',
      message: errorMessage,
      stack_trace: getStackTrace(error),
      source: serviceName,
      operation: options.operation,
      user_id: options.user_id,
      metadata: {
        ...options.metadata,
        endpoint: options.endpoint,
        status_code: options.status_code
      }
    });
  }
  
  /**
   * Log validation error
   */
  async logValidationError(
    message: string,
    source: string,
    options: {
      field?: string;
      value?: unknown;
      user_id?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<void> {
    await this.log({
      error_type: 'validation_error',
      message,
      source,
      operation: 'validation',
      user_id: options.user_id,
      metadata: {
        ...options.metadata,
        field: options.field,
        value: typeof options.value === 'string' ? options.value.substring(0, 100) : options.value
      }
    });
  }
  
  /**
   * Generic error logger with auto-detection
   */
  async logError(
    error: unknown,
    source: string,
    options: Partial<ErrorLogEntry> = {}
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await this.log({
      error_type: options.error_type || 'unknown_error',
      message: errorMessage,
      stack_trace: getStackTrace(error),
      source,
      ...options
    });
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance();

// Export convenience functions for direct use
export const logApiError = errorLogger.logApiError.bind(errorLogger);
export const logPushError = errorLogger.logPushError.bind(errorLogger);
export const logEmailError = errorLogger.logEmailError.bind(errorLogger);
export const logDatabaseError = errorLogger.logDatabaseError.bind(errorLogger);
export const logAuthError = errorLogger.logAuthError.bind(errorLogger);
export const logFunctionError = errorLogger.logFunctionError.bind(errorLogger);
export const logServiceError = errorLogger.logServiceError.bind(errorLogger);
export const logValidationError = errorLogger.logValidationError.bind(errorLogger);
export const logError = errorLogger.logError.bind(errorLogger);

