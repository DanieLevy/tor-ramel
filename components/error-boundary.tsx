"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertTriangle, RefreshCcw, Home, Bug } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a graceful fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error caught by ErrorBoundary:', error, errorInfo)
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo)

    // Report to error logging service
    this.reportError(error, errorInfo)
  }

  private async reportError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      await fetch('/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error_type: 'frontend_error',
          message: error.message,
          stack_trace: error.stack,
          source: 'ErrorBoundary',
          metadata: {
            componentStack: errorInfo.componentStack,
            url: typeof window !== 'undefined' ? window.location.href : 'unknown'
          }
        })
      })
    } catch {
      // Silently fail - don't throw in error boundary
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  private handleGoHome = (): void => {
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <Card variant="glass-elevated" className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>משהו השתבש</CardTitle>
              <CardDescription>
                אירעה שגיאה בלתי צפויה. אנא נסה שוב או חזור לדף הבית.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={this.handleRetry}
                className="w-full"
                variant="default"
              >
                <RefreshCcw className="h-4 w-4 ml-2" />
                נסה שוב
              </Button>
              <Button 
                onClick={this.handleGoHome}
                className="w-full"
                variant="outline"
              >
                <Home className="h-4 w-4 ml-2" />
                חזור לדף הבית
              </Button>

              {/* Show error details in development */}
              {this.props.showDetails && process.env.NODE_ENV !== 'production' && this.state.error && (
                <details className="mt-4 text-xs">
                  <summary className="cursor-pointer flex items-center gap-1 text-muted-foreground">
                    <Bug className="h-3 w-3" />
                    פרטי השגיאה (למפתחים)
                  </summary>
                  <pre className="mt-2 p-3 rounded-lg bg-muted overflow-x-auto text-[10px] leading-relaxed">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Wrapper component for async errors in client components
 */
interface AsyncErrorFallbackProps {
  error: Error
  resetError?: () => void
}

export const AsyncErrorFallback = ({ error, resetError }: AsyncErrorFallbackProps) => (
  <div className={cn(
    "rounded-2xl p-4 border border-destructive/20",
    "bg-destructive/5 text-destructive"
  )}>
    <div className="flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">שגיאה בטעינת הנתונים</p>
        <p className="text-xs mt-1 opacity-80">{error.message}</p>
        {resetError && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetError}
            className="mt-2 h-7 px-2 text-xs"
          >
            <RefreshCcw className="h-3 w-3 ml-1" />
            נסה שוב
          </Button>
        )}
      </div>
    </div>
  </div>
)

/**
 * Hook-friendly error boundary wrapper
 */
export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> => {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )
  
  WithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`
  
  return WithErrorBoundary
}

export default ErrorBoundary

