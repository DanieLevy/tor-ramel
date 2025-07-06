import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'
import http from 'http'
import https from 'https'

// Create optimized HTTP agents with better connection pooling
const httpAgent = new http.Agent({ 
  keepAlive: true, 
  maxSockets: 15,
  maxFreeSockets: 8,
  timeout: 2500,
  keepAliveMsecs: 3000
} as any)

const httpsAgent = new https.Agent({ 
  keepAlive: true, 
  maxSockets: 15,
  maxFreeSockets: 8,
  rejectUnauthorized: false,
  timeout: 2500,
  keepAliveMsecs: 3000
} as any)

// Create optimized axios instance
const axiosInstance = axios.create({
  httpAgent,
  httpsAgent,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'he-IL,he;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  },
  timeout: 2500,
  responseType: 'arraybuffer',
  maxRedirects: 2,
  decompress: true,
  validateStatus: (status) => status < 500
})

async function checkDate(dateStr: string) {
  const userId = process.env.USER_ID || '4481'
  const codeAuth = process.env.CODE_AUTH || 'Sa1W2GjL'
  
  const params = {
    i: 'cmFtZWwzMw==', // ramel33
    s: 'MjY1',         // 265
    mm: 'y',
    lang: 'he',
    datef: dateStr
  }

  const url = 'https://mytor.co.il/home.php'

  const response = await axiosInstance.get(url, {
    params,
    headers: {
      'Cookie': `userID=${userId}; codeAuth=${codeAuth}`,
      'Referer': 'https://mytor.co.il'
    }
  })

  // Parse HTML
  const $ = cheerio.load(response.data)
  
  // Quick check for no appointments
  const dangerElem = $('h4.tx-danger').first()
  if (dangerElem.length > 0) {
    const dangerText = dangerElem.text()
    if (dangerText.includes('לא נשארו תורים פנויים') || dangerText.includes('אין תורים זמינים')) {
      return { date: dateStr, available: false, times: [] }
    }
  }

  // Extract available times efficiently
  const availableTimes: string[] = []
  $('button.btn.btn-outline-dark.btn-block').each((i, elem) => {
    const timeText = $(elem).text().trim()
    if (/^\d{1,2}:\d{2}$/.test(timeText)) {
      availableTimes.push(timeText)
    }
  })

  return {
    date: dateStr,
    available: availableTimes.length > 0,
    times: availableTimes.sort()
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

    const result = await checkDate(date)
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

    const result = await checkDate(date)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error checking appointment:', error)
    return NextResponse.json({ 
      error: 'Failed to check appointment',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 