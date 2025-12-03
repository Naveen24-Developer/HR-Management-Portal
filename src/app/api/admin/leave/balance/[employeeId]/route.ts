// src/app/api/admin/leave/balance/[employeeId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { leaveBalances, leavePolicies, employees } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leave/balance/:employeeId
 * Returns leave balance for a specific employee
 * Query params: year (optional, defaults to current year)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
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

    const employeeId = parseInt(params.employeeId);
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    // Verify employee exists
    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (!employee.length) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Only allow users to view their own balance or admins to view any
    if (decoded.role !== 'admin' && employee[0].userId !== decoded.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all leave balances for the employee and year
    const balances = await db
      .select({
        id: leaveBalances.id,
        leaveType: leaveBalances.leaveType,
        year: leaveBalances.year,
        totalQuota: leaveBalances.totalQuota,
        usedQuota: leaveBalances.usedQuota,
        pendingQuota: leaveBalances.pendingQuota,
        availableQuota: leaveBalances.availableQuota,
        carriedForward: leaveBalances.carriedForward,
        policyDisplayName: leavePolicies.displayName,
        policyDescription: leavePolicies.description,
      })
      .from(leaveBalances)
      .leftJoin(leavePolicies, eq(leaveBalances.leaveType, leavePolicies.leaveType))
      .where(and(
        eq(leaveBalances.employeeId, employeeId),
        eq(leaveBalances.year, year)
      ));

    // If no balances exist, initialize them from policies
    if (balances.length === 0) {
      const policies = await db
        .select()
        .from(leavePolicies)
        .where(eq(leavePolicies.isActive, true));

      // Create initial balances
      const newBalances = policies.map(policy => ({
        employeeId,
        leaveType: policy.leaveType,
        year,
        totalQuota: policy.annualQuota,
        usedQuota: 0,
        pendingQuota: 0,
        availableQuota: policy.annualQuota,
        carriedForward: 0,
      }));

      await db.insert(leaveBalances).values(newBalances);

      // Fetch the newly created balances
      const freshBalances = await db
        .select({
          id: leaveBalances.id,
          leaveType: leaveBalances.leaveType,
          year: leaveBalances.year,
          totalQuota: leaveBalances.totalQuota,
          usedQuota: leaveBalances.usedQuota,
          pendingQuota: leaveBalances.pendingQuota,
          availableQuota: leaveBalances.availableQuota,
          carriedForward: leaveBalances.carriedForward,
          policyDisplayName: leavePolicies.displayName,
          policyDescription: leavePolicies.description,
        })
        .from(leaveBalances)
        .leftJoin(leavePolicies, eq(leaveBalances.leaveType, leavePolicies.leaveType))
        .where(and(
          eq(leaveBalances.employeeId, employeeId),
          eq(leaveBalances.year, year)
        ));

      return NextResponse.json({
        success: true,
        employeeId,
        year,
        balances: freshBalances,
        initialized: true,
      });
    }

    return NextResponse.json({
      success: true,
      employeeId,
      year,
      balances,
      initialized: false,
    });

  } catch (error) {
    console.error('Failed to fetch leave balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
