//src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { signIn, generateToken } from '@/lib/auth/utils';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/database/db';
import { users, userProfiles, userRoles, roles, employees, departments } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Default admin credentials
    if (username === 'Admin' && password === 'Admin123') {
      // Check if admin user exists
      const adminUserResult = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          firstName: userProfiles.firstName,
          lastName: userProfiles.lastName,
        })
        .from(users)
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(eq(users.email, 'admin@hrms.com'))
        .limit(1);

      let adminUser;
      let createdAdminId: string | null = null;

      if (adminUserResult.length === 0) {
        // Create admin user
        const newAdmin = await db.insert(users).values({
          email: 'admin@hrms.com',
          password: 'Admin123', // WARNING: Storing plain text passwords is a security risk.
          role: 'admin',
        }).returning({ id: users.id });

        const adminId = newAdmin[0].id;
        createdAdminId = adminId;

        await db.insert(userProfiles).values({
          userId: adminId,
          firstName: 'System',
          lastName: 'Administrator',
        });

        adminUser = {
            username: 'Admin',
            role: 'admin',
            firstName: 'System',
            lastName: 'Administrator'
        };
      } else {
        const existingUser = adminUserResult[0];
        adminUser = {
            username: 'Admin', // The username is hardcoded to 'Admin' for this special login
            role: existingUser.role,
            firstName: existingUser.firstName,
            lastName: existingUser.lastName
        };
      }

      // Generate JWT token for admin so they can check in
      const adminUserRecord = adminUserResult.length > 0 
        ? adminUserResult[0] 
        : { id: createdAdminId!, role: 'admin', email: 'admin@hrms.com' };
      
      // Ensure admin has an employee record (required for attendance check-in)
      const adminUserId = adminUserRecord.id;
      const [adminEmployee] = await db
        .select()
        .from(employees)
        .where(eq(employees.userId, adminUserId))
        .limit(1);
      
      if (!adminEmployee) {
        try {
          // Get or create default admin department
          let adminDeptRecords = await db
            .select()
            .from(departments)
            .where(eq(departments.name, 'Administration'))
            .limit(1);
          
          let adminDeptId = adminDeptRecords[0]?.id;
          if (!adminDeptId) {
            const created = await db
              .insert(departments)
              .values({
                name: 'Administration',
                description: 'Administration Department',
              })
              .returning();
            adminDeptId = created[0]?.id;
          }
          
          // Create employee record for admin
          await db
            .insert(employees)
            .values({
              userId: adminUserId,
              departmentId: adminDeptId,
              employeeId: 'ADMIN-001',
              position: 'System Administrator',
              status: 'active',
            });
        } catch (empErr) {
          // Log error but don't block login
          console.warn('Failed to create admin employee record:', empErr);
        }
      }
      
      const adminToken = generateToken({
        id: adminUserRecord.id,
        role: adminUserRecord.role,
        email: adminUserRecord.email
      });

      const response = NextResponse.json({
        success: true,
        message: 'Login successful',
        user: {
          id: adminUserRecord.id,
          email: adminUserRecord.email,
          role: adminUserRecord.role || 'admin',
          username: 'Admin',
          firstName: adminUser.firstName || 'System',
          lastName: adminUser.lastName || 'Administrator',
        },
        token: adminToken
      });

      // Set HTTP-only auth token cookie so server-side endpoints can use it
      response.cookies.set('auth-token', adminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    // Placeholder for other user authentication
    // Try to authenticate against local users table (email/username)
    const userResult = await db
      .select({ id: users.id, email: users.email, password: users.password, role: users.role })
      .from(users)
      .where(eq(users.email, username))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const userRow = userResult[0];
    const storedPassword = userRow.password || '';

    let passwordMatches = false;
    // Support bcrypt-hashed passwords if present, otherwise fall back to plain compare
    try {
      if (storedPassword.startsWith('$2')) {
        passwordMatches = await bcrypt.compare(password, storedPassword);
      } else {
        passwordMatches = password === storedPassword;
      }
    } catch (e) {
      passwordMatches = password === storedPassword;
    }

    if (!passwordMatches) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Fetch assigned role (first assignment) and permissions
    const roleAssignment = await db
      .select({ 
        roleId: userRoles.roleId, 
        roleName: roles.name, 
        permissions: roles.permissions,
        sidebarPermissions: roles.sidebarPermissions,
        pagePermissions: roles.pagePermissions
      })
      .from(userRoles)
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userRow.id))
      .limit(1);

    let assignedRoleId: string | undefined = undefined;
    let assignedRoleName: string | undefined = undefined;
    let permissions: any = {};
    let sidebarPermissions: string[] = [];
    let pagePermissions: string[] = [];

    if (roleAssignment.length > 0) {
      assignedRoleId = (roleAssignment[0] as any).roleId;
      assignedRoleName = (roleAssignment[0] as any).roleName;
      permissions = (roleAssignment[0] as any).permissions || {};
      sidebarPermissions = (roleAssignment[0] as any).sidebarPermissions || [];
      pagePermissions = (roleAssignment[0] as any).pagePermissions || [];
      
      try {
        if (typeof permissions === 'string') permissions = JSON.parse(permissions);
        if (typeof sidebarPermissions === 'string') sidebarPermissions = JSON.parse(sidebarPermissions);
        if (typeof pagePermissions === 'string') pagePermissions = JSON.parse(pagePermissions);
      } catch (e) {
        permissions = {};
        sidebarPermissions = [];
        pagePermissions = [];
      }
    }

    const token = generateToken(
      { id: userRow.id, role: userRow.role, email: userRow.email }, 
      { roleId: assignedRoleId, roleName: assignedRoleName, permissions, sidebarPermissions, pagePermissions }
    );

    const response = NextResponse.json({ 
      success: true, 
      message: 'Login successful', 
      user: { 
        id: userRow.id, 
        email: userRow.email, 
        role: userRow.role, 
        roleId: assignedRoleId, 
        roleName: assignedRoleName, 
        permissions,
        sidebarPermissions,
        pagePermissions
      }, 
      token 
    });

    // Set HTTP-only auth token cookie so server-side endpoints can use it
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
