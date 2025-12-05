'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useHaptics } from '@/hooks/use-haptics'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number  // Distance to pull before triggering (default 80px)
  disabled?: boolean
}

interface PullToRefreshState {
  isPulling: boolean
  isRefreshing: boolean
  pullDistance: number
  pullProgress: number  // 0 to 1
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false
}: UsePullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    pullProgress: 0
  })
  
  const startY = useRef(0)
  const currentY = useRef(0)
  const haptics = useHaptics()
  const triggeredRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing) return
    
    // Only start if we're at the top of the scroll
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    if (scrollTop > 5) return
    
    startY.current = e.touches[0].clientY
    triggeredRef.current = false
    setState(prev => ({ ...prev, isPulling: true, pullDistance: 0, pullProgress: 0 }))
  }, [disabled, state.isRefreshing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!state.isPulling || disabled || state.isRefreshing) return
    
    currentY.current = e.touches[0].clientY
    const distance = Math.max(0, currentY.current - startY.current)
    
    // Apply resistance to make it feel more natural
    const resistedDistance = Math.min(threshold * 1.5, distance * 0.5)
    const progress = Math.min(1, resistedDistance / threshold)
    
    setState(prev => ({
      ...prev,
      pullDistance: resistedDistance,
      pullProgress: progress
    }))
    
    // Trigger haptic at threshold
    if (progress >= 1 && !triggeredRef.current) {
      triggeredRef.current = true
      haptics.medium()
    }
  }, [state.isPulling, state.isRefreshing, disabled, threshold, haptics])

  const handleTouchEnd = useCallback(async () => {
    if (!state.isPulling || disabled) return
    
    const shouldRefresh = state.pullProgress >= 1
    
    setState(prev => ({ ...prev, isPulling: false }))
    
    if (shouldRefresh && !state.isRefreshing) {
      setState(prev => ({ ...prev, isRefreshing: true, pullDistance: threshold * 0.75, pullProgress: 1 }))
      haptics.success()
      
      try {
        await onRefresh()
      } finally {
        // Animate out
        setState(prev => ({ ...prev, isRefreshing: false, pullDistance: 0, pullProgress: 0 }))
      }
    } else {
      // Reset without refresh
      setState(prev => ({ ...prev, pullDistance: 0, pullProgress: 0 }))
    }
  }, [state.isPulling, state.pullProgress, state.isRefreshing, disabled, threshold, onRefresh, haptics])

  useEffect(() => {
    if (disabled) return
    
    const options = { passive: true }
    
    window.addEventListener('touchstart', handleTouchStart, options)
    window.addEventListener('touchmove', handleTouchMove, options)
    window.addEventListener('touchend', handleTouchEnd, options)
    
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled])

  return {
    ...state,
    containerRef,
    threshold
  }
}

