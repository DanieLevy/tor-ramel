import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendNotificationEmail } from '@/lib/email-sender'
import { 
  cleanupExpiredSubscriptions, 
  cleanupNotificationQueue,
  retryFailedNotifications 
} from '@/lib/notification-helpers'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verify secret token
    const authHeader = request.headers.get('authorization')
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`
    
    if (!authHeader || authHeader !== expectedToken) {
      console.warn('Unauthorized notification processor request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔔 Processing notification queue...')

    // Run cleanup tasks first (in parallel)
    await Promise.all([
      cleanupExpiredSubscriptions(),
      cleanupNotificationQueue(),
      retryFailedNotifications()
    ])

    // Get pending notifications from queue
    const { data: queueItems, error: queueError } = await supabase
      .from('notification_queue')
      .select(`
        *,
        subscription:notification_subscriptions!inner(
          id,
          user_id,
          subscription_date,
          date_range_start,
          date_range_end,
          is_active,
          users!inner(email)
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10) // Process max 10 at a time

    if (queueError) {
      console.error('Error fetching queue:', queueError)
      return NextResponse.json({ 
        error: 'Failed to fetch notification queue',
        details: queueError.message
      }, { status: 500 })
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('No pending notifications to process')
      return NextResponse.json({ 
        processed: 0,
        message: 'No pending notifications' 
      })
    }

    console.log(`Found ${queueItems.length} pending notifications`)

    let processed = 0
    let failed = 0
    const errors: any[] = []

    // Process each notification
    for (const item of queueItems) {
      try {
        const { subscription, appointment_date, available_times, new_times } = item
        const userEmail = subscription.users.email

        // Validate subscription is still active
        if (!subscription.is_active) {
          console.log(`Skipping inactive subscription ${subscription.id}`)
          await supabase
            .from('notification_queue')
            .update({ 
              status: 'skipped',
              processed_at: new Date().toISOString(),
              error_message: 'Subscription no longer active'
            })
            .eq('id', item.id)
          continue
        }

        // Mark as processing
        await supabase
          .from('notification_queue')
          .update({ 
            status: 'processing',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id)

        // Check if user has already been notified for these exact times today
        const { data: recentNotification } = await supabase
          .from('notified_appointments')
          .select('id')
          .eq('subscription_id', subscription.id)
          .eq('appointment_date', appointment_date)
          .eq('notified_times', new_times)
          .gte('notification_sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .single()

        if (recentNotification) {
          console.log(`Skipping duplicate notification for subscription ${subscription.id}`)
          await supabase
            .from('notification_queue')
            .update({ 
              status: 'skipped',
              error_message: 'Duplicate notification within 24 hours'
            })
            .eq('id', item.id)
          continue
        }

        // Calculate day name for the appointment date
        const dayName = new Intl.DateTimeFormat('he-IL', {
          timeZone: 'Asia/Jerusalem',
          weekday: 'long'
        }).format(new Date(appointment_date + 'T00:00:00'))

        // Send email with timeout
        const emailTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email timeout')), 10000)
        )
        
        const emailPromise = sendNotificationEmail({
          to: userEmail,
          date: appointment_date,
          dayName: dayName,
          times: new_times,
          subscriptionId: subscription.id
        })

        const emailSent = await Promise.race([emailPromise, emailTimeout]) as boolean

        if (emailSent) {
          // Record successful notification
          const { error: notifyError } = await supabase
            .from('notified_appointments')
            .insert({
              subscription_id: subscription.id,
              appointment_date: appointment_date,
              notified_times: new_times,
              notification_sent_at: new Date().toISOString()
            })

          if (notifyError) {
            console.error('Error recording notification:', notifyError)
          }

          // Update queue item
          await supabase
            .from('notification_queue')
            .update({ 
              status: 'sent',
              processed_at: new Date().toISOString()
            })
            .eq('id', item.id)

          processed++
          console.log(`✅ Email sent to ${userEmail} for ${appointment_date}`)
        } else {
          throw new Error('Email sending failed')
        }

      } catch (error) {
        console.error(`Failed to process notification ${item.id}:`, error)
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push({
          queueId: item.id,
          error: errorMessage,
          email: item.subscription?.users?.email
        })
        
        // Mark as failed
        await supabase
          .from('notification_queue')
          .update({ 
            status: 'failed',
            processed_at: new Date().toISOString(),
            error_message: errorMessage
          })
          .eq('id', item.id)

        failed++
      }
    }

    const executionTime = Date.now() - startTime
    console.log(`✅ Processed ${processed} notifications, ${failed} failed in ${executionTime}ms`)

    return NextResponse.json({ 
      success: true,
      processed,
      failed,
      total: queueItems.length,
      executionTime,
      errors: failed > 0 ? errors : undefined
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('Error in notification processor:', error)
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      executionTime
    }, { status: 500 })
  }
} 