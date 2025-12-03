// src/app/api/admin/leave/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { leaveRequests, employees, leaveBalances } from '@/lib/database/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leave/stats
 * Returns leave statistics for the current user or all users (for admin)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded?.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const isAdmin = decoded.role === 'admin';
    
    // Get employee record
    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, decoded.id))
      .limit(1);

    if (!employee.length && !isAdmin) {
      return NextResponse.json(
        { error: 'Employee record not found' },
        { status: 404 }
      );
    }

    const employeeId = employee[0]?.id;

    // Get current month range
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Total requests (all time)
    let totalRequestsQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(leaveRequests);

    if (!isAdmin && employeeId) {
      totalRequestsQuery = totalRequestsQuery.where(eq(leaveRequests.employeeId, employeeId));
    }

    const totalResult = await totalRequestsQuery;
    const totalRequests = Number(totalResult[0]?.count || 0);

    // Pending requests
    let pendingQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(leaveRequests)
      .where(eq(leaveRequests.status, 'pending'));

    if (!isAdmin && employeeId) {
      pendingQuery = pendingQuery.where(
        and(
          eq(leaveRequests.employeeId, employeeId),
          eq(leaveRequests.status, 'pending')
        )
      );
    }

    const pendingResult = await pendingQuery;
    const pendingRequests = Number(pendingResult[0]?.count || 0);

    // Approved this month
    let approvedThisMonthQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.status, 'approved'),
          gte(leaveRequests.approvedAt, firstDayOfMonth),
          lte(leaveRequests.approvedAt, lastDayOfMonth)
        )
      );

    if (!isAdmin && employeeId) {
      approvedThisMonthQuery = approvedThisMonthQuery.where(
        eq(leaveRequests.employeeId, employeeId)
      );
    }

    const approvedResult = await approvedThisMonthQuery;
    const approvedThisMonth = Number(approvedResult[0]?.count || 0);

    // Rejected this month
    let rejectedThisMonthQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.status, 'rejected'),
          gte(leaveRequests.approvedAt, firstDayOfMonth),
          lte(leaveRequests.approvedAt, lastDayOfMonth)
        )
      );

    if (!isAdmin && employeeId) {
      rejectedThisMonthQuery = rejectedThisMonthQuery.where(
        eq(leaveRequests.employeeId, employeeId)
      );
    }

    const rejectedResult = await rejectedThisMonthQuery;
    const rejectedThisMonth = Number(rejectedResult[0]?.count || 0);

    // Get leave balance for current user (if employee)
    let leaveBalance = {
      sick: 0,
      casual: 0,
      earned: 0,
      maternity: 0,
      paternity: 0,
    };

    if (employeeId) {
      const currentYear = now.getFullYear();
      const balances = await db
        .select()
        .from(leaveBalances)
        .where(
          and(
            eq(leaveBalances.employeeId, employeeId),
            eq(leaveBalances.year, currentYear)
          )
        );

      balances.forEach((balance) => {
        const leaveType = balance.leaveType.toLowerCase();
        if (leaveType in leaveBalance) {
          leaveBalance[leaveType as keyof typeof leaveBalance] = balance.availableQuota || 0;
        }
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalRequests,
        pendingRequests,
        approvedThisMonth,
        rejectedThisMonth,
        myPendingRequests: pendingRequests, // Same for now
        leaveBalance,
      },
    });

  } catch (error) {
    console.error('Failed to fetch leave stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
