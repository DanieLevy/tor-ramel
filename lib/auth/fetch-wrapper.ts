/**
 * Fetch wrapper with automatic token refresh on 401 errors
 */

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

/**
 * Refresh authentication tokens
 */
async function refreshTokens(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    })
    
    if (response.ok) {
      console.log('✅ Tokens refreshed successfully')
      return true
    }
    
    console.error('❌ Token refresh failed:', response.status)
    return false
  } catch (error) {
    console.error('❌ Token refresh error:', error)
    return false
  }
}

/**
 * Enhanced fetch with automatic token refresh
 */
export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipAuth = false, ...fetchOptions } = options
  
  // First attempt
  let response = await fetch(url, {
    ...fetchOptions,
    credentials: 'include'
  })
  
  // If not authenticated and not skipping auth, try to refresh
  if (response.status === 401 && !skipAuth && !url.includes('/api/auth/')) {
    console.log('🔄 Got 401, attempting to refresh tokens...')
    
    // Prevent multiple simultaneous refresh attempts
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = refreshTokens()
    }
    
    // Wait for refresh to complete
    const refreshSuccess = await refreshPromise
    isRefreshing = false
    refreshPromise = null
    
    if (refreshSuccess) {
      // Retry the original request
      console.log('🔁 Retrying original request after token refresh...')
      response = await fetch(url, {
        ...fetchOptions,
        credentials: 'include'
      })
    } else {
      // Refresh failed, redirect to login
      if (typeof window !== 'undefined' && !url.startsWith('/api/')) {
        window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`
      }
    }
  }
  
  return response
}

/**
 * JSON fetch wrapper with automatic token refresh
 */
export async function fetchJSON<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithAuth(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  
  return response.json()
} 