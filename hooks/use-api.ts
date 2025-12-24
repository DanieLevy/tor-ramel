"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { pwaFetch } from '@/lib/utils'

interface CacheEntry<T> {
  data: T
  timestamp: number
  error?: never
}

interface UseFetchOptions {
  /** Cache duration in milliseconds (default: 30 seconds) */
  cacheTime?: number
  /** Stale time in milliseconds - data is refetched in background after this (default: 10 seconds) */
  staleTime?: number
  /** Whether to refetch on window focus (default: true) */
  refetchOnFocus?: boolean
  /** Whether to refetch on reconnect (default: true) */
  refetchOnReconnect?: boolean
  /** Whether to enable the query (default: true) */
  enabled?: boolean
  /** Retry count on failure (default: 2) */
  retryCount?: number
  /** Retry delay in milliseconds (default: 1000) */
  retryDelay?: number
}

interface UseFetchResult<T> {
  data: T | null
  error: Error | null
  isLoading: boolean
  isValidating: boolean
  mutate: (data?: T) => void
  refetch: () => Promise<void>
}

// Global cache for client-side data
const cache = new Map<string, CacheEntry<unknown>>()

/**
 * Custom hook for data fetching with SWR-like caching behavior
 * Provides stale-while-revalidate pattern for optimal performance
 */
export const useApi = <T>(
  url: string | null,
  options: UseFetchOptions = {}
): UseFetchResult<T> => {
  const {
    cacheTime = 30000, // 30 seconds
    staleTime = 10000, // 10 seconds
    refetchOnFocus = true,
    refetchOnReconnect = true,
    enabled = true,
    retryCount = 2,
    retryDelay = 1000
  } = options

  const [data, setData] = useState<T | null>(() => {
    // Initialize with cached data if available
    if (url) {
      const cached = cache.get(url) as CacheEntry<T> | undefined
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        return cached.data
      }
    }
    return null
  })
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(!data && enabled)
  const [isValidating, setIsValidating] = useState(false)
  
  const retryCountRef = useRef(0)
  const isMountedRef = useRef(true)

  const fetchData = useCallback(async (isBackground = false) => {
    if (!url || !enabled) return

    // Check cache first
    const cached = cache.get(url) as CacheEntry<T> | undefined
    const now = Date.now()

    if (cached) {
      const age = now - cached.timestamp
      
      // If data is fresh, don't fetch
      if (age < staleTime && !isBackground) {
        setData(cached.data)
        setIsLoading(false)
        return
      }
      
      // If data is stale but within cache time, show cached data and revalidate in background
      if (age < cacheTime) {
        setData(cached.data)
        if (!isBackground) {
          setIsLoading(false)
        }
      }
    }

    // Set validating state for background fetches
    if (isBackground || cached) {
      setIsValidating(true)
    } else {
      setIsLoading(true)
    }

    try {
      const response = await pwaFetch(url, {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json() as T
      
      if (isMountedRef.current) {
        // Update cache
        cache.set(url, {
          data: result,
          timestamp: Date.now()
        })
        
        setData(result)
        setError(null)
        retryCountRef.current = 0
      }
    } catch (err) {
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error(String(err))
        
        // Retry logic
        if (retryCountRef.current < retryCount) {
          retryCountRef.current++
          setTimeout(() => fetchData(isBackground), retryDelay * retryCountRef.current)
          return
        }
        
        setError(error)
        
        // Keep showing cached data even on error
        if (cached) {
          setData(cached.data)
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
        setIsValidating(false)
      }
    }
  }, [url, enabled, staleTime, cacheTime, retryCount, retryDelay])

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true
    fetchData()
    
    return () => {
      isMountedRef.current = false
    }
  }, [fetchData])

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnFocus) return

    const handleFocus = () => {
      fetchData(true) // Background fetch
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetchOnFocus, fetchData])

  // Refetch on reconnect
  useEffect(() => {
    if (!refetchOnReconnect) return

    const handleOnline = () => {
      fetchData(true) // Background fetch
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [refetchOnReconnect, fetchData])

  const mutate = useCallback((newData?: T) => {
    if (newData && url) {
      cache.set(url, {
        data: newData,
        timestamp: Date.now()
      })
      setData(newData)
    } else if (url) {
      // Invalidate cache and refetch
      cache.delete(url)
      fetchData()
    }
  }, [url, fetchData])

  // Use a ref to always have access to the latest fetchData without adding it as a dependency
  const fetchDataRef = useRef(fetchData)
  fetchDataRef.current = fetchData

  const refetch = useCallback(async () => {
    if (url) {
      cache.delete(url)
    }
    await fetchDataRef.current()
  }, [url]) // Only depends on url, not fetchData - stable reference

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    refetch
  }
}

/**
 * Clear all cached data
 */
export const clearApiCache = () => {
  cache.clear()
}

/**
 * Prefetch data and store in cache
 */
export const prefetchApi = async <T>(url: string): Promise<T | null> => {
  try {
    const response = await pwaFetch(url, {
      method: 'GET',
      credentials: 'include'
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json() as T
    
    cache.set(url, {
      data,
      timestamp: Date.now()
    })
    
    return data
  } catch {
    return null
  }
}

