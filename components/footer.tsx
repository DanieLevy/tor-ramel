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
    <footer className="w-full py-2 pb-20 sm:pb-2">
      <div className="container mx-auto px-4 flex justify-center">
        <div className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <Code className="h-2.5 w-2.5" />
          <span className="font-mono">{version}</span>
          {buildTime && (
            <>
              <span className="opacity-40">•</span>
              <span>{format(new Date(buildTime), 'dd/MM HH:mm', { locale: he })}</span>
            </>
          )}
        </div>
      </div>
    </footer>
  )
}

