import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/jwt'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch user's booked appointments
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: appointments, error, count } = await supabase
      .from('booked_appointments')
      .select('*', { count: 'exact' })
      .eq('user_id', user.userId)
      .order('booked_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching booked appointments:', error)
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
    }

    // Calculate success stats
    const { count: totalBooked } = await supabase
      .from('booked_appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.userId)

    const { count: fromSubscription } = await supabase
      .from('booked_appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.userId)
      .eq('source', 'subscription')

    const { count: fromProactive } = await supabase
      .from('booked_appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.userId)
      .eq('source', 'proactive')

    return NextResponse.json({
      appointments: appointments || [],
      total: count || 0,
      hasMore: (offset + limit) < (count || 0),
      stats: {
        total_booked: totalBooked || 0,
        from_subscription: fromSubscription || 0,
        from_proactive: fromProactive || 0,
        from_search: (totalBooked || 0) - (fromSubscription || 0) - (fromProactive || 0)
      }
    })

  } catch (error) {
    console.error('Error in GET /api/appointments/booked:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Mark an appointment as booked
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { booked_date, booked_time, subscription_id, source = 'manual', booking_url, notes } = body

    if (!booked_date) {
      return NextResponse.json({ error: 'booked_date is required' }, { status: 400 })
    }

    // Validate source
    const validSources = ['subscription', 'proactive', 'manual', 'search']
    if (!validSources.includes(source)) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('booked_appointments')
      .insert({
        user_id: user.userId,
        booked_date,
        booked_time,
        subscription_id,
        source,
        booking_url,
        notes,
        booked_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating booked appointment:', error)
      return NextResponse.json({ error: 'Failed to create booked appointment' }, { status: 500 })
    }

    // If from subscription, optionally mark subscription as completed
    if (subscription_id && source === 'subscription') {
      await supabase
        .from('notification_subscriptions')
        .update({
          subscription_status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', subscription_id)
        .eq('user_id', user.userId)
    }

    return NextResponse.json(data, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/appointments/booked:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a booked appointment record
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('booked_appointments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.userId)

    if (error) {
      console.error('Error deleting booked appointment:', error)
      return NextResponse.json({ error: 'Failed to delete booked appointment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in DELETE /api/appointments/booked:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

