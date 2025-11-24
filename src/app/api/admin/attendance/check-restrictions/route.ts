// app/api/admin/attendance/check-restrictions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { employees, employeeRestrictions } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/utils';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    
    // Get employee record
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, userId))
      .limit(1);

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Check if employee has any restrictions
    const assigned = await db
      .select({ restriction_type: employeeRestrictions.restrictionType, restriction_id: employeeRestrictions.restrictionId })
      .from(employeeRestrictions)
      .where(eq(employeeRestrictions.employeeId, employee.id));

    let hasGeoRestriction = false;
    let hasIPRestriction = false;

    if (assigned && assigned.length > 0) {
      for (const r of assigned) {
        const t = (r as any).restriction_type;
        if (t === 'GEO') hasGeoRestriction = true;
        if (t === 'IP') hasIPRestriction = true;
        if (hasGeoRestriction && hasIPRestriction) break;
      }
    }

    return NextResponse.json({
      hasGeoRestriction,
      hasIPRestriction,
      requiresLocation: hasGeoRestriction,
    });
  } catch (error) {
    console.error('Error checking restrictions:', error);
    return NextResponse.json(
      {
        error: 'Failed to check restrictions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
