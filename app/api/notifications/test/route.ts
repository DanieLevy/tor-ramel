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
    
    // Send test notification email with many times to demonstrate layout
    const testData = {
      to: 'daniellofficial@gmail.com', // Override to send to requested email
      date: '2025-01-30',
      dayName: 'יום חמישי',
      times: [
        // Morning times (many)
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        // Afternoon times 
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
        // Evening times
        '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
      ],
      subscriptionId: 'test-subscription-id'
    }

    console.log('📧 Sending test notification email to: daniellofficial@gmail.com')
    console.log('📅 Total appointment times:', testData.times.length)
    
    const emailSent = await sendNotificationEmail(testData)

    if (emailSent) {
      return NextResponse.json({ 
        success: true,
        message: 'Test email sent successfully to daniellofficial@gmail.com',
        details: {
          sentTo: 'daniellofficial@gmail.com',
          appointmentCount: testData.times.length,
          date: testData.date
        }
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