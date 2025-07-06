import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { HeaderProvider } from "@/components/header-context";
import { AuthProvider } from "@/components/auth-context";
import { Header } from "@/components/header";
import { PWAHead } from "@/components/pwa-head";
import { PWAProvider } from "@/components/pwa-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "תור רם-אל",
  description: "מערכת חיפוש תורים אוטומטית למרפאת רם-אל",
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
    description: "מערכת חיפוש תורים אוטומטית למרפאת רם-אל",
  },
  twitter: {
    card: "summary",
    title: "תור רם-אל",
    description: "מערכת חיפוש תורים אוטומטית למרפאת רם-אל",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6366f1" },
    { media: "(prefers-color-scheme: dark)", color: "#6366f1" },
  ],
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
              <HeaderProvider>
                <div className="relative flex min-h-screen flex-col">
                  <Header />
                  <main className="flex-1">{children}</main>
                </div>
              </HeaderProvider>
              <Toaster position="top-center" dir="rtl" />
            </PWAProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
