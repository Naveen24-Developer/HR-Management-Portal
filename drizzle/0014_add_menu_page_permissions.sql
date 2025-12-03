-- Add menu and page permissions to roles table
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "sidebar_permissions" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "page_permissions" jsonb DEFAULT '[]'::jsonb;

-- Update existing roles to have default permissions (admin gets all menus)
-- This is safe to run multiple times
UPDATE "roles" SET 
  sidebar_permissions = '["dashboard", "employees", "departments", "attendance", "leave", "payroll", "projects", "reports", "roles", "communication", "security", "settings"]'::jsonb,
  page_permissions = '["dashboard", "employees", "departments", "attendance", "leave", "payroll", "projects", "reports", "roles", "communication", "security", "settings"]'::jsonb
WHERE name = 'Admin' OR is_system = true;
