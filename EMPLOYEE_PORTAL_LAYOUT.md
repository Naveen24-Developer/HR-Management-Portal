# Employee Portal Layout Implementation

## Overview
This document describes the employee portal layout and role-based routing system for the HRM Portal. The layout supports multiple user roles (Employee, Manager, HR, Admin) with appropriate navigation and functionality for each role.

## Implementation Details

### 1. Layout Structure (`src/app/(app)/layout.tsx`)

The layout component provides a responsive dashboard interface with:

#### Role-Based Navigation
- **Employee**: Access to personal dashboard, attendance, leave requests, payroll, reports, profile, security, and settings
- **Manager**: Extended employee features plus team management (team members, leave approvals, team attendance)
- **HR**: Full access including employee management, all attendance tracking, leave management, payroll, and HR-specific settings
- **Admin**: Redirected to the separate admin portal (`/admin/dashboard`)

#### Key Features
1. **Responsive Design**
   - Desktop sidebar (fixed, 64px width)
   - Mobile-friendly hamburger menu
   - Sticky header with breadcrumb navigation
   - Adaptive layout for lg breakpoint (1024px+)

2. **Navigation System**
   - Dynamic navigation based on user role
   - Active route highlighting
   - Descriptive item tooltips
   - Mobile sidebar closes on navigation

3. **User Profile Section**
   - Shows user name and role
   - Avatar with initials
   - Quick access to profile, settings, security
   - Logout functionality

4. **Top Header**
   - Notifications bell icon
   - User profile dropdown
   - Breadcrumb showing current section
   - Mobile menu toggle

### 2. Login Form Update (`src/components/auth/LoginForm.tsx`)

**Before:**
```typescript
if (data.user?.role === 'admin') {
  router.push('/admin/dashboard');
} else {
  // Redirect other roles appropriately
  router.push('./(app)/dashboard'); 
}
```

**After:**
```typescript
const userRole = data.user?.role || data.user?.user_type || 'employee';

if (userRole === 'admin') {
  router.push('/admin/dashboard');
} else {
  // Redirect employees, managers, and HR users to the employee portal
  router.push('/(app)/dashboard');
}
```

### 3. Role Extraction

The layout determines user role from `user.user_metadata`:
```typescript
const userRole = (user?.user_metadata?.role || user?.user_metadata?.user_type || 'employee') as string;
```

This supports multiple metadata fields:
- `user.user_metadata.role`
- `user.user_metadata.user_type`
- Defaults to `'employee'`

### 4. Navigation Menus

#### Employee Navigation
```
- Dashboard
- Attendance
- Leave Management
- Payroll
- Reports
- Profile
- Security
- Settings
```

#### Manager Navigation
```
- Dashboard
- Team Members
- Attendance
- Leave Approvals
- Payroll
- Reports
- Profile
- Security
```

#### HR Navigation
```
- Dashboard
- Employees
- Attendance
- Leave Management
- Payroll
- Reports
- Settings
- Security
```

## Routing Flow

```
User Login
    ↓
Check User Role
    ↓
    ├─→ Admin? → /admin/dashboard
    ├─→ Employee? → /(app)/dashboard
    ├─→ Manager? → /(app)/dashboard
    └─→ HR? → /(app)/dashboard
```

## Authentication Checks

1. **Client-side Authentication Check**
   ```typescript
   if (isClient && !user) {
     router.push('/(auth)/login');
     return null;
   }
   ```

2. **Admin Redirection Check**
   ```typescript
   if (isClient && user && userRole === 'admin') {
     router.push('/admin/dashboard');
     return null;
   }
   ```

## Responsive Breakpoints

- **Mobile** (< 1024px): Hamburger menu, stacked layout
- **Desktop** (≥ 1024px): Fixed sidebar, full navigation visible

## User Metadata Fields Used

- `firstName`: User's first name
- `lastName`: User's last name
- `role`: User's role (admin, manager, hr, employee)
- `user_type`: Alternative role field

## Styling

- Uses Tailwind CSS for styling
- Indigo color scheme (indigo-600 primary)
- Gray neutral colors (gray-100 to gray-900)
- Smooth transitions and hover effects
- Mobile-first responsive design

## Future Enhancements

1. Add permission-based feature access
2. Implement nested navigation for complex sections
3. Add user preferences for sidebar collapse
4. Implement role-based data filtering
5. Add custom role support

## Files Modified

1. `src/app/(app)/layout.tsx` - Complete redesign for employee portal
2. `src/components/auth/LoginForm.tsx` - Updated redirect logic

## Testing Checklist

- [ ] Admin users redirect to admin portal
- [ ] Employee users can access employee portal
- [ ] Manager navigation includes team management
- [ ] HR navigation includes full management features
- [ ] Mobile sidebar opens/closes correctly
- [ ] Profile dropdown displays correct user info
- [ ] Logout functionality works
- [ ] Active route highlighting works
- [ ] Breadcrumb updates with navigation
- [ ] All links are properly formatted
