import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const userId = request.headers.get('X-User-Id') || process.env.USER_ID
    const codeAuth = request.headers.get('X-Code-Auth') || process.env.CODE_AUTH

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

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
      timeout: 5000
    })

    // Parse HTML
    const $ = cheerio.load(response.data)
    
    // Check for no appointments message
    const dangerText = $('h4.tx-danger').first().text()
    const hasNoAppointments = dangerText.includes('לא נשארו תורים פנויים') || 
                             dangerText.includes('אין תורים זמינים')
    
    if (hasNoAppointments) {
      return NextResponse.json({ 
        date, 
        available: false, 
        times: [] 
      })
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

    return NextResponse.json({
      date,
      available: availableTimes.length > 0,
      times: availableTimes.sort()
    })

  } catch (error) {
    console.error('Error checking appointment:', error)
    return NextResponse.json({ 
      error: 'Failed to check appointment',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 