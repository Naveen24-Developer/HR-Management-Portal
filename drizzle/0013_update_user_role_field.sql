-- Update user role field to remove enum constraint for better RBAC flexibility
-- Migration: 0013_update_user_role_field

-- Drop the existing enum constraint if it exists
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
ALTER TABLE users ALTER COLUMN role TYPE varchar(20);

-- Set new default value
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'employee';

-- Update any existing 'hr' roles to 'employee' since we now use the userRoles table
UPDATE users SET role = 'employee' WHERE role = 'hr';

-- Ensure admin users keep their role
-- (admin role bypasses permission checks, employee role uses assigned permissions)
