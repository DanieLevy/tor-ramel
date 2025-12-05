import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for tracking since this may be called from service worker
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

type EventType = 'delivered' | 'opened' | 'clicked' | 'dismissed' | 'action_taken'

interface TrackingPayload {
  event_type: EventType
  notification_id?: string
  subscription_id?: string
  user_id?: string
  push_subscription_id?: string
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as TrackingPayload
    const { event_type, notification_id, subscription_id, user_id, push_subscription_id, metadata } = body

    // Validate event type
    const validEventTypes: EventType[] = ['delivered', 'opened', 'clicked', 'dismissed', 'action_taken']
    if (!event_type || !validEventTypes.includes(event_type)) {
      return NextResponse.json(
        { error: 'Invalid or missing event_type' },
        { status: 400 }
      )
    }

    // At least one identifier should be provided
    if (!notification_id && !subscription_id && !user_id && !push_subscription_id) {
      return NextResponse.json(
        { error: 'At least one identifier (notification_id, subscription_id, user_id, or push_subscription_id) is required' },
        { status: 400 }
      )
    }

    // Try to get user_id from subscription if not provided
    let resolvedUserId = user_id
    
    if (!resolvedUserId && subscription_id) {
      const { data: subscription } = await supabase
        .from('notification_subscriptions')
        .select('user_id')
        .eq('id', subscription_id)
        .single()
      
      resolvedUserId = subscription?.user_id
    }

    if (!resolvedUserId && push_subscription_id) {
      const { data: pushSub } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .eq('id', push_subscription_id)
        .single()
      
      resolvedUserId = pushSub?.user_id
    }

    // Insert the event
    const { data, error } = await supabase
      .from('notification_events')
      .insert({
        notification_id: notification_id || null,
        user_id: resolvedUserId || null,
        event_type,
        push_subscription_id: push_subscription_id || null,
        metadata: {
          ...metadata,
          subscription_id,
          tracked_at: new Date().toISOString(),
          user_agent: request.headers.get('user-agent') || 'unknown'
        }
      })
      .select('id')
      .single()

    if (error) {
      console.error('[Notification Track API] Failed to insert event:', error)
      // Don't fail the request - tracking is non-critical
      return NextResponse.json({
        success: false,
        warning: 'Event tracking failed but request completed'
      })
    }

    console.log(`[Notification Track API] Tracked ${event_type} event: ${data.id}`)

    // Update in-app notification if marking as opened/clicked
    if ((event_type === 'opened' || event_type === 'clicked') && notification_id && resolvedUserId) {
      await supabase
        .from('in_app_notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notification_id)
        .eq('user_id', resolvedUserId)
    }

    return NextResponse.json({
      success: true,
      event_id: data.id
    })
  } catch (error) {
    console.error('[Notification Track API] Error:', error)
    // Return success anyway - tracking shouldn't block user experience
    return NextResponse.json({
      success: false,
      warning: 'Event tracking encountered an error'
    })
  }
}

// GET endpoint for fetching events (admin/analytics use)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')
    const eventType = searchParams.get('event_type')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('notification_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[Notification Track API] Failed to fetch events:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      events: data || [],
      total: count || 0,
      hasMore: (offset + limit) < (count || 0)
    })
  } catch (error) {
    console.error('[Notification Track API] GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




