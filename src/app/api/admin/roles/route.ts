// app/api/admin/roles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { roles, userRoles } from '@/lib/database/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
  permissions: z.record(z.record(z.boolean())),
  sidebarPermissions: z.array(z.string()).optional().default([]),
  pagePermissions: z.array(z.string()).optional().default([]),
});

// GET /api/admin/roles - Get all roles with user counts
export async function GET(request: NextRequest) {
  try {
    // Get roles with REAL-TIME user counts by joining with userRoles table
    const rolesWithCounts = await db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        permissions: roles.permissions,
        sidebarPermissions: roles.sidebarPermissions,
        pagePermissions: roles.pagePermissions,
        isDefault: roles.isDefault,
        isSystem: roles.isSystem,
        usersCount: roles.usersCount,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
      })
      .from(roles)
      .orderBy(desc(roles.createdAt));

    return NextResponse.json({
      success: true,
      roles: rolesWithCounts.map((r: any) => {
        // Ensure permissions is always an object
        let permissions = r.permissions;
        try {
          if (typeof permissions === 'string') {
            permissions = JSON.parse(permissions);
          }
        } catch (e) {
          permissions = {};
        }
        if (!permissions || typeof permissions !== 'object') {
          permissions = {};
        }

        return {
          id: r.id,
          name: r.name,
          description: r.description,
          permissions,
          sidebarPermissions: Array.isArray(r.sidebarPermissions) ? r.sidebarPermissions : [],
          pagePermissions: Array.isArray(r.pagePermissions) ? r.pagePermissions : [],
          isDefault: r.isDefault,
          isSystem: r.isSystem,
          usersCount: r.usersCount ?? 0,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt ?? r.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/roles - Create new role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createRoleSchema.parse(body);

    // Check if role name already exists
    const existingRole = await db
      .select()
      .from(roles)
      .where(eq(roles.name, validatedData.name))
      .limit(1);

    if (existingRole.length > 0) {
      return NextResponse.json(
        { error: 'Role name already exists' },
        { status: 400 }
      );
    }

    const [newRole] = await db
      .insert(roles)
      .values({
        name: validatedData.name,
        description: validatedData.description,
        permissions: validatedData.permissions,
        sidebarPermissions: validatedData.sidebarPermissions,
        pagePermissions: validatedData.pagePermissions,
        isDefault: false,
        isSystem: false,
        usersCount: 0,
      })
      .returning();

    return NextResponse.json(
      { 
        role: {
          ...newRole,
          usersCount: 0,
          isSystem: false,
        }, 
        message: 'Role created successfully' 
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Failed to create role:', error);
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    );
  }
}