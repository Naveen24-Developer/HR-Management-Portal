// app/api/admin/attendance/today/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { attendance, employees } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/utils';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Get employee record using decoded.userId or decoded.id
    const userId = decoded.userId || decoded.id;
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, userId))
      .limit(1);

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Get attendance record for the date
    const [record] = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, employee.id),
          eq(attendance.date, date)
        )
      )
      .limit(1);

    if (!record) {
      return NextResponse.json({
        attendance: {
          hasCheckedIn: false,
          hasCheckedOut: false,
          checkInTime: null,
          checkOutTime: null,
          workHours: 0,
          status: 'not_checked_in',
          lateMinutes: 0,
          earlyCheckout: false,
          currentWorkHours: 0,
        },
      });
    }

    // Calculate current work hours if checked in but not out
    let currentWorkHours = parseFloat(record.workHours || '0');
    if (record.checkIn && !record.checkOut) {
      const checkInTime = new Date(record.checkIn);
      const now = new Date();
      currentWorkHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    }

    return NextResponse.json({
      attendance: {
        hasCheckedIn: !!record.checkIn,
        hasCheckedOut: !!record.checkOut,
        checkInTime: record.checkIn,
        checkOutTime: record.checkOut,
        workHours: parseFloat(record.workHours || '0'),
        status: record.status,
        lateMinutes: record.lateMinutes || 0,
        earlyCheckout: record.earlyCheckout || false,
        overtimeMinutes: record.overtimeMinutes || 0,
        currentWorkHours: parseFloat(currentWorkHours.toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}