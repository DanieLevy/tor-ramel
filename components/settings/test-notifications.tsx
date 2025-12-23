'use client'

import { useState } from 'react'
import { Send, Mail, Smartphone, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TestNotificationsProps {
  notificationMethod: 'email' | 'push' | 'both'
  pushAvailable?: boolean
}

interface TestResult {
  success: boolean
  error?: string
}

interface TestResults {
  email?: TestResult
  push?: TestResult & { sent?: number; failed?: number }
}

export function TestNotifications({
  notificationMethod,
  pushAvailable = true
}: TestNotificationsProps) {
  const [testing, setTesting] = useState<'email' | 'push' | 'both' | null>(null)
  const [results, setResults] = useState<TestResults | null>(null)

  const handleTest = async (type: 'email' | 'push' | 'both') => {
    setTesting(type)
    setResults(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ type })
      })

      const data = await response.json()

      if (data.success) {
        setResults(data.results)
        toast.success('התראת בדיקה נשלחה!')
      } else {
        setResults(data.results || {})
        toast.error(data.error || 'שגיאה בשליחת התראת בדיקה')
      }
    } catch (error) {
      console.error('Test notification error:', error)
      toast.error('שגיאה בשליחת התראת בדיקה')
    } finally {
      setTesting(null)
    }
  }

  const canTestEmail = notificationMethod === 'email' || notificationMethod === 'both'
  const canTestPush = (notificationMethod === 'push' || notificationMethod === 'both') && pushAvailable

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">בדיקת התראות</h3>
        <p className="text-xs text-muted-foreground">שלח התראת בדיקה כדי לוודא שההגדרות פועלות</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Email Test Button */}
        <div className={cn(
          "p-4 rounded-xl border transition-all",
          canTestEmail 
            ? "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10" 
            : "opacity-50 bg-transparent border-dashed border-black/10 dark:border-white/10"
        )}>
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
              canTestEmail ? "bg-blue-500/20" : "bg-black/5 dark:bg-white/5"
            )}>
              <Mail className={cn("h-5 w-5", canTestEmail ? "text-blue-600" : "text-muted-foreground")} />
            </div>
            <div>
              <div className="font-medium text-sm text-foreground">התראת מייל</div>
              <div className="text-xs text-muted-foreground">שלח מייל לבדיקה</div>
            </div>
          </div>
          
          <Button
            onClick={() => handleTest('email')}
            disabled={!canTestEmail || testing !== null}
            className="w-full"
            variant={canTestEmail ? "default" : "outline"}
          >
            {testing === 'email' ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 ml-2" />
                שלח מייל בדיקה
              </>
            )}
          </Button>

          {results?.email && (
            <div className={cn(
              "mt-3 p-2 rounded-lg text-xs flex items-center gap-2",
              results.email.success 
                ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                : "bg-red-500/10 text-red-700 dark:text-red-400"
            )}>
              {results.email.success ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  מייל נשלח בהצלחה!
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  {results.email.error || 'שגיאה בשליחה'}
                </>
              )}
            </div>
          )}

          {!canTestEmail && (
            <p className="mt-2 text-xs text-muted-foreground">
              שנה את שיטת ההתראה ל"מייל" או "שניהם"
            </p>
          )}
        </div>

        {/* Push Test Button */}
        <div className={cn(
          "p-4 rounded-xl border transition-all",
          canTestPush 
            ? "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10" 
            : "opacity-50 bg-transparent border-dashed border-black/10 dark:border-white/10"
        )}>
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
              canTestPush ? "bg-green-500/20" : "bg-black/5 dark:bg-white/5"
            )}>
              <Smartphone className={cn("h-5 w-5", canTestPush ? "text-green-600" : "text-muted-foreground")} />
            </div>
            <div>
              <div className="font-medium text-sm text-foreground">התראת Push</div>
              <div className="text-xs text-muted-foreground">שלח התראה למכשיר</div>
            </div>
          </div>
          
          <Button
            onClick={() => handleTest('push')}
            disabled={!canTestPush || testing !== null}
            className="w-full"
            variant={canTestPush ? "default" : "outline"}
          >
            {testing === 'push' ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 ml-2" />
                שלח Push בדיקה
              </>
            )}
          </Button>

          {results?.push && (
            <div className={cn(
              "mt-3 p-2 rounded-lg text-xs flex items-center gap-2",
              results.push.success 
                ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                : "bg-red-500/10 text-red-700 dark:text-red-400"
            )}>
              {results.push.success ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Push נשלח! ({results.push.sent} התראות)
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  {results.push.error || 'שגיאה בשליחה'}
                </>
              )}
            </div>
          )}

          {!canTestPush && (
            <p className="mt-2 text-xs text-muted-foreground">
              {!pushAvailable 
                ? 'הפעל התראות Push קודם' 
                : 'שנה את שיטת ההתראה ל"Push" או "שניהם"'}
            </p>
          )}
        </div>
      </div>

      {/* Test Both Button */}
      {notificationMethod === 'both' && (
        <Button
          onClick={() => handleTest('both')}
          disabled={testing !== null}
          className="w-full"
          variant="outline"
        >
          {testing === 'both' ? (
            <>
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              שולח שתי התראות...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 ml-2" />
              שלח שתי התראות בדיקה (מייל + Push)
            </>
          )}
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        התראות הבדיקה מדמות התראה אמיתית, אבל לא משפיעות על הסטטיסטיקות שלך.
      </p>
    </div>
  )
}






