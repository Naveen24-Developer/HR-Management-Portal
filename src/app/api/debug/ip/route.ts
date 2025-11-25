// app/api/debug/ip/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { extractClientIP, debugHeaders } from '@/lib/restrictions/ip-validator';

export async function GET(req: NextRequest) {
  debugHeaders(req);
  
  const clientIP = extractClientIP(req);
  
  return NextResponse.json({
    clientIP,
    headers: Object.fromEntries(req.headers.entries()),
    environment: process.env.NODE_ENV,
  });
}