import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
)

export interface JWTPayload {
  userId: string
  email: string
  exp?: number
  iat?: number
}

export interface AuthTokens {
  accessToken: string
}

/**
 * Generate JWT access token (no refresh token needed)
 */
export async function generateTokens(payload: { userId: string; email: string }): Promise<AuthTokens> {
  // Generate a long-lived access token without expiration
  const accessToken = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(JWT_SECRET)

  return { accessToken }
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      // Remove expiration check - tokens are valid until logout
      clockTolerance: Infinity
    })
    
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
  
  // Set access token cookie with 1 year expiration
  cookieStore.set('auth-token', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/'
  })
}

/**
 * Clear auth cookies
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies()
  
  // Clear both old and new auth cookies
  cookieStore.delete('tor-ramel-auth')
  cookieStore.delete('auth-token')
  cookieStore.delete('refresh-token') // Clean up old refresh token cookie if exists
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