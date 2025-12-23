import { NextResponse } from 'next/server'

interface ApiResponseOptions {
  /** HTTP status code (default: 200) */
  status?: number
  /** Cache duration in seconds for successful responses (default: 0 - no cache) */
  cacheSeconds?: number
  /** Stale-while-revalidate duration in seconds (default: 0) */
  staleWhileRevalidate?: number
  /** Whether to allow CDN caching (default: true if cacheSeconds > 0) */
  allowCdn?: boolean
  /** Additional headers */
  headers?: Record<string, string>
}

/**
 * Creates an optimized JSON response with proper caching headers
 */
export const apiResponse = <T>(
  data: T,
  options: ApiResponseOptions = {}
): NextResponse<T> => {
  const {
    status = 200,
    cacheSeconds = 0,
    staleWhileRevalidate = 0,
    allowCdn = cacheSeconds > 0,
    headers = {}
  } = options

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  }

  // Add caching headers for successful responses
  if (status >= 200 && status < 300) {
    if (cacheSeconds > 0) {
      const cacheControl: string[] = []
      
      if (allowCdn) {
        cacheControl.push('public')
        cacheControl.push(`s-maxage=${cacheSeconds}`)
      } else {
        cacheControl.push('private')
      }
      
      cacheControl.push(`max-age=${Math.min(cacheSeconds, 60)}`) // Client cache (max 60s)
      
      if (staleWhileRevalidate > 0) {
        cacheControl.push(`stale-while-revalidate=${staleWhileRevalidate}`)
      }
      
      responseHeaders['Cache-Control'] = cacheControl.join(', ')
    } else {
      // No caching for dynamic data
      responseHeaders['Cache-Control'] = 'private, no-cache, no-store, must-revalidate'
    }
  } else {
    // Never cache errors
    responseHeaders['Cache-Control'] = 'no-store'
  }

  return NextResponse.json(data, {
    status,
    headers: responseHeaders
  })
}

/**
 * Creates an error response with consistent format
 */
export const apiError = (
  message: string,
  status: number = 500,
  details?: Record<string, unknown>
): NextResponse => {
  const errorBody: Record<string, unknown> = {
    error: message,
    status
  }
  
  if (details && process.env.NODE_ENV !== 'production') {
    errorBody.details = details
  }

  return NextResponse.json(errorBody, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  })
}

/**
 * Wraps an async API handler with error handling
 */
export const withErrorHandling = <T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T>> => {
  return handler().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API Error]', message)
    return apiError(message, 500) as NextResponse<T>
  })
}

/**
 * Common cache presets for different data types
 */
export const CachePresets = {
  /** No caching - for user-specific or frequently changing data */
  NONE: { cacheSeconds: 0, staleWhileRevalidate: 0 },
  
  /** Short cache - for dashboard stats (30 seconds cache, 60 seconds stale) */
  SHORT: { cacheSeconds: 30, staleWhileRevalidate: 60 },
  
  /** Medium cache - for appointment data (2 minutes cache, 5 minutes stale) */
  MEDIUM: { cacheSeconds: 120, staleWhileRevalidate: 300 },
  
  /** Long cache - for static data (10 minutes cache, 1 hour stale) */
  LONG: { cacheSeconds: 600, staleWhileRevalidate: 3600 },
  
  /** Private short - for user-specific data with some caching */
  PRIVATE_SHORT: { cacheSeconds: 30, staleWhileRevalidate: 60, allowCdn: false }
} as const

