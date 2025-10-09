'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { Code } from 'lucide-react'

export function Footer() {
  const [version, setVersion] = useState<string>('')
  const [buildTime, setBuildTime] = useState<string>('')

  useEffect(() => {
    // Get version from service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' })
      
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'VERSION_INFO') {
          setVersion(event.data.version)
          setBuildTime(event.data.buildTime)
        }
      })
    }
  }, [])

  if (!version) return null

  return (
    <footer className="fixed bottom-16 left-0 right-0 z-40 pointer-events-none">
      <div className="container mx-auto px-4 flex justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/80 backdrop-blur-sm rounded-full border border-border/50 text-xs text-muted-foreground pointer-events-auto">
          <Code className="h-3 w-3" />
          <span className="font-mono">{version}</span>
          {buildTime && (
            <>
              <span className="opacity-50">•</span>
              <span>{format(new Date(buildTime), 'dd/MM/yy HH:mm', { locale: he })}</span>
            </>
          )}
        </div>
      </div>
    </footer>
  )
}

