# 🎯 RBAC Implementation - Testing Checklist

## Pre-Testing Setup
- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Run `npm run dev` to start development server
- [ ] Verify server starts without errors on `http://localhost:3000`

## Phase 1: Admin Login & Dashboard Access

### Admin Login Test
- [ ] Navigate to `http://localhost:3000`
- [ ] Should redirect to `/login`
- [ ] Enter credentials:
  - Username: `Admin`
  - Password: `Admin123`
- [ ] Click "Login"
- [ ] Should redirect to `/dashboard` (NOT `/admin/dashboard`)
- [ ] Dashboard should load successfully
- [ ] Check browser URL is `/dashboard`

### Admin Navigation Test
- [ ] Verify sidebar shows all menu items:
  - [ ] Dashboard
  - [ ] Employee Management
  - [ ] Departments
  - [ ] Attendance
  - [ ] Leave Management
  - [ ] Payroll
  - [ ] Projects
  - [ ] Reports & Analytics
  - [ ] Roles & Access
  - [ ] Communication
  - [ ] Security
  - [ ] System Settings

### Admin Access Test
- [ ] Click each menu item and verify page loads
- [ ] Check each URL uses `/dashboard/` prefix (not `/admin/`)
- [ ] No "Unauthorized" or permission errors
- [ ] All features accessible

## Phase 2: Role Creation

### Create HR Manager Role
- [ ] Navigate to `/dashboard/roles`
- [ ] Click "Create Role" button
- [ ] Fill in:
  - Name: `HR Manager`
  - Description: `Human Resources Manager`
- [ ] Set permissions:
  - [ ] Employees: view ✓, create ✓, edit ✓
  - [ ] Attendance: view ✓, create ✓
  - [ ] Leave: view ✓, approve ✓
  - [ ] Departments: view ✓
- [ ] Click "Save"
- [ ] Verify role appears in roles list

### Create Accountant Role
- [ ] Create another role: `Accountant`
- [ ] Set permissions:
  - [ ] Payroll: view ✓, create ✓, approve ✓, export ✓
  - [ ] Reports: view ✓, export ✓
  - [ ] Employees: view ✓
- [ ] Save and verify

## Phase 3: Employee Creation

### Create Test Employee 1 (HR)
- [ ] Navigate to `/dashboard/employees`
- [ ] Click "Add Employee"
- [ ] Fill in employee details:
  - First Name: `John`
  - Last Name: `Doe`
  - Email: `john.doe@company.com`
  - Password: `password123`
  - Department: Select any
  - Position: `HR Manager`
- [ ] Save employee
- [ ] Verify employee appears in list

### Create Test Employee 2 (Accountant)
- [ ] Add another employee:
  - First Name: `Jane`
  - Last Name: `Smith`
  - Email: `jane.smith@company.com`
  - Password: `password123`
  - Position: `Accountant`
- [ ] Save and verify

## Phase 4: Role Assignment

### Assign HR Manager Role
- [ ] Go to `/dashboard/roles`
- [ ] Find "HR Manager" role
- [ ] Click "Assign to Users" or similar action
- [ ] Select `John Doe (john.doe@company.com)`
- [ ] Confirm assignment
- [ ] Verify assignment successful

### Assign Accountant Role
- [ ] Assign "Accountant" role to `Jane Smith`
- [ ] Confirm assignment
- [ ] Verify assignment

## Phase 5: HR Employee Login Test

### Login as HR Manager
- [ ] Logout from admin account
- [ ] Login with:
  - Username: `john.doe@company.com`
  - Password: `password123`
- [ ] Should redirect to `/dashboard`
- [ ] Dashboard should load

### Verify HR Manager Permissions
- [ ] Check sidebar shows ONLY:
  - [ ] Dashboard ✓
  - [ ] Employee Management ✓
  - [ ] Attendance ✓
  - [ ] Leave Management ✓
  - [ ] Departments ✓
- [ ] Verify sidebar does NOT show:
  - [ ] Payroll ✗
  - [ ] Projects ✗
  - [ ] Reports ✗
  - [ ] Roles & Access ✗
  - [ ] Security ✗
  - [ ] System Settings ✗

### Test HR Access
- [ ] Click "Employee Management" - should work
- [ ] Click "Attendance" - should work
- [ ] Click "Leave Management" - should work
- [ ] Manually type `/dashboard/payroll` in URL
  - [ ] Should redirect to `/unauthorized`
- [ ] Manually type `/dashboard/security` in URL
  - [ ] Should redirect to `/unauthorized`

## Phase 6: Accountant Login Test

### Login as Accountant
- [ ] Logout from HR account
- [ ] Login with:
  - Username: `jane.smith@company.com`
  - Password: `password123`
- [ ] Should redirect to `/dashboard`

### Verify Accountant Permissions
- [ ] Check sidebar shows ONLY:
  - [ ] Dashboard ✓
  - [ ] Payroll ✓
  - [ ] Reports ✓
  - [ ] Employees ✓ (view only)
- [ ] Verify sidebar does NOT show other modules

### Test Accountant Access
- [ ] Click "Payroll" - should work
- [ ] Click "Reports" - should work
- [ ] Try to access `/dashboard/attendance`
  - [ ] Should redirect to `/unauthorized`
- [ ] Try to access `/dashboard/roles`
  - [ ] Should redirect to `/unauthorized`

## Phase 7: Old Route Redirects

### Test Old Admin Routes
- [ ] Logout and login as admin again
- [ ] Manually navigate to old routes and verify redirects:
  - [ ] `/admin` → should redirect to `/dashboard`
  - [ ] `/admin/dashboard` → `/dashboard`
  - [ ] `/admin/employees` → `/dashboard/employees`
  - [ ] `/admin/attendance` → `/dashboard/attendance`
  - [ ] `/admin/payroll` → `/dashboard/payroll`

## Phase 8: Permission-Based Features

### Test Create/Edit Buttons (HR Manager)
- [ ] Login as HR Manager
- [ ] Go to Employee Management
- [ ] Verify "Add Employee" button is visible (has create permission)
- [ ] Verify "Edit" buttons are visible (has edit permission)
- [ ] Verify you can create a new employee

### Test Approval Features
- [ ] Go to Leave Management
- [ ] Verify you can see "Approve" button (has approve permission)
- [ ] Test approving a leave request

## Phase 9: Edge Cases

### No Role Assigned
- [ ] Create an employee without assigning a role
- [ ] Login as that employee
- [ ] Should see ONLY Dashboard (no other menu items)
- [ ] Attempting to access other pages should redirect to `/unauthorized`

### Multiple Role Assignments (if supported)
- [ ] Try assigning multiple roles to one employee
- [ ] Verify permissions are merged correctly

### Role Update
- [ ] Login as admin
- [ ] Edit HR Manager role permissions
- [ ] Remove "Attendance" view permission
- [ ] Save changes
- [ ] Login as HR Manager
- [ ] Verify "Attendance" no longer appears in sidebar

## Phase 10: Security Checks

### Token Expiration
- [ ] Check that auth token is stored in HTTP-only cookie
- [ ] Verify token contains role and permissions
- [ ] Check token expires after 7 days (or configured time)

### API Route Protection
- [ ] Open browser DevTools → Network tab
- [ ] Try to call protected API endpoints directly
- [ ] Verify endpoints return 401/403 for unauthorized access

### Direct URL Access
- [ ] As employee, try accessing admin-only pages directly
- [ ] Should redirect or show unauthorized
- [ ] No sensitive data should leak

## Phase 11: UI/UX Checks

### Sidebar Display
- [ ] Verify sidebar shows user name
- [ ] Verify sidebar shows user role badge
- [ ] Check role-specific header title
  - Admin: "HRMS Admin"
  - Others: "HRMS - [Role Name]"

### Profile Dropdown
- [ ] Click profile dropdown in header
- [ ] Verify shows user name, email, role
- [ ] Test "Logout" button works

### Responsive Design
- [ ] Test on mobile viewport
- [ ] Verify mobile sidebar works
- [ ] Check navigation is accessible

## Phase 12: Performance & Errors

### Check Console
- [ ] Open browser DevTools → Console
- [ ] Should be no errors during navigation
- [ ] Permission checks should be silent

### Loading States
- [ ] Verify loading spinner shows during auth check
- [ ] Pages don't flash unauthorized content before redirect
- [ ] Smooth transitions between pages

### Error Handling
- [ ] Try logging in with wrong password
- [ ] Verify error message displays
- [ ] Try accessing non-existent page
- [ ] Verify 404 handling works

## ✅ Final Verification

- [ ] All admin features work as before
- [ ] Employees see filtered navigation
- [ ] Permission system works correctly
- [ ] No TypeScript errors in critical files
- [ ] All routes redirect properly
- [ ] Documentation is accessible and clear

## 📊 Test Results Summary

| Test Phase | Pass | Fail | Notes |
|------------|------|------|-------|
| Admin Login |  |  |  |
| Admin Navigation |  |  |  |
| Role Creation |  |  |  |
| Employee Creation |  |  |  |
| Role Assignment |  |  |  |
| HR Login & Access |  |  |  |
| Accountant Login |  |  |  |
| Route Redirects |  |  |  |
| Permission Features |  |  |  |
| Edge Cases |  |  |  |
| Security |  |  |  |
| UI/UX |  |  |  |

## 🐛 Issues Found

Use this space to note any issues encountered:

1. 
2. 
3. 

## ✨ Recommendations

After testing, consider:
- [ ] Add more granular permissions if needed
- [ ] Create additional default roles
- [ ] Add permission audit logging
- [ ] Implement permission caching
- [ ] Add bulk role assignment
- [ ] Create role templates

---

**Testing Date:** _______________
**Tester:** _______________
**Status:** ⬜ Pass | ⬜ Fail | ⬜ Needs Review

