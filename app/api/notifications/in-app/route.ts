import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/jwt'

// Use NEXT_PUBLIC_SUPABASE_URL for consistency across the app
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('[In-App Notifications] Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl!, supabaseKey!)

// GET - Fetch in-app notifications
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const offset = parseInt(searchParams.get('offset') || '0')
    
    let query = supabase
      .from('in_app_notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.userId)
    
    if (unreadOnly) {
      query = query.eq('is_read', false)
    }
    
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    const { data, error, count } = await query
    
    if (error) {
      console.error('Error fetching in-app notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }
    
    // Get unread count separately
    const { count: unreadCount } = await supabase
      .from('in_app_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.userId)
      .eq('is_read', false)
    
    return NextResponse.json({
      notifications: data || [],
      total: count || 0,
      unread: unreadCount || 0,
      hasMore: (offset + limit) < (count || 0)
    })
    
  } catch (error) {
    console.error('Error in GET in-app notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Mark notification(s) as read
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { notification_ids, mark_all_read } = body
    
    if (mark_all_read) {
      // Mark all notifications as read
      const { error } = await supabase
        .from('in_app_notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.userId)
        .eq('is_read', false)
      
      if (error) {
        console.error('Error marking all notifications as read:', error)
        return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
      }
      
      // Update user's last notification check time
      await supabase
        .from('users')
        .update({ last_notification_check: new Date().toISOString() })
        .eq('id', user.userId)
      
      return NextResponse.json({ success: true, message: 'All notifications marked as read' })
    }
    
    if (!notification_ids || !Array.isArray(notification_ids) || notification_ids.length === 0) {
      return NextResponse.json({ 
        error: 'Missing notification_ids array or mark_all_read flag' 
      }, { status: 400 })
    }
    
    // Mark specific notifications as read
    const { error } = await supabase
      .from('in_app_notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .in('id', notification_ids)
      .eq('user_id', user.userId)
    
    if (error) {
      console.error('Error marking notifications as read:', error)
      return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `${notification_ids.length} notification(s) marked as read` 
    })
    
  } catch (error) {
    console.error('Error in POST mark as read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete notification(s)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { notification_ids, delete_all_read } = body
    
    if (delete_all_read) {
      // Delete all read notifications
      const { error } = await supabase
        .from('in_app_notifications')
        .delete()
        .eq('user_id', user.userId)
        .eq('is_read', true)
      
      if (error) {
        console.error('Error deleting read notifications:', error)
        return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 })
      }
      
      return NextResponse.json({ success: true, message: 'All read notifications deleted' })
    }
    
    if (!notification_ids || !Array.isArray(notification_ids) || notification_ids.length === 0) {
      return NextResponse.json({ 
        error: 'Missing notification_ids array or delete_all_read flag' 
      }, { status: 400 })
    }
    
    // Delete specific notifications
    const { error } = await supabase
      .from('in_app_notifications')
      .delete()
      .in('id', notification_ids)
      .eq('user_id', user.userId)
    
    if (error) {
      console.error('Error deleting notifications:', error)
      return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `${notification_ids.length} notification(s) deleted` 
    })
    
  } catch (error) {
    console.error('Error in DELETE notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

