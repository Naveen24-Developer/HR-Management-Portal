// app/api/admin/roles/[id]/assign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { userRoles, users, roles, userProfiles, employees } from '@/lib/database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const assignRoleSchema = z.object({
  userId: z.string().uuid(),
});

// POST /api/admin/roles/[id]/assign - Assign role to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = assignRoleSchema.parse(body);

    // Check if role exists
    const role = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    if (role.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Check if user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, validatedData.userId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if role is already assigned
    const existingAssignment = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, validatedData.userId),
          eq(userRoles.roleId, id)
        )
      )
      .limit(1);

    if (existingAssignment.length > 0) {
      return NextResponse.json(
        { error: 'Role already assigned to user' },
        { status: 400 }
      );
    }

    // ONE EMPLOYEE = ONE ROLE: Remove existing role assignments before assigning new one
    const existingRoles = await db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(eq(userRoles.userId, validatedData.userId));

    // Use transaction for atomic operation
    await db.transaction(async (tx) => {
      // Remove all existing role assignments for this user
      if (existingRoles.length > 0) {
        await tx.delete(userRoles).where(eq(userRoles.userId, validatedData.userId));
        
        // Decrement user count for old roles
        for (const oldRole of existingRoles) {
          if (oldRole.roleId) {
            await tx
              .update(roles)
              .set({
                usersCount: sql`GREATEST(COALESCE(${roles.usersCount}, 0) - 1, 0)`,
              })
              .where(eq(roles.id, oldRole.roleId));
          }
        }
      }

      // Assign new role
      await tx.insert(userRoles).values({
        userId: validatedData.userId,
        roleId: id,
        assignedAt: new Date(),
      });

      // Increment users count for new role
      await tx
        .update(roles)
        .set({
          usersCount: sql`COALESCE(${roles.usersCount}, 0) + 1`,
        })
        .where(eq(roles.id, id));
    });

    return NextResponse.json({ message: 'Role assigned successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Failed to assign role:', error);
    return NextResponse.json(
      { error: 'Failed to assign role' },
      { status: 500 }
    );
  }
}

// GET /api/admin/roles/[id]/assign - List employees/users and whether they are assigned to the role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } > }
) {
  try {
    const { id } = await params;
    
    // Get all users with their profile info (names, position) and employee dept
    // Exclude admin users as they have full access by default
    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        position: employees.position,
        departmentId: employees.departmentId,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(employees, eq(users.id, employees.userId))
      .where(eq(users.isActive, true));

    // Filter out admin users (they have full access by default)
    const nonAdminUsers = usersList.filter((u: any) => u.role !== 'admin');

    // Get assignments for this specific role
    const assignments = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.roleId, id));

    const assignedSet = new Set(assignments.map((a: any) => a.userId));

    // Get current role for ALL users (to show what role they have)
    const allUserRoles = await db
      .select({
        userId: userRoles.userId,
        roleId: userRoles.roleId,
        roleName: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id));

    const userCurrentRole = new Map(
      allUserRoles.map((ur: any) => [ur.userId, { id: ur.roleId, name: ur.roleName }])
    );

    const result = nonAdminUsers.map((u: any) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      position: u.position || 'N/A',
      assigned: assignedSet.has(u.id),
      currentRole: userCurrentRole.get(u.id) || null,
    }));

    return NextResponse.json({ success: true, users: result });
  } catch (error) {
    console.error('Failed to list users for role:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}

// DELETE /api/admin/roles/[id]/assign - Unassign role from user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const userId = body.userId as string | undefined;
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Check assignment exists
    const existing = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    await db.delete(userRoles).where(
      and(eq(userRoles.userId, userId), eq(userRoles.roleId, id))
    );

    // Decrement usersCount safely (avoid negative)
    await db
      .update(roles)
      .set({ 
        usersCount: sql`GREATEST(COALESCE(${roles.usersCount}, 0) - 1, 0)` 
      })
      .where(eq(roles.id, id));

    return NextResponse.json({ message: 'Role unassigned successfully' });
  } catch (error) {
    console.error('Failed to unassign role:', error);
    return NextResponse.json({ error: 'Failed to unassign role' }, { status: 500 });
  }
}