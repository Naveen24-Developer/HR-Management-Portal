// app/api/admin/attendance/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { attendance, employees, attendanceSettings } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/utils';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { timestamp } = await req.json();
    if (!timestamp) {
      return NextResponse.json({ error: 'Timestamp is required' }, { status: 400 });
    }

    const checkOutTime = new Date(timestamp);
    const today = checkOutTime.toISOString().split('T')[0];

    // Get employee record (support both userId and id)
    const userId = decoded.userId || decoded.id;
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, userId))
      .limit(1);

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // Get attendance settings
    const [settings] = await db.select().from(attendanceSettings).limit(1);
    if (!settings) {
      return NextResponse.json({ error: 'Attendance settings not configured' }, { status: 500 });
    }

    // Get today's attendance record
    const [todayRecord] = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, employee.id),
          eq(attendance.date, today)
        )
      )
      .limit(1);

    if (!todayRecord) {
      return NextResponse.json(
        { error: 'No check-in record found for today' },
        { status: 400 }
      );
    }

    if (!todayRecord.checkIn) {
      return NextResponse.json({ error: 'Must check in before checking out' }, { status: 400 });
    }

    if (todayRecord.checkOut) {
      return NextResponse.json(
        {
          error: 'Already checked out today',
          attendance: todayRecord,
        },
        { status: 400 }
      );
    }

    // Parse checkout settings times
    const [checkOutStartHour, checkOutStartMinute] = settings.checkOutStart
      .toString()
      .split(':')
      .map(Number);
    const [checkOutEndHour, checkOutEndMinute] = settings.checkOutEnd
      .toString()
      .split(':')
      .map(Number);

    const checkOutStartTotalMinutes = checkOutStartHour * 60 + checkOutStartMinute;
    const checkOutEndTotalMinutes = checkOutEndHour * 60 + checkOutEndMinute;

    // Get actual check-out time in minutes
    const checkOutHours = checkOutTime.getHours();
    const checkOutMinutes = checkOutTime.getMinutes();
    const checkOutTimeTotalMinutes = checkOutHours * 60 + checkOutMinutes;

    // Calculate work hours
    const checkInTime = new Date(todayRecord.checkIn);
    const workMilliseconds = checkOutTime.getTime() - checkInTime.getTime();
    const workHours = workMilliseconds / (1000 * 60 * 60);
    const requiredWorkHours = parseFloat(settings.workHours.toString());

    // Determine status based on check-out time and work hours according to specifications
    let finalStatus = todayRecord.status; // Keep existing check-in status (present/early/late)
    let earlyCheckout = false;
    let overtimeMinutes = 0;

    // Check-out Status Determination
    // EARLY: Check-out before Check-out Start time
    if (checkOutTimeTotalMinutes < checkOutStartTotalMinutes) {
      earlyCheckout = true;
    }
    // OVER TIME: Check-out after Check-out End time
    else if (checkOutTimeTotalMinutes > checkOutEndTotalMinutes) {
      overtimeMinutes = Math.round(checkOutTimeTotalMinutes - checkOutEndTotalMinutes);
    }
    // ON TIME: Check-out within Check-out Start-End range (no special status)

    // Update attendance record
    const [updated] = await db
      .update(attendance)
      .set({
        checkOut: checkOutTime,
        workHours: workHours.toFixed(2),
        status: finalStatus,
        earlyCheckout,
        overtimeMinutes,
        updatedAt: new Date(),
      })
      .where(eq(attendance.id, todayRecord.id))
      .returning();

    const workHoursFormatted = workHours.toFixed(1);
    let statusDetail = 'On Time';
    
    if (earlyCheckout) {
      const earlyMinutes = checkOutStartTotalMinutes - checkOutTimeTotalMinutes;
      statusDetail = `Early checkout by ${earlyMinutes} minutes`;
    } else if (overtimeMinutes > 0) {
      statusDetail = `Overtime by ${overtimeMinutes} minutes`;
    }

    return NextResponse.json({
      success: true,
      message: `Checked out successfully. Worked ${workHoursFormatted} hours (${statusDetail})`,
      attendance: updated,
    });
  } catch (error) {
    console.error('Check-out error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check out',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
