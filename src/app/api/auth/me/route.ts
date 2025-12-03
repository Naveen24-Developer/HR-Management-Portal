// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { users, userProfiles, employees, departments } from '@/lib/database/schema';
import { verifyToken } from '@/lib/auth/utils';
import { eq, and } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {  
    // Accept token from cookie or Authorization header (Bearer)
    const cookieToken = request.cookies.get('auth-token')?.value;
    const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = cookieToken || headerToken;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded?.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userData = await db
      .select({
        user: users,
        profile: userProfiles,
        employee: employees,
        department: departments,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(employees, eq(users.id, employees.userId))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(eq(users.id, decoded.id), eq(users.isActive, true)))
      .limit(1);

    if (userData.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { user, profile, employee, department } = userData[0];

    let userResponse: any = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: profile?.firstName,
      lastName: profile?.lastName,
    };

    // Include permissions, sidebar, and page permissions from the token if present
    if (decoded.permissions) {
      userResponse.permissions = decoded.permissions;
    }
    if (decoded.sidebarPermissions) {
      userResponse.sidebarPermissions = decoded.sidebarPermissions;
    }
    if (decoded.pagePermissions) {
      userResponse.pagePermissions = decoded.pagePermissions;
    }
    if (decoded.roleId) {
      userResponse.roleId = decoded.roleId;
    }
    if (decoded.roleName) {
      userResponse.roleName = decoded.roleName;
    }

    if (user.role === 'employee' && employee) {
      userResponse.employee = {
        employeeId: employee.employeeId,
        department: department?.name,
      };
      // Add employeeId at root level for easier access
      userResponse.employeeId = employee.id;
    }

    return NextResponse.json({ user: userResponse });

  } catch (error) {
    console.error('Me endpoint error:', error);
    // If token is invalid or expired, clear it
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        response.cookies.delete('auth-token');
        return response;
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
