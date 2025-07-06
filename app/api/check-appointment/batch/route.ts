import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'

export async function POST(request: NextRequest) {
  try {
    const { dates } = await request.json()
    const userId = request.headers.get('X-User-Id') || process.env.USER_ID
    const codeAuth = request.headers.get('X-Code-Auth') || process.env.CODE_AUTH

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'Dates array is required' }, { status: 400 })
    }

    // Limit to prevent abuse
    if (dates.length > 30) {
      return NextResponse.json({ error: 'Maximum 30 dates allowed' }, { status: 400 })
    }

    // Check all dates in parallel
    const promises = dates.map(async (date) => {
      try {
        const params = {
          i: 'cmFtZWwzMw==', // ramel33
          s: 'MjY1',         // 265
          mm: 'y',
          lang: 'he',
          datef: date
        }

        const response = await axios.get('https://mytor.co.il/home.php', {
          params,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'he-IL,he;q=0.9',
            'Cookie': `userID=${userId}; codeAuth=${codeAuth}`,
            'Referer': 'https://mytor.co.il'
          },
          timeout: 8000 // Slightly lower timeout for batch requests
        })

        // Parse HTML
        const $ = cheerio.load(response.data)
        
        // Check for no appointments message
        const dangerText = $('h4.tx-danger').first().text()
        const hasNoAppointments = dangerText.includes('לא נשארו תורים פנויים') || 
                                 dangerText.includes('אין תורים זמינים')
        
        if (hasNoAppointments) {
          return { 
            date, 
            available: false, 
            times: [] 
          }
        }

        // Extract available times
        const availableTimes: string[] = []
        const timeButtons = $('button.btn.btn-outline-dark.btn-block')
        
        timeButtons.each((i, elem) => {
          const timeText = $(elem).text().trim()
          if (/^\d{1,2}:\d{2}$/.test(timeText)) {
            availableTimes.push(timeText)
          }
        })

        return {
          date,
          available: availableTimes.length > 0,
          times: availableTimes.sort()
        }
      } catch (error) {
        console.error(`Error checking date ${date}:`, error)
        return {
          date,
          available: false,
          times: [],
          error: true
        }
      }
    })

    const results = await Promise.all(promises)

    return NextResponse.json({ results })

  } catch (error) {
    console.error('Error in batch check:', error)
    return NextResponse.json({ 
      error: 'Failed to check appointments',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 