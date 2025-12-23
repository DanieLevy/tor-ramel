/**
 * Hooks Index
 * Centralized export for all custom hooks
 */

// Data Fetching
export { useApi, clearApiCache, prefetchApi } from './use-api'

// Optimistic Updates
export { useOptimistic, useOptimisticList } from './use-optimistic'

// Form Validation
export { useFormValidation, commonSchemas } from './use-form-validation'

// Haptic Feedback
export { useHaptics, haptics } from './use-haptics'

// Pull to Refresh
export { usePullToRefresh } from './use-pull-to-refresh'

// Service Worker
export { useServiceWorker } from './use-service-worker'

// Push Notifications
export { usePushNotifications } from './use-push-notifications'

// Error Reporting
export { useErrorReporter, setupGlobalErrorHandler } from './use-error-reporter'

