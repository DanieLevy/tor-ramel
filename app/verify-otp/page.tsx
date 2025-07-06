"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function VerifyOTPPage() {
  const router = useRouter()

  useEffect(() => {
    // Auto redirect after 3 seconds
    const timer = setTimeout(() => {
      router.push('/login')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
            <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-500" />
          </div>
          <CardTitle>שיטת ההתחברות השתנתה</CardTitle>
          <CardDescription>
            אנו משתמשים כעת בהתחברות עם סיסמה במקום קוד חד-פעמי
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            מועבר לדף ההתחברות בעוד מספר שניות...
          </p>
          <Button asChild className="w-full">
            <Link href="/login">עבור להתחברות</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 