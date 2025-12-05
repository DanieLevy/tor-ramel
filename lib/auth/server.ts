import 'server-only'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCurrentUser } from './jwt'

/**
 * Require authentication for a server component or API route
 * Redirects to login if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return user
}

/**
 * Get user from request headers (for API routes)
 * Returns null if not authenticated
 */
export async function getUserFromHeaders() {
  const headersList = await headers()
  const userId = headersList.get('x-user-id')
  const email = headersList.get('x-user-email')
  
  if (!userId || !email) {
    return null
  }
  
  return { userId, email }
}

/**
 * Auth user type for handlers
 */
interface AuthUser {
  userId: string
  email: string
}

/**
 * Type for API route handlers that require authentication
 */
type AuthenticatedHandler<TArgs extends unknown[], TReturn> = (
  ...args: [...TArgs, AuthUser]
) => Promise<TReturn>

/**
 * Protect an API route handler
 * Returns 401 if not authenticated
 */
export function withAuth<TArgs extends unknown[], TReturn>(
  handler: AuthenticatedHandler<TArgs, TReturn>
): (...args: TArgs) => Promise<TReturn | Response> {
  return async (...args: TArgs) => {
    const user = await getUserFromHeaders()
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Add user to the handler arguments
    return handler(...args, user)
  }
} 