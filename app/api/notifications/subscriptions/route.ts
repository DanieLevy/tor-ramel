import { apiResponse, apiError, CachePresets } from '@/lib/api-utils'
import { supabaseAdmin } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/jwt'

export const GET = async () => {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return apiError('Unauthorized', 401)
    }

    // Get all subscriptions for user
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('notification_subscriptions')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('[Subscriptions API] Database error:', fetchError.message)
      return apiError('Failed to fetch subscriptions', 500)
    }

    // Private short cache for user-specific data
    return apiResponse(subscriptions ?? [], CachePresets.PRIVATE_SHORT)

  } catch (error) {
    console.error('[Subscriptions API] Error:', error instanceof Error ? error.message : 'Unknown error')
    return apiError('Internal server error', 500)
  }
}
