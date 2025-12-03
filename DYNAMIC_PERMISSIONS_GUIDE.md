# Dynamic Role-Based Permission System - Implementation Guide

## 🎯 Overview

The HRM Portal now has a fully dynamic, three-tier permission system that allows granular control over user access:

1. **Sidebar Menu Visibility** - Control which menus appear in the sidebar
2. **Page Access Control** - Control which pages users can navigate to
3. **Action Permissions** - Control what actions (view, create, edit, delete, approve, export) users can perform

## ✨ Key Features

- ✅ **Dynamic Menu Control**: Hide/show sidebar menus based on role
- ✅ **Page-Level Protection**: Block access to pages based on role permissions
- ✅ **Action-Level Permissions**: Fine-grained control over CRUD operations
- ✅ **Admin Override**: Admin role has full access to everything by default
- ✅ **Real-time Updates**: Permissions reflect immediately after role assignment
- ✅ **User-Friendly UI**: Tabbed interface for managing all permission types

## 📋 Setup Instructions

### 1. Run Database Migration

Execute the migration to add menu and page permission columns:

```bash
# Connect to your database and run:
psql -U your_user -d your_database -f drizzle/0014_add_menu_page_permissions.sql

# OR using your migration tool
npm run db:push
```

### 2. Verify Schema Updates

The `roles` table should now have these new columns:
- `sidebar_permissions` (jsonb) - Array of allowed menu IDs
- `page_permissions` (jsonb) - Array of allowed page IDs

## 🎨 How to Use

### For Administrators

#### Creating a New Role with Permissions

1. **Navigate to Roles & Access** (`/dashboard/roles`)
2. **Click "Create Role"**
3. **Fill in Basic Information** (Tab 1)
   - Role Name (e.g., "HR Manager", "Team Lead")
   - Description

4. **Set Sidebar Menus** (Tab 2)
   - Select which menus this role can see
   - Use "Select All" for quick setup
   - Example: HR Manager might see: Employees, Attendance, Leave, Payroll

5. **Set Page Access** (Tab 3)
   - Select which pages this role can access
   - ⚠️ **Important**: Pages should match sidebar menus (if a menu is visible, allow page access)
   - Example: If "Employees" menu is visible, allow "employees" page access

6. **Set Action Permissions** (Tab 4)
   - Define granular permissions for each module
   - **View**: Can see the data
   - **Create**: Can add new records
   - **Edit**: Can modify existing records
   - **Delete**: Can remove records
   - **Approve**: Can approve requests/submissions
   - **Export**: Can export data to files

7. **Save the Role**

#### Assigning Roles to Employees

1. **In the Roles page**, click "Assign Users" on any role card
2. **Search and select employees** to assign
3. **Click "Save Assignments"**
4. Employees will see their new permissions immediately upon next login

### For Developers

#### Protecting Pages with Permission Guards

Wrap your page components with the `PermissionGuard`:

```tsx
// src/app/dashboard/employees/page.tsx
import { PermissionGuard } from '@/components/auth/PermissionGuard';

export default function EmployeesPage() {
  return (
    <PermissionGuard module="employees" action="view" checkPageAccess={true}>
      <div>
        {/* Your page content */}
      </div>
    </PermissionGuard>
  );
}
```

#### Protecting Specific Actions

```tsx
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/auth/permissions';

function EmployeeList() {
  const { user } = useAuth();
  const canCreate = user?.role === 'admin' || hasPermission(user?.permissions, 'employees', 'create');
  const canEdit = user?.role === 'admin' || hasPermission(user?.permissions, 'employees', 'edit');
  const canDelete = user?.role === 'admin' || hasPermission(user?.permissions, 'employees', 'delete');

  return (
    <div>
      {canCreate && <button>Add Employee</button>}
      {canEdit && <button>Edit</button>}
      {canDelete && <button>Delete</button>}
    </div>
  );
}
```

## 🔐 Permission Flow

### Login Flow
1. User logs in with credentials
2. System fetches user's assigned role
3. Role includes:
   - `permissions` (action-level)
   - `sidebarPermissions` (menu visibility)
   - `pagePermissions` (page access)
4. JWT token generated with all permissions
5. Token stored in HTTP-only cookie + localStorage

### Sidebar Rendering
1. `Sidebar.tsx` reads user's `sidebarPermissions`
2. Filters `navigationItems` to show only allowed menus
3. Admin sees all menus by default
4. Dashboard is always visible for all users

### Page Access Control
1. User navigates to a page
2. `PermissionGuard` component checks `pagePermissions`
3. If not allowed, redirects to `/dashboard` (or custom fallback)
4. Admin bypasses all checks

### Action Execution
1. Component checks `user.permissions[module][action]`
2. Shows/hides buttons based on permissions
3. Server-side APIs should also verify permissions (defense in depth)

## 📊 Permission Matrix Example

### Role: HR Manager

**Sidebar Menus:**
- ✅ Dashboard
- ✅ Employees
- ✅ Attendance
- ✅ Leave
- ✅ Payroll
- ❌ Projects
- ❌ Reports
- ❌ Roles
- ❌ Security
- ❌ Settings

**Page Access:**
- ✅ employees
- ✅ attendance
- ✅ leave
- ✅ payroll

**Action Permissions:**

| Module    | View | Create | Edit | Delete | Approve | Export |
|-----------|------|--------|------|--------|---------|--------|
| Employees | ✅   | ✅     | ✅   | ❌     | ❌      | ✅     |
| Attendance| ✅   | ✅     | ✅   | ❌     | ✅      | ✅     |
| Leave     | ✅   | ❌     | ❌   | ❌     | ✅      | ✅     |
| Payroll   | ✅   | ✅     | ✅   | ❌     | ✅      | ✅     |

### Role: Employee (Regular)

**Sidebar Menus:**
- ✅ Dashboard
- ✅ Attendance (own)
- ✅ Leave
- ❌ All others

**Page Access:**
- ✅ attendance
- ✅ leave

**Action Permissions:**

| Module    | View | Create | Edit | Delete | Approve | Export |
|-----------|------|--------|------|--------|---------|--------|
| Attendance| ✅   | ✅     | ❌   | ❌     | ❌      | ❌     |
| Leave     | ✅   | ✅     | ✅   | ❌     | ❌      | ❌     |

## 🛡️ Security Best Practices

1. **Defense in Depth**: Always verify permissions on the server side, not just client side
2. **Least Privilege**: Give users only the permissions they need
3. **Regular Audits**: Review role assignments periodically
4. **Admin Separation**: Keep admin credentials separate and secure
5. **Token Expiry**: JWT tokens expire after 7 days, requiring re-login

## 🐛 Troubleshooting

### User can't see expected menus
- Check `sidebarPermissions` in the assigned role
- Verify role is properly assigned in "Assign Users" section
- Ask user to logout and login again

### User can see menu but gets "Access Denied" on page
- Check `pagePermissions` match `sidebarPermissions`
- Ensure page has correct module name in `PermissionGuard`

### User can access page but buttons are hidden
- Check action permissions (view, create, edit, delete)
- Verify component is using correct permission checks

### Admin role not working
- Ensure user's `role` field is set to 'admin' in database
- Admin should bypass all permission checks

## 📝 Available Modules

- `dashboard` - Main dashboard
- `employees` - Employee management
- `departments` - Department management
- `attendance` - Attendance tracking
- `leave` - Leave management
- `payroll` - Payroll processing
- `projects` - Project management
- `reports` - Reports & analytics
- `roles` - Roles & access control
- `communication` - Announcements
- `security` - Security settings
- `settings` - System settings

## 🎓 Example Scenarios

### Scenario 1: Creating a Department Manager Role

```
Role Name: Department Manager
Description: Can manage their department's employees and view reports

Sidebar Menus: Dashboard, Employees, Attendance, Reports
Page Access: employees, attendance, reports
Permissions:
  - Employees: View ✅, Create ✅, Edit ✅, Delete ❌
  - Attendance: View ✅, Create ✅, Edit ✅, Delete ❌, Approve ✅
  - Reports: View ✅, Export ✅
```

### Scenario 2: Creating a Payroll Officer Role

```
Role Name: Payroll Officer
Description: Handles payroll processing and employee salary information

Sidebar Menus: Dashboard, Employees (view only), Payroll
Page Access: employees, payroll
Permissions:
  - Employees: View ✅ (to see salary info)
  - Payroll: View ✅, Create ✅, Edit ✅, Delete ✅, Approve ✅, Export ✅
```

## ✅ Testing Checklist

- [ ] Create a new role with limited permissions
- [ ] Assign the role to a test employee
- [ ] Login as that employee
- [ ] Verify only allowed menus appear in sidebar
- [ ] Try accessing allowed and blocked pages
- [ ] Verify action buttons (Create, Edit, Delete) appear/hide correctly
- [ ] Test Admin account has full access
- [ ] Test role permission updates reflect immediately

## 🔄 Migration & Rollback

If you need to rollback the changes:

```sql
-- Remove new columns
ALTER TABLE "roles" DROP COLUMN IF EXISTS "sidebar_permissions";
ALTER TABLE "roles" DROP COLUMN IF EXISTS "page_permissions";
```

## 📞 Support

For issues or questions:
1. Check this documentation first
2. Review the code comments in key files:
   - `src/app/dashboard/roles/page.tsx` - Role management UI
   - `src/components/auth/PermissionGuard.tsx` - Page protection
   - `src/components/layout/Sidebar.tsx` - Menu filtering
   - `src/app/api/auth/login/route.ts` - Permission loading

---

**Last Updated**: December 2, 2025
**Version**: 2.0
