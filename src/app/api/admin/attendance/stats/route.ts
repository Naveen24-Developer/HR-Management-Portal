// app/api/admin/attendance/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { attendance, employees } from '@/lib/database/schema';
import { eq, and, sql } from 'drizzle-orm';
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

    const today = new Date().toISOString().split('T')[0];

    // Get total employees
    const totalEmployeesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(eq(employees.isActive, true));
    const totalEmployees = Number(totalEmployeesResult[0]?.count || 0);

    // Get today's attendance stats
    const todayStats = await db
      .select({
        status: attendance.status,
        count: sql<number>`count(*)`,
        avgWorkHours: sql<number>`avg(CAST(${attendance.workHours} AS FLOAT))`,
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.date, today),
          sql`${attendance.checkIn} IS NOT NULL`
        )
      )
      .groupBy(attendance.status);

    // Calculate stats
    let presentToday = 0;
    let absentToday = 0;
    let lateToday = 0;
    let halfDayToday = 0;
    let totalWorkHours = 0;
    let recordsWithWorkHours = 0;

    todayStats.forEach((stat) => {
      const count = Number(stat.count);
      switch (stat.status) {
        case 'present':
          presentToday += count;
          break;
        case 'absent':
          absentToday += count;
          break;
        case 'late':
          lateToday += count;
          presentToday += count; // Late counts as present
          break;
        case 'half_day':
          halfDayToday += count;
          presentToday += count; // Half day counts as present
          break;
      }
      
      if (stat.avgWorkHours) {
        totalWorkHours += Number(stat.avgWorkHours) * count;
        recordsWithWorkHours += count;
      }
    });

    // Calculate absent today (total - present)
    absentToday = totalEmployees - presentToday;

    // Calculate average work hours
    const averageWorkHours = recordsWithWorkHours > 0 
      ? totalWorkHours / recordsWithWorkHours 
      : 0;

    // Calculate on-time percentage (present - late) / total present
    const onTimeCount = presentToday - lateToday;
    const onTimePercentage = presentToday > 0 
      ? Math.round((onTimeCount / presentToday) * 100) 
      : 0;

    return NextResponse.json({
      stats: {
        totalEmployees,
        presentToday,
        absentToday,
        lateToday,
        halfDayToday,
        averageWorkHours: parseFloat(averageWorkHours.toFixed(1)),
        onTimePercentage,
      },
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}