// app/api/admin/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { projects, departments, employees, userProfiles, users, projectTeam } from '@/lib/database/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { verifyToken, getTokenFromRequest } from '@/lib/auth/utils';
import { canPerformAction } from '@/lib/auth/permissions';

// GET - Fetch projects
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check for 'view' permission on projects module
    if (!canPerformAction(decoded.role, decoded.permissions, 'projects', 'view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const department = searchParams.get('department');

    let whereConditions = [];

    if (status) {
      whereConditions.push(eq(projects.status, status));
    }

    if (priority) {
      whereConditions.push(eq(projects.priority, priority));
    }

    if (department) {
      whereConditions.push(eq(departments.name, department));
    }

    // Get projects with team member count and progress
    const projectsList = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        departmentName: departments.name,
        managerName: sql`CONCAT(${userProfiles.firstName}, ' ', ${userProfiles.lastName})`.as('managerName'),
        startDate: projects.startDate,
        endDate: projects.endDate,
        status: projects.status,
        priority: projects.priority,
        budget: projects.budget,
        progress: projects.progress,
        teamMembers: count(projectTeam.id),
        createdAt: projects.createdAt,
      })
      .from(projects)
      .leftJoin(departments, eq(projects.departmentId, departments.id))
      .leftJoin(employees, eq(projects.managerId, employees.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(projectTeam, eq(projects.id, projectTeam.projectId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(
        projects.id,
        projects.name,
        projects.description,
        departments.name,
        userProfiles.firstName,
        userProfiles.lastName,
        projects.startDate,
        projects.endDate,
        projects.status,
        projects.priority,
        projects.budget,
        projects.progress,
        projects.createdAt
      )
      .orderBy(desc(projects.createdAt));

    return NextResponse.json({
      success: true,
      projects: projectsList,
    });
  } catch (error) {
    console.error('Projects GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new project
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check for 'create' permission on projects module
    if (!canPerformAction(decoded.role, decoded.permissions, 'projects', 'create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      name,
      description,
      departmentId,
      managerId,
      startDate,
      endDate,
      status,
      priority,
      budget,
    } = await request.json();

    // Validate required fields
    if (!name || !description || !departmentId || !managerId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create project
    const [project] = await db
      .insert(projects)
      .values([
        {
          name,
          description,
          departmentId,
          managerId,
          // store dates as YYYY-MM-DD strings for PgDateString columns
          startDate: startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate,
          endDate: endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate,
          status: status || 'active',
          priority: priority || 'medium',
          budget: budget || 0,
          progress: 0,
        }
      ])
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Project created successfully',
      project,
    });
  } catch (error) {
    console.error('Project POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}