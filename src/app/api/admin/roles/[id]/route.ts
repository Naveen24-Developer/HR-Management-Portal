// app/api/admin/roles/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { roles, userRoles, users, userProfiles, employees } from '@/lib/database/schema';
import { eq, and, count, sql } from 'drizzle-orm';
import { z } from 'zod';

const updateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
  permissions: z.record(z.record(z.boolean())),
  sidebarPermissions: z.array(z.string()).optional().default([]),
  pagePermissions: z.array(z.string()).optional().default([]),
});

// GET /api/admin/roles/[id] - Get role by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const role = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    if (role.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Parse permissions if needed
    let permissions = role[0].permissions;
    try {
      if (typeof permissions === 'string') {
        permissions = JSON.parse(permissions);
      }
    } catch (e) {
      permissions = {};
    }

    return NextResponse.json({
      role: {
        ...role[0],
        permissions,
      },
    });
  } catch (error) {
    console.error('Failed to fetch role:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/roles/[id] - Update role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateRoleSchema.parse(body);

    // Check if role exists and is not system role
    const existingRole = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    if (existingRole.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (existingRole[0].isSystem) {
      return NextResponse.json(
        { error: 'System roles cannot be modified' },
        { status: 400 }
      );
    }

    // Check if role name already exists (excluding current role)
    const nameExists = await db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.name, validatedData.name),
          eq(roles.id, id)
        )
      )
      .limit(1);

    if (nameExists.length === 0) {
      // Check if another role has this name
      const duplicateRole = await db
        .select()
        .from(roles)
        .where(
          and(
            eq(roles.name, validatedData.name),
            eq(roles.id, id)
          )
        )
        .limit(1);
      
      if (duplicateRole.length > 0) {
        return NextResponse.json(
          { error: 'Role name already exists' },
          { status: 400 }
        );
      }
    }

    const [updatedRole] = await db
      .update(roles)
      .set({
        name: validatedData.name,
        description: validatedData.description,
        permissions: validatedData.permissions,
        sidebarPermissions: validatedData.sidebarPermissions,
        pagePermissions: validatedData.pagePermissions,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, id))
      .returning();

    // Parse permissions for response
    let permissions = updatedRole.permissions;
    try {
      if (typeof permissions === 'string') {
        permissions = JSON.parse(permissions);
      }
    } catch (e) {
      permissions = {};
    }

    return NextResponse.json({
      role: {
        ...updatedRole,
        permissions,
      },
      message: 'Role updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Failed to update role:', error);
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/roles/[id] - Delete role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if role exists and is not system/default role
    const existingRole = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    if (existingRole.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (existingRole[0].isSystem) {
      console.log(`DELETE attempt blocked: ${existingRole[0].name} is a system role`);
      return NextResponse.json(
        { error: `Cannot delete system role "${existingRole[0].name}"` },
        { status: 400 }
      );
    }

    if (existingRole[0].isDefault) {
      console.log(`DELETE attempt blocked: ${existingRole[0].name} is a default role`);
      return NextResponse.json(
        { error: `Cannot delete default role "${existingRole[0].name}"` },
        { status: 400 }
      );
    }

    // Check REAL-TIME count of assigned users (not the stored count)
    const userCountResult = await db
      .select({ count: count() })
      .from(userRoles)
      .where(eq(userRoles.roleId, id));

    const userCount = userCountResult[0]?.count || 0;
    
    if (userCount > 0) {
      console.log(`DELETE attempt blocked: ${existingRole[0].name} has ${userCount} assigned user(s)`);
      return NextResponse.json(
        { 
          error: `Cannot delete role "${existingRole[0].name}". It has ${userCount} employee(s) assigned. Please remove all employees before deleting.`,
          userCount 
        },
        { status: 400 }
      );
    }

    await db.delete(roles).where(eq(roles.id, id));

    console.log(`Role deleted successfully: ${existingRole[0].name}`);
    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Failed to delete role:', error);
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    );
  }
}