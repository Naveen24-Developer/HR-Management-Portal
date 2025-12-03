// app/api/admin/leave/route.ts - Updated GET method
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { leaveRequests, employees, userProfiles, departments, users } from '@/lib/database/schema';
import { eq, and, gte, lte, desc, SQL, or } from 'drizzle-orm';
import { verifyToken, getTokenFromRequest } from '@/lib/auth/utils';
import { canPerformAction } from '@/lib/auth/permissions';

// GET - Fetch leave requests
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check for 'view' permission on leave module
    if (!canPerformAction(decoded.role, decoded.permissions, 'leave', 'view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const date = searchParams.get('date');
    const employeeId = searchParams.get('employeeId');

    const whereConditions: (SQL | undefined)[] = [];

    // For admin: show all requests
    // For employees: show only their own requests AND requests where they are the approver
    if (decoded.role !== 'admin') {
      // Get employee ID for the logged-in user
      const employee = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.userId, decoded.id))
        .limit(1);

      if (employee.length > 0) {
        whereConditions.push(
          or(
            eq(leaveRequests.employeeId, employee[0].id),
            eq(leaveRequests.approverId, decoded.id)
          )
        );
      } else {
        // If no employee record, only show requests where they are approver
        whereConditions.push(eq(leaveRequests.approverId, decoded.id));
      }
    }

    // Apply filters
    if (status) {
      whereConditions.push(eq(leaveRequests.status, status));
    }

    if (type) {
      whereConditions.push(eq(leaveRequests.leaveType, type));
    }

    if (date) {
      const [year, month] = date.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      
      whereConditions.push(
        and(
          gte(leaveRequests.startDate, startDate),
          lte(leaveRequests.startDate, endDate)
        )
      );
    }

    if (employeeId && decoded.role === 'admin') {
      // Only admin can filter by specific employee
      whereConditions.push(eq(leaveRequests.employeeId, employeeId));
    }

    const leaveRequestsList = await db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        approverId: leaveRequests.approverId,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        email: users.email,
        departmentName: departments.name,
        leaveType: leaveRequests.leaveType,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        days: leaveRequests.days,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        approvedBy: leaveRequests.approvedBy,
        approvedAt: leaveRequests.approvedAt,
        rejectionReason: leaveRequests.rejectionReason,
        emergencyContact: leaveRequests.emergencyContact,
        handoverNotes: leaveRequests.handoverNotes,
        documentUrl: leaveRequests.documentUrl,
        createdAt: leaveRequests.createdAt,
      })
      .from(leaveRequests)
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .innerJoin(users, eq(employees.userId, users.id))
      .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(...whereConditions))
      .orderBy(desc(leaveRequests.createdAt));

    return NextResponse.json({
      success: true,
      leaveRequests: leaveRequestsList,
    });
  } catch (error) {
    console.error('Leave requests GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}