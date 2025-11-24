// app/api/admin/attendance/manual/route.ts
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

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { employeeId, date, checkIn, checkOut, notes } = await req.json();

    // Validate required fields
    if (!employeeId || !date || !checkIn || !checkOut) {
      return NextResponse.json({ 
        error: 'Employee, date, check-in, and check-out times are required' 
      }, { status: 400 });
    }

    // Get attendance settings
    const [settings] = await db.select().from(attendanceSettings).limit(1);
    if (!settings) {
      return NextResponse.json({ error: 'Attendance settings not configured' }, { status: 500 });
    }

    // Create full timestamps
    const checkInTimestamp = new Date(`${date}T${checkIn}`);
    const checkOutTimestamp = new Date(`${date}T${checkOut}`);

    // Calculate work hours
    const workMilliseconds = checkOutTimestamp.getTime() - checkInTimestamp.getTime();
    const workHours = workMilliseconds / (1000 * 60 * 60);
    const requiredWorkHours = parseFloat(settings.workHours.toString());

    // Calculate status based on new specifications
    const checkInHours = checkInTimestamp.getHours();
    const checkInMinutes = checkInTimestamp.getMinutes();
    const checkInTotalMinutes = checkInHours * 60 + checkInMinutes;

    const [checkInStartHour, checkInStartMinute] = settings.checkInStart.split(':').map(Number);
    const [checkInEndHour, checkInEndMinute] = settings.checkInEnd.split(':').map(Number);
    const checkInStartTotalMinutes = checkInStartHour * 60 + checkInStartMinute;
    const checkInEndTotalMinutes = checkInEndHour * 60 + checkInEndMinute;

    // Determine check-in status
    let status = 'present'; // Default: On Time
    let lateMinutes = 0;

    if (checkInTotalMinutes < checkInStartTotalMinutes) {
      // Early check-in
      status = 'early';
      lateMinutes = checkInStartTotalMinutes - checkInTotalMinutes; // Store minutes early as positive in lateMinutes
    } else if (checkInTotalMinutes > checkInEndTotalMinutes) {
      // Late check-in
      status = 'late';
      lateMinutes = checkInTotalMinutes - checkInEndTotalMinutes;
    }

    // Parse check-out settings times for check-out status
    const [checkOutStartHour, checkOutStartMinute] = settings.checkOutStart.split(':').map(Number);
    const [checkOutEndHour, checkOutEndMinute] = settings.checkOutEnd.split(':').map(Number);
    const checkOutStartTotalMinutes = checkOutStartHour * 60 + checkOutStartMinute;
    const checkOutEndTotalMinutes = checkOutEndHour * 60 + checkOutEndMinute;

    const checkOutHours = checkOutTimestamp.getHours();
    const checkOutMinutes = checkOutTimestamp.getMinutes();
    const checkOutTotalMinutes = checkOutHours * 60 + checkOutMinutes;

    let earlyCheckout = false;
    let overtimeMinutes = 0;

    // Determine check-out status
    if (checkOutTotalMinutes < checkOutStartTotalMinutes) {
      // Early check-out (before Check-out Start time)
      earlyCheckout = true;
    } else if (checkOutTotalMinutes > checkOutEndTotalMinutes) {
      // Over time (after Check-out End time)
      overtimeMinutes = checkOutTotalMinutes - checkOutEndTotalMinutes;
    }

    // Check for existing record
    const [existingRecord] = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, employeeId),
          eq(attendance.date, date)
        )
      )
      .limit(1);

    if (existingRecord) {
      // Update existing record
      const [updated] = await db
        .update(attendance)
        .set({
          checkIn: checkInTimestamp,
          checkOut: checkOutTimestamp,
          workHours: workHours.toFixed(2),
          status,
          lateMinutes,
          earlyCheckout,
          overtimeMinutes,
          notes,
          isManualEntry: true,
          updatedAt: new Date(),
        })
        .where(eq(attendance.id, existingRecord.id))
        .returning();

      return NextResponse.json({
        success: true,
        message: 'Attendance record updated successfully',
        attendance: updated,
      });
    } else {
      // Create new record
      const [created] = await db
        .insert(attendance)
        .values({
          employeeId,
          date,
          checkIn: checkInTimestamp,
          checkOut: checkOutTimestamp,
          workHours: workHours.toFixed(2),
          status,
          lateMinutes,
          earlyCheckout,
          overtimeMinutes,
          notes,
          isManualEntry: true,
        })
        .returning();

      return NextResponse.json({
        success: true,
        message: 'Attendance record created successfully',
        attendance: created,
      });
    }
  } catch (error) {
    console.error('Manual attendance entry error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}