import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
)

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '1h'
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d'

export interface JWTPayload {
  userId: string
  email: string
  exp?: number
  iat?: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

/**
 * Generate JWT access and refresh tokens
 */
export async function generateTokens(payload: { userId: string; email: string }): Promise<AuthTokens> {
  const accessToken = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRES_IN)
    .sign(JWT_SECRET)

  const refreshToken = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRES_IN)
    .sign(JWT_SECRET)

  return { accessToken, refreshToken }
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    
    // Ensure the payload has the required fields
    if (typeof payload.userId === 'string' && typeof payload.email === 'string') {
      return {
        userId: payload.userId,
        email: payload.email,
        exp: payload.exp,
        iat: payload.iat
      }
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * Set auth cookies with secure settings
 */
export async function setAuthCookies(tokens: AuthTokens) {
  const cookieStore = await cookies()
  
  // Remove old auth cookie if it exists
  if (cookieStore.get('tor-ramel-auth')) {
    cookieStore.delete('tor-ramel-auth')
  }
  
  // Set access token cookie
  cookieStore.set('auth-token', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60, // 1 hour
    path: '/'
  })
  
  // Set refresh token cookie
  cookieStore.set('refresh-token', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })
}

/**
 * Clear auth cookies
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies()
  
  cookieStore.delete('auth-token')
  cookieStore.delete('refresh-token')
  
  // Also clear old auth cookie if it exists
  if (cookieStore.get('tor-ramel-auth')) {
    cookieStore.delete('tor-ramel-auth')
  }
}

/**
 * Get current user from cookies
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')
  
  if (!token) {
    return null
  }
  
  return verifyToken(token.value)
} 