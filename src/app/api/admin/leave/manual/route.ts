// src/app/api/admin/leave/manual/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { leaveRequests, employees } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/utils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/leave/manual
 * Admin manually creates a leave entry for an employee
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

    // Only admin can create manual leave entries
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can create manual leave entries' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      employeeId,
      leaveType,
      startDate,
      endDate,
      days,
      reason,
      status = 'approved', // Manual entries are usually pre-approved
      emergencyContact,
      handoverNotes,
    } = body;

    // Validate required fields
    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify employee exists
    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (!employee.length) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Calculate working days if not provided
    let calculatedDays = days;
    if (!calculatedDays) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      calculatedDays = 0;
      let current = new Date(start);

      while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          calculatedDays++;
        }
        current.setDate(current.getDate() + 1);
      }
    }

    // Create manual leave entry
    const newRequest = await db
      .insert(leaveRequests)
      .values({
        employeeId,
        leaveType,
        startDate,
        endDate,
        days: calculatedDays,
        reason,
        status,
        emergencyContact: emergencyContact || null,
        handoverNotes: handoverNotes || null,
        isManualEntry: true,
        manualEntryBy: decoded.id,
        approvedBy: status === 'approved' ? decoded.id : null,
        approvedAt: status === 'approved' ? new Date() : null,
        approverId: null, // Manual entries don't need approver
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: `Leave ${status} successfully`,
      leaveRequest: newRequest[0],
    });

  } catch (error) {
    console.error('Failed to create manual leave entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
