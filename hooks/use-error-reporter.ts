/**
 * Frontend Error Reporter Hook
 * 
 * Provides easy error reporting from React components.
 * Sends errors to the backend for logging.
 */

'use client';

import { useCallback } from 'react';

type FrontendErrorType = 
  | 'frontend_error'
  | 'worker_error'
  | 'network_error'
  | 'validation_error'
  | 'unknown_error';

interface ErrorReportOptions {
  error_type?: FrontendErrorType;
  source: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send error report to backend
 */
async function sendErrorReport(
  message: string,
  options: ErrorReportOptions,
  stackTrace?: string
): Promise<void> {
  try {
    const response = await fetch('/api/logs/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        error_type: options.error_type || 'frontend_error',
        message,
        source: options.source,
        stack_trace: stackTrace,
        operation: options.operation,
        metadata: {
          ...options.metadata,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          timestamp: new Date().toISOString()
        }
      })
    });
    
    if (!response.ok) {
      console.error('[ErrorReporter] Failed to send error report:', response.status);
    }
  } catch (err) {
    // Don't throw - error reporting should be silent
    console.error('[ErrorReporter] Failed to send error report:', err);
  }
}

/**
 * Hook for reporting errors from components
 */
export function useErrorReporter() {
  /**
   * Report an error
   */
  const reportError = useCallback((
    error: Error | string,
    options: ErrorReportOptions
  ) => {
    const message = error instanceof Error ? error.message : error;
    const stackTrace = error instanceof Error ? error.stack : undefined;
    
    // Fire and forget - don't block the UI
    sendErrorReport(message, options, stackTrace).catch(() => {});
  }, []);
  
  /**
   * Report a network/API error
   */
  const reportNetworkError = useCallback((
    error: Error | string,
    endpoint: string,
    options: Partial<ErrorReportOptions> = {}
  ) => {
    const message = error instanceof Error ? error.message : error;
    const stackTrace = error instanceof Error ? error.stack : undefined;
    
    sendErrorReport(message, {
      error_type: 'network_error',
      source: options.source || 'api-client',
      operation: `fetch:${endpoint}`,
      metadata: {
        ...options.metadata,
        endpoint
      }
    }, stackTrace).catch(() => {});
  }, []);
  
  /**
   * Report a validation error
   */
  const reportValidationError = useCallback((
    message: string,
    source: string,
    field?: string,
    options: Partial<ErrorReportOptions> = {}
  ) => {
    sendErrorReport(message, {
      error_type: 'validation_error',
      source,
      operation: 'validation',
      metadata: {
        ...options.metadata,
        field
      }
    }).catch(() => {});
  }, []);
  
  /**
   * Report a component error
   */
  const reportComponentError = useCallback((
    error: Error | string,
    componentName: string,
    options: Partial<ErrorReportOptions> = {}
  ) => {
    const message = error instanceof Error ? error.message : error;
    const stackTrace = error instanceof Error ? error.stack : undefined;
    
    sendErrorReport(message, {
      error_type: 'frontend_error',
      source: `component:${componentName}`,
      ...options
    }, stackTrace).catch(() => {});
  }, []);
  
  return {
    reportError,
    reportNetworkError,
    reportValidationError,
    reportComponentError
  };
}

/**
 * Global error handler for uncaught errors
 * Call this once in your app root
 */
export function setupGlobalErrorHandler() {
  if (typeof window === 'undefined') return;
  
  // Handle uncaught errors
  window.onerror = (message, source, lineno, colno, error) => {
    sendErrorReport(
      typeof message === 'string' ? message : 'Uncaught error',
      {
        error_type: 'frontend_error',
        source: source || 'window.onerror',
        metadata: {
          lineno,
          colno,
          error_name: error?.name
        }
      },
      error?.stack
    ).catch(() => {});
    
    // Return false to allow default error handling
    return false;
  };
  
  // Handle unhandled promise rejections
  window.onunhandledrejection = (event) => {
    const error = event.reason;
    const message = error instanceof Error ? error.message : String(error);
    
    sendErrorReport(
      `Unhandled Promise Rejection: ${message}`,
      {
        error_type: 'frontend_error',
        source: 'window.onunhandledrejection',
        metadata: {
          error_name: error instanceof Error ? error.name : undefined
        }
      },
      error instanceof Error ? error.stack : undefined
    ).catch(() => {});
  };
  
  console.log('[ErrorReporter] Global error handlers installed');
}

