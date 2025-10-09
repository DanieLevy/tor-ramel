import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { HeaderProvider } from "@/components/header-context";
import { AuthProvider } from "@/components/auth-provider";
import { Header } from "@/components/header";
import { PWAHead } from "@/components/pwa-head";
import { PWAProvider } from "@/components/pwa-provider";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/bottom-nav";
import { FontLoader } from "@/components/font-loader";
import { SwUpdateBanner } from '@/components/sw-update-banner';
import { PushNotificationBanner } from '@/components/push-notification-banner';
import { Footer } from '@/components/footer';
import { DynamicThemeColor } from '@/components/dynamic-theme-color';

export const metadata: Metadata = {
  title: "תור רם-אל - זימון תורים",
  description: "מערכת חכמה לזימון תורים למספרת רם-אל",
  keywords: "תור, מספרה, רם-אל, זימון תורים",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "תור רם-אל",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "תור רם-אל",
    title: "תור רם-אל - מערכת חיפוש תורים",
    description: "מערכת חיפוש תורים אוטומטית למספרת רם-אל",
  },
  twitter: {
    card: "summary",
    title: "תור רם-אל",
    description: "מערכת חיפוש תורים אוטומטית למספרת רם-אל",
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: '16x16', type: 'image/x-icon' }
    ],
    apple: [
      // Standard apple-touch-icon
      { url: '/icons/touch-icon-iphone-retina.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/touch-icon-ipad.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/touch-icon-ipad-retina.png', sizes: '167x167', type: 'image/png' },
      { url: '/icons/touch-icon-iphone.png', sizes: '120x120', type: 'image/png' },
    ],
    other: [
      {
        rel: 'apple-touch-icon',
        url: '/icons/touch-icon-iphone-retina.png',
        sizes: '180x180',
        type: 'image/png'
      },
      {
        rel: 'apple-touch-icon-precomposed',
        url: '/icons/touch-icon-iphone-retina.png',
        sizes: '180x180',
        type: 'image/png'
      }
    ]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // Theme color is set dynamically via DynamicThemeColor component
  // to match the page background for seamless notch integration
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <PWAHead />
        <FontLoader />
      </head>
      <body
        className="antialiased font-sans"
        style={{ fontFamily: "'Ploni', system-ui, -apple-system, sans-serif" }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <PWAProvider>
              <FontLoader />
              <DynamicThemeColor />
              <HeaderProvider>
                <div className="relative flex min-h-screen flex-col">
                  <Header />
                  <main className="flex-1 pb-20">{children}</main>
                  <Footer />
                  <BottomNav />
                  <SwUpdateBanner />
                  <PushNotificationBanner />
                </div>
              </HeaderProvider>
              <Toaster 
                position="bottom-center" 
                dir="rtl" 
                className="pointer-events-none"
                toastOptions={{
                  style: {
                    marginBottom: 'calc(var(--safe-area-inset-bottom, 0px) + 4.5rem)',
                  },
                  className: 'font-sans pointer-events-auto',
                  duration: 3000,
                }}
              />
            </PWAProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
