// app/api/admin/departments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { departments, employees } from '@/lib/database/schema';
import { eq, and, count, sql } from 'drizzle-orm';

// Simple token verification (same as employees API)
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  // For demo, accept any token - in production, verify properly
  return { id: '1', role: 'admin' };
}
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get departments with active employee counts only
    const departmentsWithCounts = await db
      .select({
        id: departments.id,
        name: departments.name,
        description: departments.description,
        isActive: departments.isActive,
        createdAt: departments.createdAt,
        employeeCount: count(employees.id),
      })
      .from(departments)
      .leftJoin(
        employees, 
        and(
          eq(employees.departmentId, departments.id),
          eq(employees.isActive, true)
        )
      )
      .groupBy(departments.id, departments.name, departments.description, departments.isActive, departments.createdAt)
      .orderBy(departments.name);

    return NextResponse.json({ 
      departments: departmentsWithCounts 
    });
  } catch (error) {
    console.error('Failed to fetch departments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}

// app/api/admin/departments/route.ts
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Department name is required' },
        { status: 400 }
      );
    }

    // Check if department name already exists (case-insensitive, trimmed)
    const normalized = name.trim();
    const existingDepartment = await db
      .select({
        id: departments.id,
        name: departments.name,
        description: departments.description,
        isActive: departments.isActive,
        createdAt: departments.createdAt,
      })
      .from(departments)
      // Compare lowercase names to avoid conflicts due to casing or trailing/leading spaces
      .where(sql`LOWER(${departments.name}) = ${normalized.toLowerCase()}`)
      .limit(1);

    if (existingDepartment.length > 0) {
      return NextResponse.json(
        { error: 'Department name already exists' },
        { status: 409 }
      );
    }

    // Create new department (use trimmed name for consistency)
    const [newDepartment] = await db
      .insert(departments)
      .values({
        name: normalized,
        description: description || null,
        isActive: true,
      })
      .returning();

    return NextResponse.json(
      { 
        message: 'Department created successfully',
        department: newDepartment 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create department:', error);
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 }
    );
  }
}