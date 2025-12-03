# Employee Deletion System - Complete Documentation

## Overview
This document explains the complete employee deletion system that ensures when an employee is deleted, all related data is cleaned up across the entire application.

## How Employee Deletion Works

### 1. **Soft Delete with Complete Cleanup**
When an employee is deleted through `DELETE /api/admin/employees/[id]`:

#### Data Removed (Hard Delete):
- ✅ **Role Assignments** (`user_roles`) - All custom role assignments
- ✅ **Attendance Records** (`attendance`) - All check-in/check-out records
- ✅ **Leave Requests** (`leave_requests`) - All leave applications
- ✅ **Payroll Records** (`payroll`) - All salary/payment records
- ✅ **Project Team Assignments** (`project_team`) - Removed from all projects

#### Data Deactivated (Soft Delete):
- 🔒 **Employee Record** (`employees`) - `isActive = false`, `status = 'inactive'`
- 🔒 **User Account** (`users`) - `isActive = false`

### 2. **Transaction-Based Cleanup**
All deletions happen within a database transaction to ensure data integrity:

```typescript
await db.transaction(async (tx) => {
  // 1. Remove role assignments
  await tx.delete(userRoles).where(eq(userRoles.userId, employee.userId));
  
  // 2. Remove attendance records
  await tx.delete(attendance).where(eq(attendance.employeeId, employeeId));
  
  // 3. Remove leave requests
  await tx.delete(leaveRequests).where(eq(leaveRequests.employeeId, employeeId));
  
  // 4. Remove payroll records
  await tx.delete(payroll).where(eq(payroll.employeeId, employeeId));
  
  // 5. Remove project team assignments
  await tx.delete(projectTeam).where(eq(projectTeam.employeeId, employeeId));
  
  // 6. Deactivate employee record
  await tx.update(employees).set({ isActive: false, status: 'inactive' });
  
  // 7. Deactivate user account
  await tx.update(users).set({ isActive: false });
});
```

## Where Deleted Employees Are Filtered

### APIs That Show Only Active Employees:

#### 1. **Department Management**
- `GET /api/admin/departments` - Employee count shows only active employees
- `DELETE /api/admin/departments/[id]` - Checks only active employees before deletion

```typescript
// Department count query
.leftJoin(
  employees, 
  and(
    eq(employees.departmentId, departments.id),
    eq(employees.isActive, true) // ✅ Only active
  )
)
```

#### 2. **Role Assignment**
- `GET /api/admin/roles/[id]/assign` - Shows only active users
- Admin users excluded from role assignment

```typescript
// Role assignment query
.where(eq(users.isActive, true)) // ✅ Only active users
```

#### 3. **Employee List**
- `GET /api/admin/employees` - Lists only active employees

```typescript
const conditions = [eq(employees.isActive, true)]; // ✅ Only active
```

#### 4. **Reports & Statistics**
- `GET /api/admin/reports` - All reports filter by `users.isActive = true`
- `GET /api/admin/reports/stats` - Statistics count only active employees
- `GET /api/admin/dashboard` - Dashboard stats filter active employees

```typescript
.where(and(
  eq(employees.status, 'active'),
  eq(users.isActive, true) // ✅ Only active
))
```

#### 5. **Payroll Processing**
- `POST /api/admin/payroll` - Processes payroll only for active employees

```typescript
.where(eq(employees.status, 'active')) // ✅ Only active
```

#### 6. **Attendance**
- All attendance queries use employee lookups that already filter inactive employees

## Database Schema Constraints

### Foreign Key Cascade Delete
The migration `0013_add_cascade_delete.sql` adds CASCADE DELETE constraints:

```sql
-- When employee deleted → remove attendance
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employees_id_fk" 
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

-- When employee deleted → remove leave requests
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employees_id_fk" 
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

-- When employee deleted → remove payroll records
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_employee_id_employees_id_fk" 
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

-- When employee deleted → remove project assignments
ALTER TABLE "project_team" ADD CONSTRAINT "project_team_employee_id_employees_id_fk" 
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

-- When user deleted → remove employee record
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- When user deleted → remove user profile
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- When user deleted → remove role assignments
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
```

### Benefits of Cascade Delete:
1. **Automatic Cleanup** - Database ensures referential integrity
2. **Backup Safety** - If manual transaction fails, CASCADE ensures cleanup
3. **Data Consistency** - No orphaned records in related tables

## Testing Checklist

### After Deleting an Employee:

- [ ] Employee not shown in employee list (`/dashboard/employees`)
- [ ] Department count decremented correctly (`/dashboard/departments`)
- [ ] Employee not shown in role assignment modal (`/dashboard/roles`)
- [ ] Attendance records removed (check database)
- [ ] Leave requests removed (check database)
- [ ] Payroll records removed (check database)
- [ ] Project team assignments removed (check database)
- [ ] User role assignments removed (check database)
- [ ] Dashboard statistics reflect correct active count
- [ ] Reports show correct employee counts
- [ ] Payroll processing excludes deleted employee

### Database Verification Queries:

```sql
-- Check if employee is properly deactivated
SELECT * FROM employees WHERE id = '<employee_id>';
-- Should show: isActive = false, status = 'inactive'

-- Check if user is deactivated
SELECT * FROM users WHERE id = '<user_id>';
-- Should show: isActive = false

-- Verify no attendance records remain
SELECT COUNT(*) FROM attendance WHERE employee_id = '<employee_id>';
-- Should return: 0

-- Verify no leave requests remain
SELECT COUNT(*) FROM leave_requests WHERE employee_id = '<employee_id>';
-- Should return: 0

-- Verify no payroll records remain
SELECT COUNT(*) FROM payroll WHERE employee_id = '<employee_id>';
-- Should return: 0

-- Verify no project assignments remain
SELECT COUNT(*) FROM project_team WHERE employee_id = '<employee_id>';
-- Should return: 0

-- Verify no role assignments remain
SELECT COUNT(*) FROM user_roles WHERE user_id = '<user_id>';
-- Should return: 0
```

## Why Soft Delete for Employee/User?

While related data is hard deleted, employee and user records are soft deleted because:

1. **Audit Trail** - Maintain history of who worked at the company
2. **Historical Reports** - Past reports reference employee IDs
3. **Data Recovery** - Can reactivate if deletion was accidental
4. **Compliance** - Some regulations require retention of employee records
5. **Financial Records** - Past payroll/tax records need employee reference

## Migration Instructions

### To Apply CASCADE DELETE Constraints:

```bash
# Run the migration
npm run db:push

# Or apply manually
psql -U your_user -d your_database -f drizzle/0013_add_cascade_delete.sql
```

### Rollback (if needed):

```sql
-- Remove CASCADE constraints
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_user_id_users_id_fk";
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id");
-- Repeat for all tables
```

## Best Practices

1. **Always check before delete** - Confirm with user before deletion
2. **Transaction-based** - All cleanup must be in a transaction
3. **Filter everywhere** - All queries must filter `isActive = true`
4. **Log deletions** - Consider adding to security_logs table
5. **Backup first** - Take database backup before bulk deletions

## Future Enhancements

- [ ] Add "Restore Employee" functionality
- [ ] Archive deleted employees to separate table
- [ ] Add deletion confirmation with reason field
- [ ] Email notification to admin on employee deletion
- [ ] Soft delete with 30-day grace period before hard delete
- [ ] Export employee data before deletion (GDPR compliance)

## Summary

✅ **Complete Cleanup** - All employee data removed from system
✅ **Dynamic Counts** - Department and role counts show only active employees
✅ **Database Integrity** - CASCADE constraints ensure no orphaned records
✅ **Transaction Safety** - All operations atomic and consistent
✅ **Audit Trail** - Employee records preserved for compliance
✅ **UI Consistency** - Deleted employees never shown in any interface
