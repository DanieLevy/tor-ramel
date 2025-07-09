import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
)

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/offline',
  '/api/auth/login',
  '/api/auth/register',
  '/sw.js',
  '/manifest.json',
  '/browserconfig.xml',
  '/.netlify/functions',
  '/test-function',
  '/fonts',
  '/icons'
]

// Helper function to check if route is public
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static assets and public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }
  
  // Get the auth token from cookies
  const token = request.cookies.get('auth-token')
  
  if (!token) {
    // No token, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  try {
    // Verify the token (without expiration check since we use long-lived tokens)
    const { payload } = await jwtVerify(token.value, JWT_SECRET, {
      clockTolerance: Infinity
    })
    
    // Token is valid, continue with the request
    const response = NextResponse.next()
    
    // Add user info to request headers for API routes
    if (pathname.startsWith('/api/')) {
      response.headers.set('x-user-id', payload.userId as string)
      response.headers.set('x-user-email', payload.email as string)
    }
    
    return response
  } catch (error) {
    // Token is invalid, redirect to login
    console.error('JWT verification failed:', error)
    
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // For pages, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 