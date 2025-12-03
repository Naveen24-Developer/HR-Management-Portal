// src/app/api/admin/leave/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { leaveRequests } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/utils';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/leave/:id/approve
 * Approves a leave request
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

    // Check if user is authorized to approve
    // User can approve if they are admin or the designated approver WITH approve permission
    const isAdmin = decoded.role === 'admin';
    const isApprover = leaveRequest[0].approverId === decoded.id;

    if (!isAdmin && !isApprover) {
      return NextResponse.json(
        { error: 'Not authorized to approve this request' },
        { status: 403 }
      );
    }

    // For non-admin approvers, verify they have approve permission
    if (!isAdmin && isApprover) {
      const hasApprovePermission = decoded.permissions?.leave?.approve === true;
      if (!hasApprovePermission) {
        return NextResponse.json(
          { error: 'You do not have permission to approve leave requests' },
          { status: 403 }
        );
      }
    }

    // Check if already processed
    if (leaveRequest[0].status !== 'pending') {
      return NextResponse.json(
        { error: `Request is already ${leaveRequest[0].status}` },
        { status: 400 }
      );
    }

    // Update the leave request
    const updated = await db
      .update(leaveRequests)
      .set({
        status: 'approved',
        approvedBy: decoded.id,
        approvedAt: new Date(),
      })
      .where(eq(leaveRequests.id, requestId))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Leave request approved successfully',
      leaveRequest: updated[0],
    });

  } catch (error) {
    console.error('Failed to approve leave request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
