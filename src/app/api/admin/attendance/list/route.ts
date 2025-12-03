// app/api/admin/attendance/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { attendance, employees, userProfiles, departments, attendanceSettings } from '@/lib/database/schema';
import { eq, desc } from 'drizzle-orm';
import { verifyToken, getTokenFromRequest } from '@/lib/auth/utils';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName: string;
  date: string;
  checkIn: Date | null;
  checkOut: Date | null;
  workHours: string;
  status: string;
  lateMinutes: number;
  earlyCheckout: boolean;
  overtimeMinutes: number;
}

function formatStatus(
  status: string,
  lateMinutes: number,
  overtimeMinutes: number,
  earlyCheckout: boolean
): string {
  if (status === 'late' && lateMinutes > 0) {
    return `Late by ${lateMinutes} min`;
  }
  if (status === 'half_day' && earlyCheckout) {
    return `Early by ${overtimeMinutes || 5} min`;
  }
  if (overtimeMinutes > 0 && status === 'present') {
    return `Overtime ${overtimeMinutes} min`;
  }
  if (status === 'present') {
    return 'On Time';
  }
  if (status === 'absent') {
    return 'Absent';
  }
  if (status === 'not_checked_in') {
    return 'Not Checked In';
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any = verifyToken(token);
    if (!decoded) {
      const sessionCookie =
        request.cookies.get && request.cookies.get('hrms-session')?.value;
      if (
        process.env.NODE_ENV !== 'production' &&
        sessionCookie === 'admin-authenticated'
      ) {
        decoded = {
          id: '00000000-0000-0000-0000-000000000001',
          role: 'admin',
          email: 'admin@hrms.com',
        };
      }
    }

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date'); // Optional: filter by specific date (YYYY-MM-DD format)
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = db
      .select({
        id: attendance.id,
        employeeId: employees.id,
        employeeName: userProfiles.firstName,
        employeeLastName: userProfiles.lastName,
        departmentName: departments.name,
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        workHours: attendance.workHours,
        status: attendance.status,
        lateMinutes: attendance.lateMinutes,
        earlyCheckout: attendance.earlyCheckout,
        overtimeMinutes: attendance.overtimeMinutes,
      })
      .from(attendance)
      .leftJoin(employees, eq(attendance.employeeId, employees.id))
      .leftJoin(userProfiles, eq(employees.userId, userProfiles.userId))
      .leftJoin(departments, eq(employees.departmentId, departments.id));

    // Apply date filter if provided
    if (date) {
      query = query.where(eq(attendance.date, date));
    }

    // Order by date descending and apply pagination
    const records = await query
      .orderBy(desc(attendance.date))
      .limit(limit)
      .offset(offset);

    // Fetch attendance settings to compute status messages dynamically
    const [settings] = await db.select().from(attendanceSettings).limit(1);

    // Format records with calculated status strings using settings
    const formattedRecords: AttendanceRecord[] = records.map((record: any) => {
      const firstName = record.employeeName;
      const lastName = record.employeeLastName;
      const employeeName = firstName ? `${firstName}${lastName ? ` ${lastName}` : ''}` : 'Unknown Employee';

      // Default status message
      let statusMsg = 'Not Checked In';

      // Compute check-in and check-out statuses
      if (record.checkIn && settings) {
        const checkInDate = new Date(record.checkIn);
        const [checkInStartH, checkInStartM] = settings.checkInStart.toString().split(':').map(Number);
        const [checkInEndH, checkInEndM] = settings.checkInEnd.toString().split(':').map(Number);
        const checkInStartTotal = checkInStartH * 60 + checkInStartM;
        const checkInEndTotal = checkInEndH * 60 + checkInEndM;
        const checkInTotal = checkInDate.getHours() * 60 + checkInDate.getMinutes();

        // Determine check-in status
        if (checkInTotal < checkInStartTotal) {
          // EARLY: Check-in before Check-in Start
          const earlyMinutes = checkInStartTotal - checkInTotal;
          statusMsg = `Early by ${earlyMinutes} min`;
        } else if (checkInTotal > checkInEndTotal) {
          // LATE: Check-in after Check-in End
          const lateMinutes = checkInTotal - checkInEndTotal;
          statusMsg = `Late by ${lateMinutes} min`;
        } else {
          // ON TIME: Check-in within Check-in Start-End range
          statusMsg = 'On Time';
        }
      }

      // Determine check-out status and Present/Absent marking
      if (record.checkOut && settings) {
        const checkOutDate = new Date(record.checkOut);
        const [checkOutStartH, checkOutStartM] = settings.checkOutStart.toString().split(':').map(Number);
        const [checkOutEndH, checkOutEndM] = settings.checkOutEnd.toString().split(':').map(Number);
        const checkOutStartTotal = checkOutStartH * 60 + checkOutStartM;
        const checkOutEndTotal = checkOutEndH * 60 + checkOutEndM;
        const checkOutTotal = checkOutDate.getHours() * 60 + checkOutDate.getMinutes();

        // Determine check-out status
        if (checkOutTotal < checkOutStartTotal) {
          // EARLY CHECK-OUT: before Check-out Start
          const earlyMinutes = checkOutStartTotal - checkOutTotal;
          statusMsg = `${statusMsg}; Early checkout ${earlyMinutes} min`;
        } else if (checkOutTotal > checkOutEndTotal) {
          // OVER TIME: after Check-out End
          const overtimeMinutes = checkOutTotal - checkOutEndTotal;
          statusMsg = `Overtime ${overtimeMinutes} min`;
        }
        // else: ON TIME check-out (within Check-out Start-End), no change to statusMsg
      } else if (record.checkIn && settings) {
        // Check if not checked out by Check-out Start = ABSENT
        const checkOutStartH = parseInt(settings.checkOutStart.toString().split(':')[0]);
        const checkOutStartM = parseInt(settings.checkOutStart.toString().split(':')[1]);
        const checkOutStartTotal = checkOutStartH * 60 + checkOutStartM;
        const now = new Date();
        const currentTotal = now.getHours() * 60 + now.getMinutes();
        
        // Mark ABSENT if current time is past check-out start and no check-out recorded
        if (currentTotal >= checkOutStartTotal && !record.checkOut) {
          statusMsg = 'Absent';
        }
      }

      return {
        id: record.id,
        employeeId: record.employeeId,
        employeeName,
        departmentName: record.departmentName || 'N/A',
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        workHours: record.workHours,
        status: statusMsg,
        lateMinutes: record.lateMinutes,
        earlyCheckout: record.earlyCheckout,
        overtimeMinutes: record.overtimeMinutes,
      };
    });

    // Get total count for pagination
    const countResult = await db
      .select()
      .from(attendance)
      .where(date ? eq(attendance.date, date) : undefined);

    return NextResponse.json({
      success: true,
      data: formattedRecords,
      pagination: {
        total: countResult.length,
        limit,
        offset,
        hasMore: offset + limit < countResult.length,
      },
    });
  } catch (error) {
    console.error('Attendance list error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch attendance records',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}