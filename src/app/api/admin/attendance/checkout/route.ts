// app/api/admin/attendance/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { attendance, employees, attendanceSettings } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/utils';
import { 
  calculateCheckOutStatus, 
  calculateWorkHours, 
  calculateAttendanceStatus,
  AttendanceSettings 
} from '@/lib/utils/attendance-calculator';

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
    const [settingsRaw] = await db.select().from(attendanceSettings).limit(1);
    if (!settingsRaw) {
      return NextResponse.json({ error: 'Attendance settings not configured' }, { status: 500 });
    }

    const settings = settingsRaw as any;

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

    // Calculate check-out status using utility function
    const checkOutCalculation = calculateCheckOutStatus(
      checkOutTime,
      (settings.checkOutStart || '17:00').toString(),
      (settings.checkOutEnd || '19:00').toString()
    );

    // Calculate work hours
    const checkInTime = new Date(todayRecord.checkIn);
    const workHours = calculateWorkHours(checkInTime, checkOutTime);

    // Calculate final attendance status based on both check-in and check-out
    const attendanceSettingsObj: AttendanceSettings = {
      checkInStart: (settings.checkInStart || '08:00').toString(),
      checkInEnd: (settings.checkInEnd || '10:00').toString(),
      checkOutStart: (settings.checkOutStart || '17:00').toString(),
      checkOutEnd: (settings.checkOutEnd || '19:00').toString(),
      workHours: parseFloat((settings.workHours || '8').toString()),
    };

    const attendanceStatusCalculation = calculateAttendanceStatus(
      checkInTime,
      checkOutTime,
      attendanceSettingsObj,
      checkOutTime
    );

    // Extract values for storage
    const earlyCheckout = checkOutCalculation.status === 'early';
    const overtimeMinutes = checkOutCalculation.status === 'over_time' 
      ? checkOutCalculation.duration 
      : 0;

    console.log('Check-out time analysis:', {
      checkOutTime: checkOutTime.toISOString(),
      checkOutWindow: `${settings.checkOutStart || '17:00'} - ${settings.checkOutEnd || '19:00'}`,
      checkOutStatus: checkOutCalculation.status,
      workHours,
      attendanceStatus: attendanceStatusCalculation.attendanceStatus,
      overtimeMinutes,
      earlyCheckout,
    });

    // Update attendance record with final status
    const [updated] = await db
      .update(attendance)
      .set({
        checkOut: checkOutTime,
        workHours: workHours.toFixed(2),
        status: attendanceStatusCalculation.attendanceStatus,
        checkOutStatus: checkOutCalculation.status,
        checkOutDuration: checkOutCalculation.duration,
        earlyCheckout,
        overtimeMinutes,
        updatedAt: new Date(),
      })
      .where(eq(attendance.id, todayRecord.id))
      .returning();

    const workHoursFormatted = workHours.toFixed(1);
    let statusDetail = checkOutCalculation.description;

    return NextResponse.json({
      success: true,
      message: `Checked out successfully. Worked ${workHoursFormatted} hours (${statusDetail})`,
      attendance: updated,
      checkOutStatus: checkOutCalculation.status,
      attendanceStatus: attendanceStatusCalculation.attendanceStatus,
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
