import { NextRequest, NextResponse } from 'next/server'
import { getDefaultChecker } from '@/lib/appointment-checker'

/**
 * Single date appointment check API
 * Uses shared appointment checker without caching for fresh data
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

    const checker = getDefaultChecker()
    const result = await checker.checkSingleDate(date)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error checking appointment:', error)
    return NextResponse.json({ 
      error: 'Failed to check appointment',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json()

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

    const checker = getDefaultChecker()
    const result = await checker.checkSingleDate(date)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error checking appointment:', error)
    return NextResponse.json({ 
      error: 'Failed to check appointment',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
