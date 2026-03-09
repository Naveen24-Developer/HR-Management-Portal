// app/api/admin/attendance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { attendance, employees, users, userProfiles, departments } from '@/lib/database/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });
    }
    
    const isAdmin = ['admin', 'hr'].includes(decoded.role);

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const view = searchParams.get('view') || 'daily';
    const department = searchParams.get('department');
    const status = searchParams.get('status');

    // Build the where conditions array
    const conditions = [];

    // Apply filters based on view
    if (view === 'daily') {
      conditions.push(eq(attendance.date, date));
    } else if (view === 'monthly') {
      const startOfMonth = new Date(date);
      startOfMonth.setDate(1);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);

      conditions.push(
        and(
          gte(attendance.date, startOfMonth.toISOString().split('T')[0]),
          lte(attendance.date, endOfMonth.toISOString().split('T')[0])
        )
      );
    }

    // Apply department filter
    if (department) {
      conditions.push(eq(departments.name, department));
    }

    // Apply status filter
    if (status) {
      conditions.push(eq(attendance.status, status));
    }

    // Build the final query with all conditions
    const finalConditions = conditions.length > 0 ? and(...conditions) : undefined;

    const records = await db
      .select({
        id: attendance.id,
        employeeId: employees.id,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        email: users.email,
        departmentName: departments.name,
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        workHours: attendance.workHours,
        status: attendance.status,
        lateMinutes: attendance.lateMinutes,
        earlyCheckout: attendance.earlyCheckout,
        overtimeMinutes: attendance.overtimeMinutes,
        notes: attendance.notes,
      })
      .from(attendance)
      .innerJoin(employees, eq(attendance.employeeId, employees.id))
      .innerJoin(users, eq(employees.userId, users.id))
      .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(finalConditions)
      .orderBy(desc(attendance.date));

    return NextResponse.json({
      attendance: records,
      total: records.length,
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}