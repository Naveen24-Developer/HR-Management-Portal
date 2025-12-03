//src/lib/database/schema.ts
import { pgTable, uuid, varchar, text, timestamp, boolean, integer, date, time, decimal, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (extends Supabase auth)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  authId: uuid('auth_id'), // References auth.users(id) in Supabase
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  // Base role: 'admin' has full access, 'employee' uses assigned roles from userRoles table
  role: varchar('role', { length: 20 }).notNull().default('employee'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  dateOfBirth: date('date_of_birth'),
  address: text('address'),
  position: varchar('position', { length: 100 }),
  salary: integer('salary').default(0),
  employeeId: varchar('employee_id', { length: 50 }).unique(),
});

// Departments table - Updated with better constraints
export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  departmentId: uuid('department_id').references(() => departments.id),
  employeeId: varchar('employee_id', { length: 50 }).unique(),
  position: varchar('position', { length: 100 }),
  joinDate: date('join_date'),
  employmentType: varchar('employment_type', { length: 50 }),
  salary: integer('salary').default(0),
  status: varchar('status', { length: 20 }).default('active'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// UPDATED Attendance Table with full timestamp support
export const attendance = pgTable('attendance', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: uuid('employee_id').references(() => employees.id).notNull(),
  date: date('date').notNull(),
  checkIn: timestamp('check_in'), // Full timestamp with date and time
  // Audit fields for check-in
  checkInIp: varchar('check_in_ip', { length: 45 }), // store IPv4/IPv6 string
  checkInLatitude: decimal('check_in_latitude', { precision: 10, scale: 7 }),
  checkInLongitude: decimal('check_in_longitude', { precision: 10, scale: 7 }),
  // Whether the check-in passed restriction validation (IP/GEO)
  restrictionPassed: boolean('restriction_passed'),
  // If restrictionPassed === false, store failure code (eg. IP_NOT_ALLOWED / GEO_OUTSIDE)
  restrictionFailureCode: varchar('restriction_failure_code', { length: 50 }),
  checkOut: timestamp('check_out'), // Full timestamp with date and time
  status: varchar('status', { length: 20 }).default('not_checked_in'), // not_checked_in, present, late, half_day, absent
  checkInStatus: varchar('check_in_status', { length: 20 }), // early, on_time, late
  checkInDuration: integer('check_in_duration').default(0), // Minutes early (negative) or late (positive)
  checkOutStatus: varchar('check_out_status', { length: 20 }), // early, on_time, over_time
  checkOutDuration: integer('check_out_duration').default(0), // Minutes early (negative) or overtime (positive)
  workHours: decimal('work_hours', { precision: 4, scale: 2 }).default('0'),
  lateMinutes: integer('late_minutes').default(0), // Minutes late after grace period
  earlyCheckout: boolean('early_checkout').default(false), // If checked out before minimum work hours
  overtimeMinutes: integer('overtime_minutes').default(0), // Minutes worked beyond required hours
  notes: text('notes'),
  isManualEntry: boolean('is_manual_entry').default(false), // Track if admin manually entered
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// NEW: Attendance Settings Table (replaces jsonb in system_settings)
export const attendanceSettings = pgTable('attendance_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  workHours: decimal('work_hours', { precision: 3, scale: 1 }).notNull().default('8.0'), // Standard work hours per day
  overtimeRate: decimal('overtime_rate', { precision: 3, scale: 1 }).notNull().default('1.5'), // Overtime multiplier
  gracePeriod: integer('grace_period').notNull().default(15), // Grace period in minutes
  autoCheckout: boolean('auto_checkout').default(true),
  checkInStart: time('check_in_start').notNull().default('08:00'), // Check-in window start
  checkInEnd: time('check_in_end').notNull().default('10:00'), // Check-in window end
  checkOutStart: time('check_out_start').notNull().default('17:00'), // Check-out window start
  checkOutEnd: time('check_out_end').notNull().default('19:00'), // Check-out window end
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Leave Requests
export const leaveRequests = pgTable('leave_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: uuid('employee_id').references(() => employees.id),
  approverId: uuid('approver_id').references(() => users.id), // Who will approve this request
  leaveType: varchar('leave_type', { length: 50 }).notNull(), // sick, casual, earned, maternity, paternity
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  days: integer('days').notNull(),
  reason: text('reason'),
  status: varchar('status', { length: 20 }).default('pending'), // pending, approved, rejected
  approvedBy: uuid('approved_by').references(() => users.id), // Who actually approved/rejected
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'), // Reason for rejection
  emergencyContact: varchar('emergency_contact', { length: 100 }),
  handoverNotes: text('handover_notes'),
  documentUrl: text('document_url'),
  isManualEntry: boolean('is_manual_entry').default(false), // True if admin created manually
  manualEntryBy: uuid('manual_entry_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Leave Policies
export const leavePolicies = pgTable('leave_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  leaveType: varchar('leave_type', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  annualQuota: integer('annual_quota').notNull().default(0),
  maxConsecutiveDays: integer('max_consecutive_days'),
  requiresDocument: boolean('requires_document').default(false),
  requiresApproval: boolean('requires_approval').default(true),
  carryForwardEnabled: boolean('carry_forward_enabled').default(false),
  maxCarryForward: integer('max_carry_forward').default(0),
  minNoticeDays: integer('min_notice_days').default(0),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Leave Balances
export const leaveBalances = pgTable('leave_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: uuid('employee_id').references(() => employees.id).notNull(),
  leaveType: varchar('leave_type', { length: 50 }).notNull(),
  year: integer('year').notNull(),
  totalQuota: integer('total_quota').notNull().default(0),
  usedQuota: integer('used_quota').notNull().default(0),
  pendingQuota: integer('pending_quota').notNull().default(0),
  availableQuota: integer('available_quota').notNull().default(0),
  carriedForward: integer('carried_forward').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Projects
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  departmentId: uuid('department_id').references(() => departments.id),
  managerId: uuid('manager_id').references(() => users.id),
  startDate: date('start_date'),
  endDate: date('end_date'),
  status: varchar('status', { length: 50 }).default('active'), // active, on_hold, completed, cancelled
  priority: varchar('priority', { length: 20 }).default('medium'), // high, medium, low
  budget: integer('budget'),
  progress: integer('progress').default(0), // 0-100 percentage
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Project Team Members
export const projectTeam = pgTable('project_team', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id),
  employeeId: uuid('employee_id').references(() => employees.id),
  role: varchar('role', { length: 100 }),
  joinedAt: timestamp('joined_at').defaultNow(),
});

// Payroll
export const payroll = pgTable('payroll', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: uuid('employee_id').references(() => employees.id),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  basicSalary: integer('basic_salary').notNull(),
  allowances: integer('allowances').default(0),
  deductions: integer('deductions').default(0),
  bonus: integer('bonus').default(0),
  netSalary: integer('net_salary').notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // pending, processed, paid
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Announcements
export const announcements = pgTable('announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 20 }).default('general'), // general, urgent, event
  target: varchar('target', { length: 20 }).default('all'), // all, department, role
  targetValue: varchar('target_value', { length: 100 }),
  scheduledFor: timestamp('scheduled_for'),
  status: varchar('status', { length: 20 }).default('draft'), // draft, scheduled, sent
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Roles and Permissions
export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  permissions: jsonb('permissions').notNull(),
  sidebarPermissions: jsonb('sidebar_permissions').default('[]'),
  pagePermissions: jsonb('page_permissions').default('[]'),
  isDefault: boolean('is_default').default(false),
  isSystem: boolean('is_system').default(false), // system roles cannot be deleted/modified
  usersCount: integer('users_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User <-> Role assignment table
export const userRoles = pgTable('user_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  roleId: uuid('role_id').references(() => roles.id),
  assignedBy: uuid('assigned_by').references(() => users.id),
  assignedAt: timestamp('assigned_at').defaultNow(),
});

// Security Logs
export const securityLogs = pgTable('security_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  status: varchar('status', { length: 20 }).notNull(), // success, failed
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// System Settings
export const systemSettings = pgTable('system_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  category: varchar('category', { length: 50 }).notNull(), // company, attendance, leave, payroll
  settings: jsonb('settings').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Reports
export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // attendance, payroll, leave, department
  parameters: jsonb('parameters'),
  generatedBy: uuid('generated_by').references(() => users.id),
  fileUrl: text('file_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const holidays = pgTable('holidays', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    date: date('date').notNull(),
    description: text('description'),
    isRecurring: boolean('is_recurring').default(false),
    createdAt: timestamp('created_at').defaultNow(),
});

// IP Restrictions - Allowed IP ranges for check-in
export const ipRestrictions = pgTable('ip_restrictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 100 }).notNull(),
  allowedIps: jsonb('allowed_ips').notNull().default('[]'), // Array of IPs/CIDR ranges
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Geo Restrictions - Geographic zones for check-in
export const geoRestrictions = pgTable('geo_restrictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 100 }).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }).notNull(), // -90 to 90
  longitude: decimal('longitude', { precision: 10, scale: 7 }).notNull(), // -180 to 180
  radiusMeters: integer('radius_meters').notNull(), // Radius in meters
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Employee Restrictions - Links employees to IP/Geo restrictions
export const employeeRestrictions = pgTable('employee_restrictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').references(() => employees.id).notNull(),
  restrictionType: varchar('restriction_type', { length: 10, enum: ['IP', 'GEO'] }).notNull(),
  restrictionId: uuid('restriction_id').notNull(), // References ip_restrictions or geo_restrictions
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});



// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  employee: one(employees, {
    fields: [users.id],
    references: [employees.userId],
  }),
  leaveRequests: many(leaveRequests),
  projects: many(projects),
}));

// Add to relations section
export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  attendance: many(attendance),
  leaveRequests: many(leaveRequests),
  payroll: many(payroll),
  projectTeam: many(projectTeam),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  employee: one(employees, {
    fields: [attendance.employeeId],
    references: [employees.id],
  }),
}));

// Add to your schema.ts relations section
export const employeeRestrictionsRelations = relations(employeeRestrictions, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeRestrictions.employeeId],
    references: [employees.id],
  }),
  ipRestriction: one(ipRestrictions, {
    fields: [employeeRestrictions.restrictionId],
    references: [ipRestrictions.id],
  }),
  geoRestriction: one(geoRestrictions, {
    fields: [employeeRestrictions.restrictionId],
    references: [geoRestrictions.id],
  }),
}));

// Permission types
export const permissionModules = [
  'dashboard',
  'employees',
  'departments',
  'attendance',
  'leave',
  'payroll',
  'projects',
  'reports',
  'roles',
  'settings',
  'security',
  'communication'
] as const;

export const permissionActions = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'export'
] as const;