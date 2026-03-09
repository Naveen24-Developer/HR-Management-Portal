// src/app/api/admin/leave/approvers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { users, userProfiles, employees, userRoles, roles } from '@/lib/database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leave/approvers
 * Returns list of users who can approve leave requests based on role's canApprove flag
 * Excludes the requesting user themselves
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

    const currentUserId = decoded.id;

    // Get all users with their roles and check for canApprove flag
    const approversData = await db
      .select({
        userId: users.id,
        email: users.email,
        role: users.role,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        position: employees.position,
        employeeId: employees.employeeId,
        departmentId: employees.departmentId,
        roleCanApprove: roles.canApprove,
        roleName: roles.name,
        employeeIsActive: employees.isActive,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(employees, eq(users.id, employees.userId))
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(users.isActive, true));

    console.log('Approvers data fetched:', approversData.length, 'records');

    // Filter approvers based on canApprove flag
    const approvers = approversData
      .filter(user => {
        // Skip if employee record exists but is inactive
        if (user.employeeIsActive === false) return false;
        
        // Exclude current user (cannot approve own leave)
        if (user.userId === currentUserId) return false;

        // Admin always has approve permission
        if (user.role === 'admin') return true;

        // Check if user has canApprove flag set to true from their role
        if (user.roleCanApprove === true) {
          return true;
        }

        return false;
      })
      .map(user => ({
        id: user.userId,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        position: user.position || 'N/A',
        employeeId: user.employeeId || 'N/A',
        role: user.role,
        roleName: user.roleName || 'N/A',
      }));

    // Remove duplicates (in case user has multiple role assignments)
    const uniqueApprovers = Array.from(
      new Map(approvers.map(a => [a.id, a])).values()
    );

    console.log(`Found ${uniqueApprovers.length} approvers for user ${currentUserId}`);
    console.log('Approvers list:', uniqueApprovers.map(a => `${a.fullName} (${a.roleName})`));

    return NextResponse.json({
      success: true,
      approvers: uniqueApprovers,
      count: uniqueApprovers.length,
    });

  } catch (error) {
    console.error('Failed to fetch approvers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}