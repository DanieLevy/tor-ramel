import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'התחברות | תור רם-אל',
  description: 'כניסה למערכת תור רם-אל',
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

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 