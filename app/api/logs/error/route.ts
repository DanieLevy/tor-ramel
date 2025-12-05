/**
 * Frontend Error Logging API
 * 
 * Endpoint for client-side error reporting.
 * Captures frontend errors, service worker issues, and network failures.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth/jwt';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Rate limiting - max 10 errors per minute per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return false;
  }
  
  if (entry.count >= RATE_LIMIT) {
    return true;
  }
  
  entry.count++;
  return false;
}

// Clean up rate limit map periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Check rate limit
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    const {
      error_type = 'frontend_error',
      message,
      source,
      stack_trace,
      operation,
      metadata = {}
    } = body;
    
    // Validate required fields
    if (!message || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: message, source' },
        { status: 400 }
      );
    }
    
    // Validate error_type
    const validTypes = [
      'frontend_error',
      'worker_error',
      'network_error',
      'validation_error',
      'unknown_error'
    ];
    
    if (!validTypes.includes(error_type)) {
      return NextResponse.json(
        { error: `Invalid error_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Get user if authenticated
    let user_id: string | null = null;
    let user_email: string | null = null;
    
    try {
      const user = await getCurrentUser();
      if (user) {
        user_id = user.userId;
        user_email = user.email;
      }
    } catch {
      // User not authenticated, continue without user info
    }
    
    // Build log entry
    const logEntry = {
      error_type,
      message: String(message).substring(0, 5000),
      stack_trace: stack_trace ? String(stack_trace).substring(0, 5000) : null,
      source: String(source).substring(0, 500),
      operation: operation ? String(operation).substring(0, 200) : null,
      user_id,
      user_email,
      user_agent: request.headers.get('user-agent'),
      ip_address: ip,
      metadata: {
        ...metadata,
        client_timestamp: metadata.timestamp,
        url: metadata.url?.substring(0, 500),
        referrer: request.headers.get('referer')?.substring(0, 500)
      },
      environment: process.env.NODE_ENV || 'production'
    };
    
    // Insert into database
    const { error: dbError } = await supabase
      .from('error_logs')
      .insert(logEntry);
    
    if (dbError) {
      console.error('[Error API] Failed to save error log:', dbError);
      return NextResponse.json(
        { error: 'Failed to save error log' },
        { status: 500 }
      );
    }
    
    console.log(`[Error API] ❌ Logged ${error_type} from ${source}: ${message.substring(0, 50)}`);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[Error API] Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

