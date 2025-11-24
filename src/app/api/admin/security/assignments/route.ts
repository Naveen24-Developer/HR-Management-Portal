// app/api/admin/security/assignments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { verifyToken } from '@/lib/auth/utils';
import { sql } from 'drizzle-orm';
import { employeeRestrictions } from '@/lib/database/schema';

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

    // Use Drizzle select to return a consistent shape
    const assignments = await db.select({
      id: employeeRestrictions.id,
      employee_id: employeeRestrictions.employeeId,
      restriction_type: employeeRestrictions.restrictionType,
      restriction_id: employeeRestrictions.restrictionId,
      created_at: employeeRestrictions.createdAt,
    }).from(employeeRestrictions).orderBy(sql`created_at DESC`);

    return NextResponse.json({ success: true, assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to fetch assignments',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}