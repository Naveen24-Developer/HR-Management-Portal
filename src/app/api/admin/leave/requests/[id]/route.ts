// src/app/api/admin/leave/requests/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { leaveRequests, employees } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/utils';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/leave/requests/:id
 * Updates a leave request (only for pending requests by the owner)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: requestId } = await params;
    const body = await request.json();

    // Get the leave request
    const leaveRequest = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, requestId))
      .limit(1);

    if (!leaveRequest.length) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // Get the current user's employee record
    const userEmployee = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, decoded.id))
      .limit(1);

    // Only the employee who created the request can edit it
    // And only if it's still pending
    const isOwner = userEmployee.length > 0 && leaveRequest[0].employeeId === userEmployee[0].id;
    const isAdmin = decoded.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Not authorized to edit this request' },
        { status: 403 }
      );
    }

    if (leaveRequest[0].status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending requests can be edited' },
        { status: 400 }
      );
    }

    // Calculate working days if dates are provided
    let calculatedDays = body.days;
    if (body.startDate && body.endDate) {
      const start = new Date(body.startDate);
      const end = new Date(body.endDate);
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

    // Update the leave request
    const updated = await db
      .update(leaveRequests)
      .set({
        leaveType: body.leaveType || leaveRequest[0].leaveType,
        startDate: body.startDate || leaveRequest[0].startDate,
        endDate: body.endDate || leaveRequest[0].endDate,
        days: calculatedDays || leaveRequest[0].days,
        reason: body.reason || leaveRequest[0].reason,
        emergencyContact: body.emergencyContact !== undefined ? body.emergencyContact : leaveRequest[0].emergencyContact,
        handoverNotes: body.handoverNotes !== undefined ? body.handoverNotes : leaveRequest[0].handoverNotes,
        documentUrl: body.documentUrl !== undefined ? body.documentUrl : leaveRequest[0].documentUrl,
        approverId: body.approverId !== undefined ? body.approverId : leaveRequest[0].approverId,
      })
      .where(eq(leaveRequests.id, requestId))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Leave request updated successfully',
      leaveRequest: updated[0],
    });

  } catch (error) {
    console.error('Failed to update leave request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/leave/requests/:id
 * Deletes a leave request
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: requestId } = await params;

    // Get the leave request
    const leaveRequest = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, requestId))
      .limit(1);

    if (!leaveRequest.length) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // Check authorization - Only admin can delete leave requests
    const isAdmin = decoded.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only system administrators can delete leave requests' },
        { status: 403 }
      );
    }

    // Delete the leave request
    await db
      .delete(leaveRequests)
      .where(eq(leaveRequests.id, requestId));

    return NextResponse.json({
      success: true,
      message: 'Leave request deleted successfully',
    });

  } catch (error) {
    console.error('Failed to delete leave request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
