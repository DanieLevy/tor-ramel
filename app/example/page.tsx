"use client"

import { useEffect } from 'react'
import { useHeader } from '@/components/header-context'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'

export default function ExamplePage() {
  const updateHeader = useHeader()

  useEffect(() => {
    // Example of customizing the header for this page
    updateHeader({
      title: 'דף דוגמה',
      showMenu: true,
      customActions: (
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      ),
    })
  }, [updateHeader])

  return (
    <div className="container py-8 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">דף דוגמה</h1>
        <p className="text-muted-foreground">
          זהו דף דוגמה שמראה איך להשתמש במערכת הכותרת הדינמית.
        </p>
        
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">איך להשתמש בכותרת דינמית:</h2>
          <pre className="bg-muted p-4 rounded-lg overflow-auto text-left" dir="ltr">
{`import { useHeader } from '@/components/header-context'

export default function MyPage() {
  const updateHeader = useHeader()

  useEffect(() => {
    updateHeader({
      title: 'הכותרת שלי',
      showMenu: true,
      customActions: <Button>פעולה</Button>
    })
  }, [updateHeader])
}`}
          </pre>
        </div>
      </div>
    </div>
  )
} 