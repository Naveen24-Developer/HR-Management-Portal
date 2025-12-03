# RBAC Implementation Guide - HRMS Portal

## Overview
This document describes the Role-Based Access Control (RBAC) system implemented in the HRMS Portal. The system ensures that:
- All users (Admin, Employees, HR, Managers, etc.) log in and are redirected to `/dashboard`
- Navigation menus and pages are dynamically shown based on user role and permissions
- Old `/admin` routes are automatically redirected to `/dashboard` routes

## Architecture Changes

### 1. Route Structure
**Before:**
```
/admin/dashboard
/admin/employees
/admin/attendance
... (all pages under /admin)
```

**After:**
```
/dashboard (home for all users)
/dashboard/employees
/dashboard/attendance
/dashboard/leave
/dashboard/payroll
/dashboard/projects
/dashboard/reports
/dashboard/roles
/dashboard/communication
/dashboard/security
/dashboard/settings
```

### 2. Key Components

#### Layout (`/app/dashboard/layout.tsx`)
- Unified layout for all user roles
- Shows role-based title in header
- Displays user role badge in sidebar
- Common navigation structure

#### Sidebar (`/components/layout/Sidebar.tsx`)
- Updated navigation items with `/dashboard` paths
- Filters menu items based on user permissions
- Dashboard always visible; other modules require permissions
- Admin users see all menu items

#### Middleware (`/middleware.ts`)
- Redirects `/` to `/dashboard`
- Redirects old `/admin/*` routes to `/dashboard/*`
- No role-based blocking (handled at page level)

#### Permission Guard (`/components/auth/PermissionGuard.tsx`)
- HOC to wrap pages requiring specific permissions
- Checks user authentication and authorization
- Redirects unauthorized users to `/unauthorized`
- Shows loading state during auth check

### 3. Permission System

#### Permission Structure
```typescript
{
  "employees": {
    "view": true,
    "create": true,
    "edit": true,
    "delete": false
  },
  "attendance": {
    "view": true,
    "create": true
  },
  "payroll": {
    "view": false
  }
}
```

#### Permission Utilities (`/lib/auth/permissions.ts`)
- `hasPermission(permissions, module, action)` - Check specific permission
- `hasModuleAccess(permissions, module)` - Check if user has any permission in module
- `canPerformAction(role, permissions, module, action)` - Server-side check with admin bypass

## Implementation Steps

### Step 1: Protect Individual Pages

To protect a page with permission checks, wrap the content with `PermissionGuard`:

```tsx
// Example: /app/dashboard/employees/page.tsx
'use client';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

export default function EmployeesPage() {
  return (
    <PermissionGuard module="employees" action="view">
      {/* Your page content */}
      <div>
        <h1>Employee Management</h1>
        {/* ... rest of content */}
      </div>
    </PermissionGuard>
  );
}
```

#### PermissionGuard Props:
- `module` (required): Module name (e.g., 'employees', 'attendance', 'payroll')
- `action` (optional): Specific action (default: 'view')
- `requireAdmin` (optional): Require admin role (default: false)
- `fallbackUrl` (optional): Redirect URL for unauthorized (default: '/unauthorized')

### Step 2: Create Roles and Assign Permissions

**Admin creates roles in `/dashboard/roles`:**

```json
{
  "name": "HR Manager",
  "description": "Human Resources Manager",
  "permissions": {
    "employees": {
      "view": true,
      "create": true,
      "edit": true,
      "delete": false
    },
    "attendance": {
      "view": true,
      "create": true,
      "edit": true
    },
    "leave": {
      "view": true,
      "approve": true
    },
    "departments": {
      "view": true
    }
  }
}
```

### Step 3: Assign Roles to Users

Admin navigates to `/dashboard/roles` → Select role → "Assign to Users"

The system will:
1. Store role assignment in `user_roles` table
2. Include permissions in JWT token
3. Load permissions in `AuthContext`
4. Filter sidebar navigation automatically
5. Protect pages via `PermissionGuard`

### Step 4: Login Flow

**1. User logs in (`/login`)**
```typescript
POST /api/auth/login
{
  "username": "user@company.com",
  "password": "password123"
}
```

**2. Server responds with token and user data:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@company.com",
    "role": "employee",
    "roleId": "uuid",
    "roleName": "HR Manager",
    "permissions": {
      "employees": { "view": true, "create": true },
      "attendance": { "view": true }
    }
  }
}
```

**3. Client redirects to `/dashboard`:**
```typescript
// LoginForm.tsx
router.push('/dashboard');
```

**4. Dashboard layout loads:**
- Checks authentication
- Loads permissions
- Filters sidebar based on permissions
- Shows only allowed pages

## User Experience by Role

### Admin
- **Login** → `/dashboard`
- **Sees:** All menu items
- **Access:** Full access to everything
- **Role Badge:** "HRMS Admin"

### HR Manager (Example Custom Role)
- **Login** → `/dashboard`
- **Sees:** Employees, Attendance, Leave, Departments
- **Hidden:** Payroll, Projects, Security, System Settings
- **Role Badge:** "HRMS - HR Manager"

### Employee (Basic Role)
- **Login** → `/dashboard`
- **Sees:** Dashboard, Attendance (own), Leave (own)
- **Hidden:** All admin/management features
- **Role Badge:** "HRMS - Employee"

## Database Schema

### Key Tables

#### `roles`
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  users_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `user_roles`
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW()
);
```

## Security Considerations

### 1. JWT Token Includes Permissions
- Permissions are embedded in JWT
- Token is validated on each API request
- Token expires after 7 days

### 2. Server-Side Validation
All API endpoints should validate permissions:

```typescript
// Example API route
import { canPerformAction } from '@/lib/auth/permissions';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const decoded = verifyToken(token);
  
  if (!canPerformAction(decoded.role, decoded.permissions, 'employees', 'create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Proceed with action...
}
```

### 3. Client-Side Protection
- Pages use `PermissionGuard`
- Sidebar filters menu items
- Buttons/actions check permissions before rendering

### 4. Admin Bypass
- Admin role (`role === 'admin'`) bypasses all permission checks
- Admin sees all menu items
- Admin has full API access

## Migration from Old System

### Automatic Redirects
Old routes automatically redirect:
- `/admin/employees` → `/dashboard/employees`
- `/admin/attendance` → `/dashboard/attendance`
- etc.

### Backward Compatibility
- Old admin layout still exists at `/app/admin/layout.tsx`
- Old pages still exist in `/app/admin/*`
- Middleware handles redirects transparently

## Common Tasks

### Creating a New Protected Page

1. Create page under `/app/dashboard/[module]/page.tsx`
2. Wrap content with `PermissionGuard`:
```tsx
export default function MyPage() {
  return (
    <PermissionGuard module="mymodule" action="view">
      {/* content */}
    </PermissionGuard>
  );
}
```

3. Add navigation item to `/components/layout/Sidebar.tsx`:
```typescript
{
  name: 'My Module',
  href: '/dashboard/mymodule',
  icon: MyIcon,
  module: 'mymodule',
  description: 'Description',
}
```

### Adding Permission Checks to Buttons

```tsx
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/auth/permissions';

function MyComponent() {
  const { user } = useAuth();
  
  const canCreate = user?.role === 'admin' || 
                    hasPermission(user?.permissions, 'employees', 'create');
  
  return (
    <>
      {canCreate && (
        <button onClick={handleCreate}>Create Employee</button>
      )}
    </>
  );
}
```

## Testing the System

### Test User Roles

1. **Admin Login:**
   - Username: `Admin`
   - Password: `Admin123`
   - Should see all menu items

2. **Create Test Role:**
   - Login as admin
   - Go to `/dashboard/roles`
   - Create role with limited permissions
   - Assign to a test user

3. **Test Employee Login:**
   - Login as employee
   - Should only see permitted pages
   - Attempting to access forbidden pages → `/unauthorized`

## Troubleshooting

### Issue: User sees all menu items
**Solution:** Check that permissions are loaded in `AuthContext`
```typescript
console.log(user?.permissions);
```

### Issue: Page shows then redirects
**Solution:** `PermissionGuard` is working. User lacks permission.

### Issue: API returns 403
**Solution:** Check server-side permission validation in API route.

### Issue: Login redirects to `/admin/dashboard`
**Solution:** Check `LoginForm.tsx` - should redirect to `/dashboard`

## Next Steps

1. ✅ Run the application: `npm run dev`
2. ✅ Test admin login
3. ✅ Create custom roles in `/dashboard/roles`
4. ✅ Assign roles to employees
5. ✅ Test employee login with limited permissions
6. ✅ Verify dynamic menu filtering
7. ✅ Test page protection

## Additional Resources

- Auth Context: `/src/contexts/AuthContext.tsx`
- Permission Utils: `/src/lib/auth/permissions.ts`
- Middleware: `/src/middleware.ts`
- Login API: `/src/app/api/auth/login/route.ts`
- Role API: `/src/app/api/admin/roles/route.ts`

---

**Implementation Date:** December 1, 2025
**Version:** 1.0
**Status:** ✅ Complete
