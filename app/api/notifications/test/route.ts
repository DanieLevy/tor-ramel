import { NextRequest, NextResponse } from 'next/server'
import { sendNotificationEmail } from '@/lib/email-sender'
import { getCurrentUser } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    // Get user from JWT token
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Send test notification email
    const testData = {
      to: user.email,
      date: '2025-01-30',
      dayName: 'יום חמישי',
      times: ['09:00', '10:30', '14:00', '16:30'],
      subscriptionId: 'test-subscription-id'
    }

    console.log('📧 Sending test notification email to:', user.email)
    
    const emailSent = await sendNotificationEmail(testData)

    if (emailSent) {
      return NextResponse.json({ 
        success: true,
        message: 'Test email sent successfully',
        sentTo: user.email
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