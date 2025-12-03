// app/api/admin/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { 
  users, 
  employees, 
  attendance, 
  leaveRequests, 
  projects, 
  departments,
  userProfiles 
} from '@/lib/database/schema';
import { eq, and, gte, lte, count, sum, avg, sql, between } from 'drizzle-orm';
import { verifyToken, getTokenFromRequest } from '@/lib/auth/utils';

// GET - Generate report
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const department = searchParams.get('department');

    if (!type || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    let reportData;

    switch (type) {
      case 'attendance':
        reportData = await generateAttendanceReport(startDate, endDate, department);
        break;
      case 'leave':
        reportData = await generateLeaveReport(startDate, endDate, department);
        break;
      case 'employee':
        reportData = await generateEmployeeReport(department);
        break;
      case 'payroll':
        reportData = await generatePayrollReport(startDate, endDate, department);
        break;
      case 'project':
        reportData = await generateProjectReport(startDate, endDate);
        break;
      case 'department':
        reportData = await generateDepartmentReport(startDate, endDate);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    const report = {
      id: `report_${Date.now()}`,
      type,
      title: getReportTitle(type, startDate, endDate),
      description: getReportDescription(type),
      data: reportData,
      generatedAt: new Date().toISOString(),
      dateRange: { start: startDate, end: endDate },
    };

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Generate Attendance Report
async function generateAttendanceReport(startDate: string, endDate: string, department?: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  let whereConditions = [
    between(attendance.date, start, end)
  ];

  if (department) {
    whereConditions.push(eq(departments.name, department));
  }

  // Overall attendance statistics
  const attendanceStats = await db
    .select({
      totalDays: count(attendance.id),
      presentDays: count(attendance.id.filter(attendance.status === 'present')),
      absentDays: count(attendance.id.filter(attendance.status === 'absent')),
      lateDays: count(attendance.id.filter(attendance.status === 'late')),
      averageWorkHours: avg(attendance.workHours),
    })
    .from(attendance)
    .innerJoin(employees, eq(attendance.employeeId, employees.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(and(...whereConditions));

  // Daily attendance trend
  const dailyTrend = await db
    .select({
      date: attendance.date,
      present: count(attendance.id.filter(attendance.status === 'present')),
      absent: count(attendance.id.filter(attendance.status === 'absent')),
      late: count(attendance.id.filter(attendance.status === 'late')),
    })
    .from(attendance)
    .where(between(attendance.date, start, end))
    .groupBy(attendance.date)
    .orderBy(attendance.date);

  // Department-wise breakdown
  const departmentBreakdown = await db
    .select({
      departmentName: departments.name,
      totalEmployees: count(employees.id),
      averageAttendance: avg(
        sql`CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END`
      ),
    })
    .from(attendance)
    .innerJoin(employees, eq(attendance.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(and(...whereConditions))
    .groupBy(departments.name);

  return {
    summary: attendanceStats[0],
    dailyTrend,
    departmentBreakdown,
  };
}

// Generate Leave Report
async function generateLeaveReport(startDate: string, endDate: string, department?: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  let whereConditions = [
    between(leaveRequests.startDate, start, end)
  ];

  if (department) {
    whereConditions.push(eq(departments.name, department));
  }

  // Leave type breakdown
  const leaveTypeBreakdown = await db
    .select({
      leaveType: leaveRequests.leaveType,
      totalRequests: count(leaveRequests.id),
      approvedRequests: count(leaveRequests.id.filter(leaveRequests.status === 'approved')),
      rejectedRequests: count(leaveRequests.id.filter(leaveRequests.status === 'rejected')),
      pendingRequests: count(leaveRequests.id.filter(leaveRequests.status === 'pending')),
      totalDays: sum(leaveRequests.days),
    })
    .from(leaveRequests)
    .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(and(...whereConditions))
    .groupBy(leaveRequests.leaveType);

  // Monthly trend
  const monthlyTrend = await db
    .select({
      month: sql`EXTRACT(MONTH FROM ${leaveRequests.startDate})`,
      year: sql`EXTRACT(YEAR FROM ${leaveRequests.startDate})`,
      totalLeaves: count(leaveRequests.id),
      totalDays: sum(leaveRequests.days),
    })
    .from(leaveRequests)
    .where(between(leaveRequests.startDate, start, end))
    .groupBy(sql`EXTRACT(MONTH FROM ${leaveRequests.startDate})`, sql`EXTRACT(YEAR FROM ${leaveRequests.startDate})`)
    .orderBy(sql`EXTRACT(YEAR FROM ${leaveRequests.startDate})`, sql`EXTRACT(MONTH FROM ${leaveRequests.startDate})`);

  return {
    leaveTypeBreakdown,
    monthlyTrend,
  };
}

// Generate Employee Report
async function generateEmployeeReport(department?: string) {
  let whereConditions = [eq(users.isActive, true)];

  if (department) {
    whereConditions.push(eq(departments.name, department));
  }

  // Department distribution
  const departmentDistribution = await db
    .select({
      departmentName: departments.name,
      employeeCount: count(employees.id),
      averageSalary: avg(employees.salary),
    })
    .from(employees)
    .innerJoin(users, eq(employees.userId, users.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(and(...whereConditions))
    .groupBy(departments.name);

  // Employment type breakdown
  const employmentTypeBreakdown = await db
    .select({
      employmentType: employees.employmentType,
      count: count(employees.id),
    })
    .from(employees)
    .innerJoin(users, eq(employees.userId, users.id))
    .where(and(...whereConditions))
    .groupBy(employees.employmentType);

  // Joining trend (last 12 months)
  const joiningTrend = await db
    .select({
      month: sql`EXTRACT(MONTH FROM ${employees.joinDate})`,
      year: sql`EXTRACT(YEAR FROM ${employees.joinDate})`,
      newHires: count(employees.id),
    })
    .from(employees)
    .innerJoin(users, eq(employees.userId, users.id))
    .where(
      and(
        eq(users.isActive, true),
        gte(employees.joinDate, new Date(new Date().setFullYear(new Date().getFullYear() - 1)))
      )
    )
    .groupBy(sql`EXTRACT(MONTH FROM ${employees.joinDate})`, sql`EXTRACT(YEAR FROM ${employees.joinDate})`)
    .orderBy(sql`EXTRACT(YEAR FROM ${employees.joinDate})`, sql`EXTRACT(MONTH FROM ${employees.joinDate})`);

  return {
    departmentDistribution,
    employmentTypeBreakdown,
    joiningTrend,
  };
}

// Generate Payroll Report (simplified)
async function generatePayrollReport(startDate: string, endDate: string, department?: string) {
  // This would integrate with your payroll system
  // Returning mock data for demonstration
  return {
    summary: {
      totalEmployees: 45,
      totalSalary: 450000,
      averageSalary: 10000,
      taxDeductions: 90000,
      netPayout: 360000,
    },
    departmentBreakdown: [
      { department: 'Engineering', totalSalary: 250000, averageSalary: 12500 },
      { department: 'Sales', totalSalary: 120000, averageSalary: 10000 },
      { department: 'Marketing', totalSalary: 80000, averageSalary: 8000 },
    ],
  };
}

// Generate Project Report
async function generateProjectReport(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const projectStats = await db
    .select({
      status: projects.status,
      count: count(projects.id),
      totalBudget: sum(projects.budget),
      averageProgress: avg(projects.progress),
    })
    .from(projects)
    .where(
      and(
        gte(projects.startDate, start),
        lte(projects.startDate, end)
      )
    )
    .groupBy(projects.status);

  const departmentProjectBreakdown = await db
    .select({
      departmentName: departments.name,
      totalProjects: count(projects.id),
      activeProjects: count(projects.id.filter(projects.status === 'active')),
      completedProjects: count(projects.id.filter(projects.status === 'completed')),
      totalBudget: sum(projects.budget),
    })
    .from(projects)
    .leftJoin(departments, eq(projects.departmentId, departments.id))
    .where(
      and(
        gte(projects.startDate, start),
        lte(projects.startDate, end)
      )
    )
    .groupBy(departments.name);

  return {
    projectStats,
    departmentProjectBreakdown,
  };
}

// Generate Department Report
async function generateDepartmentReport(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const departmentPerformance = await db
    .select({
      departmentName: departments.name,
      totalEmployees: count(employees.id),
      averageAttendance: avg(
        sql`CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END`
      ),
      totalLeaves: count(leaveRequests.id),
      activeProjects: count(projects.id.filter(projects.status === 'active')),
    })
    .from(departments)
    .leftJoin(employees, eq(departments.id, employees.departmentId))
    .leftJoin(attendance, and(
      eq(attendance.employeeId, employees.id),
      between(attendance.date, start, end)
    ))
    .leftJoin(leaveRequests, and(
      eq(leaveRequests.employeeId, employees.id),
      between(leaveRequests.startDate, start, end)
    ))
    .leftJoin(projects, eq(projects.departmentId, departments.id))
    .groupBy(departments.name);

  return {
    departmentPerformance,
  };
}

// Helper functions
function getReportTitle(type: string, startDate: string, endDate: string) {
  const titles = {
    attendance: `Attendance Report - ${formatDate(startDate)} to ${formatDate(endDate)}`,
    leave: `Leave Analysis Report - ${formatDate(startDate)} to ${formatDate(endDate)}`,
    employee: 'Employee Summary Report',
    payroll: `Payroll Summary - ${formatDate(startDate)} to ${formatDate(endDate)}`,
    project: `Project Progress Report - ${formatDate(startDate)} to ${formatDate(endDate)}`,
    department: 'Department Performance Report',
  };
  return titles[type as keyof typeof titles] || 'Report';
}

function getReportDescription(type: string) {
  const descriptions = {
    attendance: 'Detailed analysis of employee attendance patterns and trends',
    leave: 'Comprehensive overview of leave utilization and patterns',
    employee: 'Summary of employee distribution and demographics',
    payroll: 'Payroll expenditure analysis and salary distribution',
    project: 'Progress tracking and performance analysis of projects',
    department: 'Department-wise performance and resource allocation',
  };
  return descriptions[type as keyof typeof descriptions] || 'Generated report';
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}