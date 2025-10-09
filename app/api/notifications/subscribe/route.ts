import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/jwt'
import { validateSubscriptionData } from '@/lib/notification-helpers'
import { sendSubscriptionConfirmationEmail } from '@/lib/email-sender'
import { pushService } from '@/lib/push-notification-service'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Get user from JWT token
    const user = await getCurrentUser()
    
    if (!user) {
      console.log('🔐 Unauthorized: No authenticated user')
      return NextResponse.json({ 
        error: 'לא מחובר למערכת - נא להתחבר מחדש',
        message: 'שגיאה בהרשמה'
      }, { status: 401 })
    }
    
    console.log('🔐 [Subscribe API] Authenticated user:', {
      userId: user.userId,
      email: user.email
    })

    const body = await request.json()
    
    // Validate subscription data
    const validation = validateSubscriptionData(body)
    if (!validation.valid) {
      console.log('Validation failed:', validation.error)
      return NextResponse.json({ 
        error: validation.error 
      }, { status: 400 })
    }

    const { subscription_date, date_range_start, date_range_end, notification_method = 'email' } = body
    
    console.log(`📝 [Subscribe API] Creating subscription with notification_method: ${notification_method}`)

    // Check for existing active subscription with same dates
    let existingSubscription
    if (subscription_date) {
      const { data } = await supabase
        .from('notification_subscriptions')
        .select('id')
        .eq('user_id', user.userId)
        .eq('subscription_date', subscription_date)
        .eq('is_active', true)
        .single()
      
      existingSubscription = data
    } else {
      const { data } = await supabase
        .from('notification_subscriptions')
        .select('id')
        .eq('user_id', user.userId)
        .eq('date_range_start', date_range_start)
        .eq('date_range_end', date_range_end)
        .eq('is_active', true)
        .single()
      
      existingSubscription = data
    }

    if (existingSubscription) {
      console.log('Duplicate subscription attempt for user:', user.userId)
      return NextResponse.json({ 
        error: 'כבר קיים מנוי פעיל לתאריכים אלו' 
      }, { status: 400 })
    }

    // Create new subscription
    const { data: newSubscription, error: insertError } = await supabase
      .from('notification_subscriptions')
      .insert({
        user_id: user.userId,
        subscription_date,
        date_range_start,
        date_range_end,
        notification_method,
        is_active: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating subscription:', insertError)
      
      // Check if it's a unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json({ 
          error: 'כבר קיים מנוי פעיל לתאריכים אלו' 
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to create subscription' 
      }, { status: 500 })
    }

    console.log(`✅ Created subscription ${newSubscription.id} for user ${user.userId} with notification_method: ${newSubscription.notification_method}`)

    // Send confirmations based on notification method
    const notificationMethod = newSubscription.notification_method || 'email'
    
    // Send confirmation email if method is 'email' or 'both'
    if (notificationMethod === 'email' || notificationMethod === 'both') {
      try {
        await sendSubscriptionConfirmationEmail({
          to: user.email,
          subscriptionId: newSubscription.id,
          subscriptionDate: newSubscription.subscription_date,
          dateRangeStart: newSubscription.date_range_start,
          dateRangeEnd: newSubscription.date_range_end
        })
        console.log(`📧 [Subscribe API] Sent subscription confirmation email to ${user.email}`)
      } catch (emailError) {
        console.error('❌ [Subscribe API] Failed to send confirmation email:', emailError)
        // Don't fail the request if email sending fails
      }
    }
    
    // Send confirmation push if method is 'push' or 'both'
    if (notificationMethod === 'push' || notificationMethod === 'both') {
      try {
        console.log(`📱 [Subscribe API] Sending subscription confirmation push to user ${user.userId}`)
        
        // Prepare confirmation message
        const dateText = newSubscription.subscription_date 
          ? newSubscription.subscription_date 
          : `${newSubscription.date_range_start} - ${newSubscription.date_range_end}`
        
        // Call pushService directly (server-side, no HTTP needed)
        const result = await pushService.sendToUser(user.userId, {
          title: '✅ הרשמה התקבלה בהצלחה',
          body: `נרשמת בהצלחה לקבלת התראות על תורים פנויים עבור ${dateText}`,
          url: '/subscribe',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: 'subscription-confirmation',
          requireInteraction: false
        })
        
        if (result.success) {
          console.log(`✅ [Subscribe API] Confirmation push sent: ${result.sent} sent, ${result.failed} failed`)
        } else {
          console.error(`❌ [Subscribe API] Confirmation push failed:`, result.errors)
        }
      } catch (pushError) {
        console.error('❌ [Subscribe API] Failed to send confirmation push:', pushError)
        // Don't fail the request if push sending fails
      }
    }

    return NextResponse.json(newSubscription)

  } catch (error) {
    console.error('Error in subscribe API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 

export async function GET(request: NextRequest) {
  try {
    // Get user from JWT token
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get all subscriptions for user
    const { data: subscriptions, error } = await supabase
      .from('notification_subscriptions')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch subscriptions' 
      }, { status: 500 })
    }
    
    return NextResponse.json(subscriptions || [])
    
  } catch (error) {
    console.error('Error in GET subscriptions:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 