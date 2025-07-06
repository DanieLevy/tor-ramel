import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Verify secret token
    const authHeader = request.headers.get('authorization')
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`
    
    if (!authHeader || authHeader !== expectedToken) {
      console.warn('Unauthorized notification processor request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Note: This endpoint is maintained for manual testing
    // The actual processing happens within the auto-check Netlify function
    console.log('📌 Notification processing is now handled within the auto-check function')

    return NextResponse.json({ 
      success: true,
      message: 'Notification processing is now integrated into the auto-check function'
    })

  } catch (error) {
    console.error('Error in notification processor:', error)
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 