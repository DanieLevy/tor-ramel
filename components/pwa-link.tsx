'use client'

import Link from 'next/link'
import { usePWAInstall } from '@/hooks/use-pwa-install'
import { ComponentProps } from 'react'

interface PWALinkProps extends ComponentProps<typeof Link> {
  external?: boolean
}

export function PWALink({ external, children, href, ...props }: PWALinkProps) {
  const { isInstalled } = usePWAInstall()
  
  // If it's an external link and PWA is installed, handle it specially
  if (external && isInstalled && typeof href === 'string') {
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault()
      // For external links in PWA, use window.open to ensure it opens in the PWA context
      window.open(href, '_self')
    }
    
    return (
      <a href={href} onClick={handleClick} {...props}>
        {children}
      </a>
    )
  }
  
  // For internal links or when not installed, use regular Next.js Link
  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  )
} 