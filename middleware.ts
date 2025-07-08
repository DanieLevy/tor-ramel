import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

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
  '/api/auth/refresh',
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

// Helper function to refresh tokens
async function refreshTokens(request: NextRequest): Promise<NextResponse | null> {
  const refreshToken = request.cookies.get('refresh-token')
  
  if (!refreshToken) {
    return null
  }
  
  try {
    // Verify refresh token
    const { payload } = await jwtVerify(refreshToken.value, JWT_SECRET)
    
    // Generate new access token
    const newAccessToken = await new SignJWT({ 
      userId: payload.userId as string,
      email: payload.email as string
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET)
    
    // Create response that will continue with the request
    const response = NextResponse.next()
    
    // Set the new access token cookie
    response.cookies.set('auth-token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    })
    
    // Add user info to request headers for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      response.headers.set('x-user-id', payload.userId as string)
      response.headers.set('x-user-email', payload.email as string)
    }
    
    console.log('✅ Successfully refreshed access token in middleware')
    return response
  } catch (error) {
    console.error('❌ Failed to refresh token in middleware:', error)
    return null
  }
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
    // No access token, try to refresh
    const refreshResponse = await refreshTokens(request)
    if (refreshResponse) {
      return refreshResponse
    }
    
    // No token and refresh failed, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  try {
    // Verify the token
    const { payload } = await jwtVerify(token.value, JWT_SECRET)
    
    // Token is valid, continue with the request
    const response = NextResponse.next()
    
    // Add user info to request headers for API routes
    if (pathname.startsWith('/api/')) {
      response.headers.set('x-user-id', payload.userId as string)
      response.headers.set('x-user-email', payload.email as string)
    }
    
    return response
  } catch (error) {
    // Token is invalid or expired, try to refresh
    console.log('🔄 Access token expired, attempting to refresh...')
    
    const refreshResponse = await refreshTokens(request)
    if (refreshResponse) {
      return refreshResponse
    }
    
    // Refresh failed
    console.error('JWT verification failed and refresh failed:', error)
    
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
     * - public folder
     * - font files
     * - icon files
     */
    '/((?!_next/static|_next/image|favicon.ico|fonts/.*|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|otf|woff|woff2|ttf|eot)$).*)',
  ],
} 