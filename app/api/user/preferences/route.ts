import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/jwt'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch user preferences
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to get existing preferences
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    // If no preferences exist, return defaults
    if (!preferences) {
      return NextResponse.json({
        proactive_notifications_enabled: true,
        hot_alerts_enabled: true,
        weekly_digest_enabled: true,
        inactivity_alerts_enabled: true,
        expiry_reminders_enabled: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        preferred_times: [],
        notification_cooldown_hours: 4,
        last_app_open: new Date().toISOString(),
        last_proactive_notification_at: null
      })
    }

    return NextResponse.json(preferences)

  } catch (error) {
    console.error('Error in GET /api/user/preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create or update user preferences
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate preferred_times format if provided
    if (body.preferred_times && Array.isArray(body.preferred_times)) {
      for (const range of body.preferred_times) {
        if (!range.start || !range.end) {
          return NextResponse.json(
            { error: 'Invalid preferred_times format. Expected {start: "HH:MM", end: "HH:MM"}' },
            { status: 400 }
          )
        }
      }
    }

    // Upsert preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.userId,
        ...body,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving preferences:', error)
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in POST /api/user/preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Partial update of preferences
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Check if preferences exist
    const { data: existing } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.userId)
      .single()

    if (!existing) {
      // Create with defaults + updates
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.userId,
          ...body,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating preferences:', error)
        return NextResponse.json({ error: 'Failed to create preferences' }, { status: 500 })
      }

      return NextResponse.json(data)
    }

    // Update existing
    const { data, error } = await supabase
      .from('user_preferences')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating preferences:', error)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in PATCH /api/user/preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



