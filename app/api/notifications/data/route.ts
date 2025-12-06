import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/jwt'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch notification data by ID
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const dataId = searchParams.get('id')
    
    if (!dataId) {
      return NextResponse.json({ error: 'Missing data ID' }, { status: 400 })
    }
    
    // Fetch notification data
    const { data, error } = await supabase
      .from('notification_data')
      .select('*')
      .eq('id', dataId)
      .eq('user_id', user.userId)
      .single()
    
    if (error || !data) {
      return NextResponse.json({ error: 'Notification data not found' }, { status: 404 })
    }
    
    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Notification data expired' }, { status: 410 })
    }
    
    // Update access tracking
    await supabase
      .from('notification_data')
      .update({
        accessed_count: (data.accessed_count || 0) + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', dataId)
    
    return NextResponse.json({
      success: true,
      data: data.data,
      notification_type: data.notification_type
    })
    
  } catch (error) {
    console.error('Error fetching notification data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

