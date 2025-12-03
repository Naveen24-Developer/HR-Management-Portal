-- Add ON DELETE CASCADE to foreign key constraints for automatic cleanup

-- Drop existing constraints and recreate with CASCADE
-- This ensures that when an employee is deleted, all related records are automatically removed

-- User Roles: when user is deleted, remove role assignments
ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_user_id_users_id_fk";
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_role_id_roles_id_fk";
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" 
  FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;

-- Attendance: when employee is deleted, remove attendance records
ALTER TABLE "attendance" DROP CONSTRAINT IF EXISTS "attendance_employee_id_employees_id_fk";
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employees_id_fk" 
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

-- Leave Requests: when employee is deleted, remove leave requests
ALTER TABLE "leave_requests" DROP CONSTRAINT IF EXISTS "leave_requests_employee_id_employees_id_fk";
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employees_id_fk" 
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

-- Payroll: when employee is deleted, remove payroll records
ALTER TABLE "payroll" DROP CONSTRAINT IF EXISTS "payroll_employee_id_employees_id_fk";
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_employee_id_employees_id_fk" 
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

-- Project Team: when employee is deleted, remove from project teams
ALTER TABLE "project_team" DROP CONSTRAINT IF EXISTS "project_team_employee_id_employees_id_fk";
ALTER TABLE "project_team" ADD CONSTRAINT "project_team_employee_id_employees_id_fk" 
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE;

-- Employees: when user is deleted, remove employee record
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_user_id_users_id_fk";
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- User Profiles: when user is deleted, remove profile
ALTER TABLE "user_profiles" DROP CONSTRAINT IF EXISTS "user_profiles_user_id_users_id_fk";
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
