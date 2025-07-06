import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/jwt'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 15
    const { id: subscriptionId } = await params
    
    // Get user from JWT token
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify subscription belongs to user
    const { data: subscription, error: fetchError } = await supabase
      .from('notification_subscriptions')
      .select('id')
      .eq('id', subscriptionId)
      .eq('user_id', user.userId)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json({ 
        error: 'Subscription not found' 
      }, { status: 404 })
    }

    // Delete the subscription
    const { error: deleteError } = await supabase
      .from('notification_subscriptions')
      .delete()
      .eq('id', subscriptionId)

    if (deleteError) {
      console.error('Error deleting subscription:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete subscription' 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in delete subscription API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 