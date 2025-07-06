"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function TestFunctionPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testFunction = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/.netlify/functions/auto-check')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Function failed')
      }
      
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-8 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Test Auto-Check Function</h1>
          <p className="text-muted-foreground">
            Test the Netlify scheduled function manually
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Manual Function Test</CardTitle>
            <CardDescription>
              Click the button below to manually trigger the auto-check function
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={testFunction}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                'Test Function'
              )}
            </Button>

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <p className="text-sm font-medium text-destructive">Error</p>
                </div>
                <p className="mt-2 text-sm text-destructive/80">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="rounded-lg border border-green-500/50 bg-green-50/50 dark:bg-green-950/20 p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Function executed successfully!
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/50 p-4">
                  <h3 className="font-medium mb-2">Results:</h3>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Execution Time:</dt>
                      <dd className="font-medium">{result.executionTime}s</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Is Scheduled:</dt>
                      <dd className="font-medium">{result.isScheduled ? 'Yes' : 'No'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Total Checked:</dt>
                      <dd className="font-medium">{result.data?.totalChecked || 0}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Appointments Found:</dt>
                      <dd className="font-medium">{result.data?.appointmentCount || 0}</dd>
                    </div>
                  </dl>
                </div>

                {result.data?.appointments && result.data.appointments.length > 0 && (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <h3 className="font-medium mb-2">Available Appointments:</h3>
                    <div className="space-y-2">
                      {result.data.appointments.map((apt: any, idx: number) => (
                        <div key={idx} className="text-sm">
                          <p className="font-medium">{apt.date}</p>
                          <p className="text-muted-foreground">
                            {apt.times.length} times available
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    View raw response
                  </summary>
                  <pre className="mt-2 overflow-auto rounded bg-muted p-2">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>This page is for testing purposes only.</p>
          <p>The scheduled function runs automatically every 5 minutes on production.</p>
        </div>
      </div>
    </div>
  )
} 