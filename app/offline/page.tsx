"use client"

import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
        </div>
        
        <h1 className="text-3xl font-bold mb-4">אין חיבור לאינטרנט</h1>
        
        <p className="text-muted-foreground mb-8">
          לא ניתן לטעון את הדף הזה ללא חיבור לאינטרנט. בדוק את החיבור שלך ונסה שוב.
        </p>
        
        <Button 
          onClick={handleRefresh}
          size="lg"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          נסה שוב
        </Button>
        
        <div className="mt-12 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 טיפ: האפליקציה שומרת מידע באופן מקומי, כך שתוכל להשתמש בחלק מהפונקציות גם ללא אינטרנט.
          </p>
        </div>
      </div>
    </div>
  )
} 