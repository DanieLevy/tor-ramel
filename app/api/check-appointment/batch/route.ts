import { NextRequest, NextResponse } from 'next/server'
import { getCachedChecker } from '@/lib/appointment-checker'

/**
 * Batch date appointment check API
 * Uses shared appointment checker with caching for better performance
 */

export async function POST(request: NextRequest) {
  try {
    const { dates } = await request.json()

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'Dates array is required' }, { status: 400 })
    }

    // Limit to prevent abuse
    if (dates.length > 30) {
      return NextResponse.json({ error: 'Maximum 30 dates allowed' }, { status: 400 })
    }

    const checker = getCachedChecker()
    const results = await checker.checkBatch(dates, 6, 100)

    return NextResponse.json({ results })

  } catch (error) {
    console.error('Error in batch check:', error)
    return NextResponse.json({ 
      error: 'Failed to check appointments',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
