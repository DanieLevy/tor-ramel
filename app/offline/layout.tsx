import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'אופליין | תור רם-אל',
  description: 'דף אופליין - תור רם-אל',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' }
  ],
}

export default function OfflineLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 