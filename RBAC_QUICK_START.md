# RBAC System - Quick Start Guide

## ✅ What Has Been Implemented

### 1. **Unified Dashboard Route** (`/dashboard`)
   - All users (Admin, HR, Employees, Managers) now login and go to `/dashboard`
   - Old `/admin` routes automatically redirect to `/dashboard` routes
   - No more separate admin vs employee portals

### 2. **Dynamic Navigation** (Role-Based Sidebar)
   - Sidebar automatically filters menu items based on user permissions
   - Admin sees everything
   - Other roles see only what they have permission for
   - Located in: `src/components/layout/Sidebar.tsx`

### 3. **Permission Guard Component**
   - HOC to protect pages: `src/components/auth/PermissionGuard.tsx`
   - Automatically redirects unauthorized users
   - Shows loading state during auth check

### 4. **Updated Middleware**
   - Redirects `/` → `/dashboard`
   - Redirects `/admin/*` → `/dashboard/*`
   - Located in: `src/middleware.ts`

### 5. **New Dashboard Layout**
   - Universal layout for all user types
   - Shows role-specific branding
   - Located in: `src/app/dashboard/layout.tsx`

## 🚀 How to Use

### For Admin (First Time Setup)

1. **Login as Admin:**
   ```
   Username: Admin
   Password: Admin123
   ```
   You'll be redirected to `/dashboard`

2. **Create Roles:**
   - Navigate to `/dashboard/roles`
   - Click "Create Role"
   - Set permissions for each module:
     ```json
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
       "leave": {
         "view": true,
         "approve": true
       }
     }
     ```

3. **Create Employees:**
   - Go to `/dashboard/employees`
   - Add employee with email and password

4. **Assign Roles:**
   - Go to `/dashboard/roles`
   - Select a role
   - Click "Assign to Users"
   - Select employees to assign

### For Developers (Adding Protected Pages)

**Option 1: Simple Wrapper (Recommended)**
```tsx
// app/dashboard/mypage/page.tsx
'use client';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

export default function MyPage() {
  return (
    <PermissionGuard module="mymodule" action="view">
      <MyPageContent />
    </PermissionGuard>
  );
}

function MyPageContent() {
  // Your page logic and content
  return <div>Protected Content</div>;
}
```

**Option 2: Add to Sidebar Navigation**
```tsx
// src/components/layout/Sidebar.tsx
{
  name: 'My Module',
  href: '/dashboard/mymodule',
  icon: MyIcon,
  module: 'mymodule',
  description: 'Module description',
}
```

### For API Routes (Backend Protection)

```typescript
// app/api/myroute/route.ts
import { canPerformAction } from '@/lib/auth/permissions';
import { verifyToken } from '@/lib/auth/utils';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const decoded = verifyToken(token);
  
  if (!canPerformAction(decoded.role, decoded.permissions, 'mymodule', 'create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Your API logic
}
```

## 📋 Current File Structure

```
src/
├── app/
│   ├── dashboard/           ← NEW: Main dashboard for all users
│   │   ├── layout.tsx       ← Universal layout
│   │   ├── page.tsx         ← Dashboard home
│   │   ├── employees/
│   │   ├── attendance/
│   │   ├── leave/
│   │   ├── payroll/
│   │   ├── projects/
│   │   ├── reports/
│   │   ├── roles/
│   │   ├── communication/
│   │   ├── security/
│   │   └── settings/
│   ├── admin/              ← OLD: Still exists but redirects
│   └── (auth)/
│       └── login/
├── components/
│   ├── auth/
│   │   ├── PermissionGuard.tsx  ← NEW: Page protection
│   │   └── LoginForm.tsx
│   └── layout/
│       └── Sidebar.tsx          ← UPDATED: Dynamic navigation
├── contexts/
│   └── AuthContext.tsx          ← Provides user & permissions
├── lib/
│   └── auth/
│       └── permissions.ts       ← Permission utilities
└── middleware.ts                ← UPDATED: Route redirects
```

## 🎯 Key Concepts

### Permission Structure
```typescript
{
  "module_name": {
    "view": boolean,
    "create": boolean,
    "edit": boolean,
    "delete": boolean,
    "approve": boolean,
    "export": boolean
  }
}
```

### Available Modules
- `dashboard` - Main dashboard (always visible)
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

### User Roles in Database
- `admin` - Full access (bypasses all permission checks)
- `employee` - Basic user (needs role assignment)
- Custom roles created via `/dashboard/roles`

## 🔍 Testing Checklist

- [ ] Admin login redirects to `/dashboard`
- [ ] Admin sees all menu items
- [ ] Create a custom role with limited permissions
- [ ] Assign role to an employee
- [ ] Employee login redirects to `/dashboard`
- [ ] Employee sees only permitted menu items
- [ ] Employee cannot access forbidden pages
- [ ] Old `/admin/*` URLs redirect to `/dashboard/*`

## ⚡ Quick Commands

```bash
# Run development server
npm run dev

# Check for TypeScript errors
npm run typecheck

# Build for production
npm run build
```

## 📞 Common Issues

### Issue: "All menu items showing for employees"
**Fix:** Check permissions are loaded in AuthContext
```typescript
console.log(user?.permissions);
```

### Issue: "Page briefly shows then redirects"
**Fix:** This is normal - PermissionGuard checking permissions

### Issue: "Cannot access /dashboard"
**Fix:** Check middleware.ts and ensure '/dashboard' is in matcher

### Issue: "Old /admin routes not redirecting"
**Fix:** Clear browser cache and restart dev server

## 📚 Documentation Files

- `RBAC_IMPLEMENTATION_GUIDE.md` - Complete technical documentation
- `PERMISSION_GUARD_EXAMPLE.tsx` - Code example for protecting pages
- This file - Quick start guide

## ✨ What's Next?

1. Test the admin flow
2. Create your first custom role
3. Assign roles to employees
4. Test employee login
5. Add PermissionGuard to existing pages
6. Customize permissions per your needs

---

**Ready to go!** Start with `npm run dev` and login with Admin/Admin123
