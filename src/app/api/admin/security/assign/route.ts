// app/api/admin/security/assign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { verifyToken } from '@/lib/auth/utils';
import { sql, eq, and } from 'drizzle-orm';
import { employeeRestrictions, ipRestrictions, geoRestrictions, employees } from '@/lib/database/schema';

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
    const { employee_id, restriction_type, restriction_id } = body;

    // Validate input
    if (!employee_id || !restriction_type || !restriction_id) {
      return NextResponse.json(
        { error: 'employee_id, restriction_type, and restriction_id are required' },
        { status: 400 }
      );
    }

    if (!['IP', 'GEO'].includes(restriction_type)) {
      return NextResponse.json(
        { error: 'restriction_type must be IP or GEO' },
        { status: 400 }
      );
    }

    // Verify employee exists (active)
    const emp = await db
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.id, employee_id), eq(employees.status, 'active')))
      .limit(1);

    if (!emp || emp.length === 0) {
      return NextResponse.json({ error: 'Employee not found or inactive' }, { status: 404 });
    }

    // Verify restriction exists based on type using typed queries
    if (restriction_type === 'IP') {
      const r = await db.select({ id: ipRestrictions.id }).from(ipRestrictions).where(eq(ipRestrictions.id, restriction_id)).limit(1);
      if (!r || r.length === 0) {
        return NextResponse.json({ error: `IP restriction with id ${restriction_id} not found` }, { status: 404 });
      }
    } else {
      const r = await db.select({ id: geoRestrictions.id }).from(geoRestrictions).where(eq(geoRestrictions.id, restriction_id)).limit(1);
      if (!r || r.length === 0) {
        return NextResponse.json({ error: `GEO restriction with id ${restriction_id} not found` }, { status: 404 });
      }
    }

    // Check if the exact assignment already exists (employee + restriction_type + restriction_id)
    const existsSame = await db
      .select({ id: employeeRestrictions.id })
      .from(employeeRestrictions)
      .where(
        and(
          eq(employeeRestrictions.employeeId, employee_id),
          eq(employeeRestrictions.restrictionType, restriction_type),
          eq(employeeRestrictions.restrictionId, restriction_id)
        )
      )
      .limit(1);

    if (existsSame && existsSame.length > 0) {
      return NextResponse.json({ error: 'Restriction already assigned to this employee' }, { status: 400 });
    }

    // Insert new assignment (allow multiple assignments per employee)
    const inserted = await db.insert(employeeRestrictions).values({
      employeeId: employee_id,
      restrictionType: restriction_type,
      restrictionId: restriction_id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const assignment = inserted && inserted.length > 0 ? inserted[0] : null;

    if (!assignment) {
      return NextResponse.json({ error: 'Failed to assign restriction' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Restriction assigned to employee successfully`,
        assignment,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error assigning restriction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to assign restriction',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}