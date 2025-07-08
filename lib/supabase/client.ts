import { createClient } from '@supabase/supabase-js'

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseServiceRoleKey
  })
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client with custom configuration
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      fetch: async (url, init) => {
        try {
          console.log('Supabase request:', url)
          
          // Add timeout to prevent hanging requests
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
          
          const response = await fetch(url, {
            ...init,
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          if (!response.ok) {
            console.error('Supabase response error:', {
              status: response.status,
              statusText: response.statusText,
              url: url
            })
          }
          
          return response
        } catch (error) {
          console.error('Supabase fetch error:', {
            url: url,
            error: error instanceof Error ? error.message : String(error),
            type: error instanceof Error ? error.name : typeof error
          })
          throw error
        }
      }
    }
  }
)

// Test the connection
export async function testSupabaseConnection() {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found", which is ok
      console.error('Supabase connection test failed:', error)
      return false
    }
    
    console.log('✅ Supabase connection test successful')
    return true
  } catch (error) {
    console.error('Supabase connection test error:', error)
    return false
  }
} 