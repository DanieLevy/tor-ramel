"use client"

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useHaptics } from './use-haptics'

interface OptimisticOptions<T> {
  /** Called when mutation fails - receives the previous state */
  onError?: (error: Error, previousState: T) => void
  /** Called when mutation succeeds */
  onSuccess?: (result: unknown) => void
  /** Error message to show (default: 'שגיאה בביצוע הפעולה') */
  errorMessage?: string
  /** Success message to show (optional) */
  successMessage?: string
  /** Whether to show haptic feedback (default: true) */
  hapticFeedback?: boolean
}

interface OptimisticMutation<T> {
  /** Execute the mutation with optimistic update */
  mutate: (
    optimisticUpdate: T,
    mutationFn: () => Promise<unknown>
  ) => Promise<boolean>
  /** Whether a mutation is in progress */
  isLoading: boolean
  /** Rollback to previous state */
  rollback: () => void
}

/**
 * Hook for optimistic updates with automatic rollback
 * Provides instant UI feedback while maintaining data integrity
 * 
 * @example
 * const [items, setItems] = useState<Item[]>([])
 * const { mutate } = useOptimistic(items, setItems)
 * 
 * const handleDelete = async (id: string) => {
 *   await mutate(
 *     items.filter(item => item.id !== id), // Optimistic state
 *     () => fetch(`/api/items/${id}`, { method: 'DELETE' }) // Actual mutation
 *   )
 * }
 */
export function useOptimistic<T>(
  state: T,
  setState: (value: T) => void,
  options: OptimisticOptions<T> = {}
): OptimisticMutation<T> {
  const {
    onError,
    onSuccess,
    errorMessage = 'שגיאה בביצוע הפעולה',
    successMessage,
    hapticFeedback = true
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const previousStateRef = useRef<T>(state)
  const haptics = useHaptics()

  const rollback = useCallback(() => {
    setState(previousStateRef.current)
  }, [setState])

  const mutate = useCallback(async (
    optimisticUpdate: T,
    mutationFn: () => Promise<unknown>
  ): Promise<boolean> => {
    // Store current state for potential rollback
    previousStateRef.current = state

    // Apply optimistic update immediately
    setState(optimisticUpdate)
    setIsLoading(true)

    if (hapticFeedback) {
      haptics.light()
    }

    try {
      const result = await mutationFn()
      
      if (hapticFeedback) {
        haptics.success()
      }
      
      if (successMessage) {
        toast.success(successMessage)
      }
      
      onSuccess?.(result)
      return true
    } catch (error) {
      // Rollback to previous state on error
      setState(previousStateRef.current)
      
      if (hapticFeedback) {
        haptics.error()
      }
      
      const err = error instanceof Error ? error : new Error(String(error))
      toast.error(errorMessage)
      onError?.(err, previousStateRef.current)
      
      return false
    } finally {
      setIsLoading(false)
    }
  }, [state, setState, haptics, hapticFeedback, errorMessage, successMessage, onError, onSuccess])

  return {
    mutate,
    isLoading,
    rollback
  }
}

/**
 * Hook for managing a list with optimistic CRUD operations
 */
interface ListItem {
  id: string
  [key: string]: unknown
}

interface OptimisticListOptions<T extends ListItem> extends OptimisticOptions<T[]> {
  /** Key extractor for items (default: 'id') */
  keyExtractor?: (item: T) => string
}

interface OptimisticList<T extends ListItem> {
  /** Add item optimistically */
  add: (item: T, mutationFn: () => Promise<unknown>) => Promise<boolean>
  /** Remove item optimistically */
  remove: (id: string, mutationFn: () => Promise<unknown>) => Promise<boolean>
  /** Update item optimistically */
  update: (id: string, updates: Partial<T>, mutationFn: () => Promise<unknown>) => Promise<boolean>
  /** Whether any operation is loading */
  isLoading: boolean
  /** Set of IDs currently being mutated */
  loadingIds: Set<string>
}

export function useOptimisticList<T extends ListItem>(
  items: T[],
  setItems: (items: T[]) => void,
  options: OptimisticListOptions<T> = {}
): OptimisticList<T> {
  const {
    keyExtractor = (item) => item.id,
    hapticFeedback = true,
    ...restOptions
  } = options

  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const haptics = useHaptics()
  const previousItemsRef = useRef<T[]>(items)

  const isLoading = loadingIds.size > 0

  const add = useCallback(async (
    item: T,
    mutationFn: () => Promise<unknown>
  ): Promise<boolean> => {
    const id = keyExtractor(item)
    previousItemsRef.current = items
    
    // Optimistically add item
    setItems([item, ...items])
    setLoadingIds(prev => new Set([...prev, id]))
    
    if (hapticFeedback) haptics.light()

    try {
      await mutationFn()
      if (hapticFeedback) haptics.success()
      restOptions.onSuccess?.(null)
      return true
    } catch {
      setItems(previousItemsRef.current)
      if (hapticFeedback) haptics.error()
      toast.error(restOptions.errorMessage ?? 'שגיאה בהוספת הפריט')
      return false
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [items, setItems, keyExtractor, haptics, hapticFeedback, restOptions])

  const remove = useCallback(async (
    id: string,
    mutationFn: () => Promise<unknown>
  ): Promise<boolean> => {
    previousItemsRef.current = items
    
    // Optimistically remove item
    setItems(items.filter(item => keyExtractor(item) !== id))
    setLoadingIds(prev => new Set([...prev, id]))
    
    if (hapticFeedback) haptics.light()

    try {
      await mutationFn()
      if (hapticFeedback) haptics.success()
      restOptions.onSuccess?.(null)
      return true
    } catch {
      setItems(previousItemsRef.current)
      if (hapticFeedback) haptics.error()
      toast.error(restOptions.errorMessage ?? 'שגיאה במחיקת הפריט')
      return false
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [items, setItems, keyExtractor, haptics, hapticFeedback, restOptions])

  const update = useCallback(async (
    id: string,
    updates: Partial<T>,
    mutationFn: () => Promise<unknown>
  ): Promise<boolean> => {
    previousItemsRef.current = items
    
    // Optimistically update item
    setItems(items.map(item => 
      keyExtractor(item) === id 
        ? { ...item, ...updates }
        : item
    ))
    setLoadingIds(prev => new Set([...prev, id]))
    
    if (hapticFeedback) haptics.light()

    try {
      await mutationFn()
      if (hapticFeedback) haptics.success()
      restOptions.onSuccess?.(null)
      return true
    } catch {
      setItems(previousItemsRef.current)
      if (hapticFeedback) haptics.error()
      toast.error(restOptions.errorMessage ?? 'שגיאה בעדכון הפריט')
      return false
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [items, setItems, keyExtractor, haptics, hapticFeedback, restOptions])

  return {
    add,
    remove,
    update,
    isLoading,
    loadingIds
  }
}

