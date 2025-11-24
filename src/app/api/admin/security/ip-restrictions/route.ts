// app/api/admin/security/ip-restrictions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { verifyToken } from '@/lib/auth/utils';
import { isValidIPv4, isValidCIDR } from '@/lib/restrictions/ip-validator';
import { sql } from 'drizzle-orm';
import { ipRestrictions } from '@/lib/database/schema';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Query ip_restrictions table using Drizzle
    const restrictions = await db.select({
      id: ipRestrictions.id,
      title: ipRestrictions.title,
      allowedIps: ipRestrictions.allowedIps,
      createdAt: ipRestrictions.createdAt,
      updatedAt: ipRestrictions.updatedAt,
    }).from(ipRestrictions).orderBy(sql`created_at DESC`);

    return NextResponse.json({ success: true, restrictions });
  } catch (error) {
    console.error('Error fetching IP restrictions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to fetch IP restrictions',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, ips } = body;

    // Validate input
    if (!title || !ips || !Array.isArray(ips) || ips.length === 0) {
      return NextResponse.json(
        { error: 'Title and at least one IP address are required' },
        { status: 400 }
      );
    }

    // Validate each IP
    for (const ip of ips) {
      const trimmed = ip.trim();
      const isExact = isValidIPv4(trimmed);
      const isCIDR = isValidCIDR(trimmed);
      
      if (!isExact && !isCIDR) {
        return NextResponse.json(
          { error: `Invalid IP or CIDR format: ${ip}` },
          { status: 400 }
        );
      }
    }

    // Insert into ip_restrictions using Drizzle
    const inserted = await db.insert(ipRestrictions).values({
      title,
      allowedIps: ips,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    if (!inserted || inserted.length === 0) {
      return NextResponse.json({ error: 'Failed to create IP restriction' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'IP restriction created successfully', restriction: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating IP restriction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : 'No stack trace';
    return NextResponse.json(
      { 
        error: 'Failed to create IP restriction',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
      },
      { status: 500 }
    );
  }
}
