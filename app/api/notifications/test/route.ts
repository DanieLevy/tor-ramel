import { NextRequest, NextResponse } from 'next/server'
import { sendNotificationEmail } from '@/lib/email-sender'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Get user from cookie
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('tor-ramel-auth')
    
    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email } = JSON.parse(authCookie.value)
    
    // Send test notification email
    const testData = {
      to: email,
      date: '2025-01-30',
      dayName: 'יום חמישי',
      times: ['09:00', '10:30', '14:00', '16:30'],
      subscriptionId: 'test-subscription-id'
    }

    console.log('📧 Sending test notification email to:', email)
    
    const emailSent = await sendNotificationEmail(testData)

    if (emailSent) {
      return NextResponse.json({ 
        success: true,
        message: 'Test email sent successfully',
        sentTo: email
      })
    } else {
      return NextResponse.json({ 
        error: 'Failed to send test email' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in test notification:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 