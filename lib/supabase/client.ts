import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

const isProduction = process.env.NODE_ENV === 'production'

// Only log in development
if (!isProduction) {
  console.log('[Supabase] Initializing client...')
}

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
}

// Singleton pattern for connection reuse
let adminClient: SupabaseClient<Database> | null = null
let publicClient: SupabaseClient<Database> | null = null

/**
 * Get the admin Supabase client (service role - bypasses RLS)
 * Use this for server-side operations that need full access
 */
export const getSupabaseAdmin = (): SupabaseClient<Database> => {
  if (!adminClient) {
    adminClient = createClient<Database>(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            'x-connection-pool': 'reuse'
          },
          fetch: async (url, init) => {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
            
            try {
              const response = await fetch(url, {
                ...init,
                signal: controller.signal
              })
              
              clearTimeout(timeoutId)
              
              // Only log errors in production
              if (!response.ok && !isProduction) {
                console.error('[Supabase] Request failed:', response.status, url.toString().split('?')[0])
              }
              
              return response
            } catch (error) {
              clearTimeout(timeoutId)
              if (!isProduction) {
                console.error('[Supabase] Fetch error:', error instanceof Error ? error.message : String(error))
              }
              throw error
            }
          }
        },
        db: {
          schema: 'public'
        }
      }
    )
  }
  return adminClient
}

/**
 * Get the public Supabase client (anon key - respects RLS)
 * Use this for operations that should respect row-level security
 */
export const getSupabasePublic = (): SupabaseClient<Database> => {
  if (!supabaseAnonKey) {
    throw new Error('Missing SUPABASE_ANON_KEY environment variable')
  }
  
  if (!publicClient) {
    publicClient = createClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        db: {
          schema: 'public'
        }
      }
    )
  }
  return publicClient
}

// Export the admin client as default for backward compatibility
export const supabaseAdmin = getSupabaseAdmin()

/**
 * Test the Supabase connection
 */
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1)
      .maybeSingle()
    
    if (error && error.code !== 'PGRST116') {
      if (!isProduction) {
        console.error('[Supabase] Connection test failed:', error.message)
      }
      return false
    }
    
    return true
  } catch (error) {
    if (!isProduction) {
      console.error('[Supabase] Connection test error:', error)
    }
    return false
  }
}
