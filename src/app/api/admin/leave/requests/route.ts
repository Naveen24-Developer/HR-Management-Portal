// src/app/api/admin/leave/requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { leaveRequests, employees, userProfiles, users, departments } from '@/lib/database/schema';
import { eq, and, desc, gte, lte, or, sql } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leave/requests
 * Returns list of leave requests with filtering and pagination
 * Query params: page, limit, status, type, date, employeeId
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const statusFilter = searchParams.get('status');
    const typeFilter = searchParams.get('type');
    const dateFilter = searchParams.get('date');
    const employeeIdFilter = searchParams.get('employeeId');

    // Build where conditions
    const conditions: any[] = [];

    // If not admin, only show own requests or requests where user is approver
    if (decoded.role !== 'admin') {
      const userEmployee = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.userId, decoded.id))
        .limit(1);

      if (userEmployee.length > 0) {
        conditions.push(
          or(
            eq(leaveRequests.employeeId, userEmployee[0].id),
            eq(leaveRequests.approverId, decoded.id)
          )
        );
      }
    }

    if (statusFilter) {
      conditions.push(eq(leaveRequests.status, statusFilter));
    }

    if (typeFilter) {
      conditions.push(eq(leaveRequests.leaveType, typeFilter));
    }

    if (employeeIdFilter) {
      conditions.push(eq(leaveRequests.employeeId, employeeIdFilter));
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      conditions.push(
        and(
          lte(leaveRequests.startDate, filterDate.toISOString().split('T')[0]),
          gte(leaveRequests.endDate, filterDate.toISOString().split('T')[0])
        )
      );
    }

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leaveRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = Number(totalResult[0]?.count || 0);

    // Get paginated requests
    const requests = await db
      .select({
        id: leaveRequests.id,
        employeeId: leaveRequests.employeeId,
        approverId: leaveRequests.approverId, // Include approverId for permission checks
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
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        email: users.email,
        departmentName: departments.name,
      })
      .from(leaveRequests)
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(leaveRequests.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      leaveRequests: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Failed to fetch leave requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leave/requests
 * Creates a new leave request
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      leaveType,
      startDate,
      endDate,
      reason,
      approverId,
      emergencyContact,
      handoverNotes,
      documentUrl,
    } = body;

    // Validate required fields
    if (!leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get employee record
    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, decoded.id))
      .limit(1);

    if (!employee.length) {
      return NextResponse.json(
        { error: 'Employee record not found' },
        { status: 404 }
      );
    }

    // Calculate working days (excluding weekends)
    const start = new Date(startDate);
    const end = new Date(endDate);
    let days = 0;
    let current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    // For employees (non-admin), approver must be provided
    let finalApproverId = approverId;
    if (decoded.role === 'admin') {
      // Admin doesn't need approver, can be null
      finalApproverId = approverId || null;
    } else {
      // Employee must select an approver
      if (!approverId) {
        return NextResponse.json(
          { error: 'Approver selection is required' },
          { status: 400 }
        );
      }
      
      // Employee cannot select themselves as approver
      if (approverId === decoded.id) {
        return NextResponse.json(
          { error: 'You cannot approve your own leave request' },
          { status: 400 }
        );
      }
      
      finalApproverId = approverId;
    }

    // Create leave request
    const newRequest = await db
      .insert(leaveRequests)
      .values({
        employeeId: employee[0].id,
        approverId: finalApproverId,
        leaveType,
        startDate,
        endDate,
        days,
        reason,
        emergencyContact: emergencyContact || null,
        handoverNotes: handoverNotes || null,
        documentUrl: documentUrl || null,
        status: 'pending',
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Leave request submitted successfully',
      leaveRequest: newRequest[0],
    });

  } catch (error) {
    console.error('Failed to create leave request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
