// app/api/admin/attendance/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { attendance, employees, users, userProfiles, departments } from '@/lib/database/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || !['admin', 'hr'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Admin/HR access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const view = searchParams.get('view') || 'daily';

    let query = db
      .select({
        employeeId: employees.employeeId,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        email: users.email,
        department: departments.name,
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
      .innerJoin(employees, eq(attendance.employeeId, employees.id))
      .innerJoin(users, eq(employees.userId, users.id))
      .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(departments, eq(employees.departmentId, departments.id));

    // Apply date filter
    let whereCondition;
    if (view === 'daily') {
      whereCondition = eq(attendance.date, date);
    } else if (view === 'monthly') {
      const startOfMonth = new Date(date);
      startOfMonth.setDate(1);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);

      whereCondition = and(
        gte(attendance.date, startOfMonth.toISOString().split('T')[0]),
        lte(attendance.date, endOfMonth.toISOString().split('T')[0])
      );
    }

    const records = whereCondition ? await query.where(whereCondition) : await query;

    // Format data for Excel
    const excelData = records.map((record) => ({
      'Employee ID': record.employeeId,
      'First Name': record.firstName,
      'Last Name': record.lastName,
      'Email': record.email,
      'Department': record.department,
      'Date': record.date,
      'Check In': record.checkIn 
        ? new Date(record.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : '',
      'Check Out': record.checkOut
        ? new Date(record.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : '',
      'Work Hours': record.workHours || '0',
      'Status': record.status?.toUpperCase() || '',
      'Late (minutes)': record.lateMinutes || 0,
      'Early Checkout': record.earlyCheckout ? 'Yes' : 'No',
      'Overtime (minutes)': record.overtimeMinutes || 0,
    }));

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=attendance-${date}.xlsx`,
      },
    });
  } catch (error) {
    console.error('Export attendance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
