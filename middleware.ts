import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = [
  '/login', 
  '/verify-otp', 
  '/offline',
  '/api/auth/send-otp', 
  '/api/auth/verify-otp',
  '/sw.js',
  '/manifest.json',
  '/browserconfig.xml',
  '/.netlify/functions',  // Allow Netlify functions
  '/test-function'  // Test page for function
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow all API routes to handle their own auth
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  
  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // Check for auth in cookies
  const hasAuth = request.cookies.has('tor-ramel-auth')
  
  // Log for debugging mobile issues
  if (!hasAuth && !isPublicRoute) {
    console.log('Middleware: No auth cookie for protected route:', pathname)
  }
  
  // Redirect to login if accessing protected route without auth
  if (!isPublicRoute && !hasAuth) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
  
  // Redirect to home if accessing auth routes while logged in
  if (isPublicRoute && hasAuth && !pathname.startsWith('/api')) {
    const homeUrl = new URL('/', request.url)
    return NextResponse.redirect(homeUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - fonts (font files)
     * - public folder
     * - .netlify/functions (Netlify functions)
     */
    '/((?!_next/static|_next/image|favicon.ico|fonts|icons|sw.js|manifest.json|browserconfig.xml|\\.netlify/functions|.*\\.(?:svg|png|jpg|jpeg|gif|webp|otf|ttf|woff|woff2)$).*)',
  ],
} 