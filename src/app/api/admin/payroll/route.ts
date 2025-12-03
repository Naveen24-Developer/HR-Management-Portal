// app/api/admin/payroll/route.ts
import { db } from '@/lib/database/db';
import { payroll, employees, users, userProfiles, departments } from '@/lib/database/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest } from '@/lib/auth/utils';
import { canPerformAction } from '@/lib/auth/permissions';

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

    // Check for 'view' permission on payroll module
    if (!canPerformAction(decoded.role, decoded.permissions, 'payroll', 'view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let query = db
      .select({
        id: payroll.id,
        employeeId: payroll.employeeId,
        employeeName: sql<string>`CONCAT(${userProfiles.firstName}, ' ', ${userProfiles.lastName})`,
        month: payroll.month,
        year: payroll.year,
        basicSalary: payroll.basicSalary,
        allowances: payroll.allowances,
        deductions: payroll.deductions,
        bonus: payroll.bonus,
        netSalary: payroll.netSalary,
        status: payroll.status,
        paidAt: payroll.paidAt,
        department: departments.name,
      })
      .from(payroll)
      .innerJoin(employees, eq(payroll.employeeId, employees.id))
      .innerJoin(users, eq(employees.userId, users.id))
      .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(departments, eq(employees.departmentId, departments.id));

    if (month && year) {
      query = query.where(
        and(
          eq(payroll.month, parseInt(month)),
          eq(payroll.year, parseInt(year))
        )
      );
    }

    const payrollList = await query.orderBy(desc(payroll.year), desc(payroll.month));

    return NextResponse.json({
      success: true,
      payroll: payrollList,
    });
  } catch (error) {
    console.error('Error fetching payroll:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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

    // Check for 'create' permission on payroll module
    if (!canPerformAction(decoded.role, decoded.permissions, 'payroll', 'create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { month, year } = await request.json();

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      );
    }

    // Process payroll for all active employees
    const activeEmployees = await db
      .select({
        id: employees.id,
        salary: employees.salary,
      })
      .from(employees)
      .where(eq(employees.status, 'active'));

    const payrollRecords = activeEmployees.map(employee => ({
      employeeId: employee.id,
      month: month,
      year: year,
      basicSalary: employee.salary || 0,
      allowances: 0,
      deductions: 0,
      bonus: 0,
      netSalary: employee.salary || 0,
      status: 'processed',
    }));

    if (payrollRecords.length > 0) {
        await db.insert(payroll).values(payrollRecords);
    }

    return NextResponse.json({
      success: true,
      message: 'Payroll processed successfully',
      recordsProcessed: payrollRecords.length,
    });
  } catch (error) {
    console.error('Error processing payroll:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}