import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/jwt'
import { getUserPreferences, updateUserPreferences } from '@/lib/user-preferences'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const preferences = await getUserPreferences(user.userId)
    
    if (!preferences) {
      return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      preferences
    })
  } catch (error) {
    console.error('[User Preferences API] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Validate and extract allowed fields
    const allowedFields = [
      'hot_alerts_enabled',
      'proactive_notifications_enabled',
      'weekly_digest_enabled',
      'expiry_reminders_enabled',
      'inactivity_alerts_enabled',
      'quiet_hours_start',
      'quiet_hours_end',
      'notification_cooldown_hours'
    ]
    
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }
    
    const preferences = await updateUserPreferences(user.userId, updates)
    
    if (!preferences) {
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      preferences
    })
  } catch (error) {
    console.error('[User Preferences API] PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
