# Dynamic Permission System - Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Database Migration
- [ ] Backup your current database
- [ ] Run migration: `drizzle/0014_add_menu_page_permissions.sql`
- [ ] Verify new columns exist in `roles` table:
  - [ ] `sidebar_permissions` (jsonb)
  - [ ] `page_permissions` (jsonb)

### 2. Code Verification
- [ ] No TypeScript errors in modified files
- [ ] All imports are resolved
- [ ] Build completes successfully (`npm run build`)

### 3. Environment Check
- [ ] Database connection working
- [ ] JWT_SECRET configured
- [ ] Node version >= 18

## 🧪 Testing Checklist

### Admin Testing
- [ ] Login as Admin
- [ ] Navigate to Roles & Access page
- [ ] Create a new test role:
  - [ ] Set role name and description
  - [ ] Select 2-3 sidebar menus
  - [ ] Select matching page permissions
  - [ ] Set some action permissions (view, create, edit)
  - [ ] Save successfully
- [ ] View the created role
- [ ] Edit the role (modify permissions)
- [ ] Assign test employee to the role
- [ ] Verify employee count updates

### Employee Testing (Test Role)
- [ ] Create test employee account (if needed)
- [ ] Assign test role to employee
- [ ] Logout from Admin
- [ ] Login as test employee
- [ ] Verify:
  - [ ] Only allowed menus appear in sidebar
  - [ ] Clicking allowed menu opens page successfully
  - [ ] Trying to manually navigate to blocked page redirects
  - [ ] Action buttons (Create, Edit, Delete) show/hide correctly
  - [ ] Dashboard is always accessible

### Admin Re-verification
- [ ] Logout from test employee
- [ ] Login as Admin
- [ ] Verify admin sees ALL menus
- [ ] Verify admin can access ALL pages
- [ ] Verify admin has ALL action buttons

## 📋 Feature Testing Matrix

| Feature | Admin | Test Role | Expected Result |
|---------|-------|-----------|-----------------|
| See Dashboard menu | ✅ | ✅ | Both see it |
| See Employees menu | ✅ | ? | Based on role |
| Access /dashboard/employees | ✅ | ? | Based on role |
| Create Employee button | ✅ | ? | Based on permission |
| Edit Employee button | ✅ | ? | Based on permission |
| Delete Employee button | ✅ | ? | Based on permission |
| See Settings menu | ✅ | ❌ | Only admin |
| Access /dashboard/settings | ✅ | ❌ | Blocked for employee |

## 🔧 Configuration Checklist

### Roles Page
- [ ] Tab navigation works smoothly
- [ ] Checkbox selections save correctly
- [ ] "Select All" buttons work
- [ ] Permission counts show in tabs
- [ ] Visual feedback for selected items

### Sidebar
- [ ] Filters menus based on sidebarPermissions
- [ ] Dashboard always visible
- [ ] Admin sees all menus
- [ ] Badges display correctly

### Permission Guard
- [ ] Page-level blocking works
- [ ] Redirects to correct fallback URL
- [ ] Loading state displays
- [ ] No flash of unauthorized content

### API Endpoints
- [ ] GET /api/admin/roles returns sidebar/page permissions
- [ ] POST /api/admin/roles saves new permissions
- [ ] PUT /api/admin/roles/[id] updates permissions
- [ ] GET /api/auth/me returns user permissions
- [ ] Login returns JWT with all permissions

## 📊 Sample Test Scenarios

### Scenario 1: HR Manager Role
```
Create Role: "HR Manager"
Sidebar: Dashboard, Employees, Attendance, Leave, Payroll
Pages: employees, attendance, leave, payroll
Permissions:
  Employees: view ✅, create ✅, edit ✅, delete ❌
  Attendance: view ✅, approve ✅
  Leave: view ✅, approve ✅
  Payroll: view ✅, create ✅, edit ✅

Expected Result:
- Sees 5 menus in sidebar
- Can access those 4 pages
- Has Add/Edit buttons on Employees
- No Delete button on Employees
```

### Scenario 2: Team Lead Role
```
Create Role: "Team Lead"
Sidebar: Dashboard, Employees, Attendance, Projects
Pages: employees, attendance, projects
Permissions:
  Employees: view ✅, edit ✅
  Attendance: view ✅, approve ✅
  Projects: view ✅, create ✅, edit ✅

Expected Result:
- Sees 4 menus in sidebar
- Can access those 3 pages
- Can view and edit employees
- Can approve attendance
- Can manage projects
```

### Scenario 3: Regular Employee Role
```
Create Role: "Employee"
Sidebar: Dashboard, Attendance, Leave
Pages: attendance, leave
Permissions:
  Attendance: view ✅, create ✅
  Leave: view ✅, create ✅, edit ✅

Expected Result:
- Sees only 3 menus
- Can check-in/out
- Can request leave
- Cannot access other modules
```

## 🐛 Common Issues to Check

### Issue 1: Menus Not Showing
- [ ] Check sidebarPermissions in role
- [ ] Verify user is assigned to role
- [ ] Check JWT token includes sidebarPermissions
- [ ] User logged out and back in

### Issue 2: Access Denied Error
- [ ] Check pagePermissions match sidebarPermissions
- [ ] Verify PermissionGuard module name matches
- [ ] Check user.pagePermissions array

### Issue 3: Buttons Not Appearing
- [ ] Check action permissions (view, create, edit, delete)
- [ ] Verify hasPermission() checks
- [ ] Confirm user.permissions object structure

### Issue 4: Admin Can't Access Everything
- [ ] Verify user.role === 'admin'
- [ ] Check admin bypass logic in components
- [ ] Ensure no incorrect permission checks

## 📝 Documentation Review
- [ ] Read DYNAMIC_PERMISSIONS_GUIDE.md
- [ ] Read PERMISSIONS_QUICK_START_TAMIL.md
- [ ] Read IMPLEMENTATION_SUMMARY.md
- [ ] Read PERMISSION_ARCHITECTURE.md
- [ ] Understand the three-tier system

## 🚀 Go-Live Checklist

### Pre-Production
- [ ] All tests passed
- [ ] No console errors
- [ ] Database migration successful
- [ ] Backup created
- [ ] Rollback plan ready

### Production Deployment
- [ ] Run database migration on production
- [ ] Deploy code changes
- [ ] Verify admin login
- [ ] Test one role assignment
- [ ] Monitor error logs

### Post-Deployment
- [ ] Verify existing users can login
- [ ] Check admin has full access
- [ ] Test role creation in production
- [ ] Monitor for 24 hours
- [ ] Gather user feedback

## 📞 Rollback Plan

If issues occur:

1. **Code Rollback**:
   ```bash
   git revert <commit-hash>
   npm run build
   # Redeploy
   ```

2. **Database Rollback**:
   ```sql
   ALTER TABLE "roles" DROP COLUMN IF EXISTS "sidebar_permissions";
   ALTER TABLE "roles" DROP COLUMN IF EXISTS "page_permissions";
   ```

3. **Restore Previous Version**:
   - Restore from backup
   - Verify all services running
   - Test critical paths

## ✅ Sign-Off

- [ ] Developer tested: _________________ Date: _______
- [ ] QA verified: _________________ Date: _______
- [ ] Admin approved: _________________ Date: _______
- [ ] Production deployed: _________________ Date: _______

## 📈 Success Metrics

Monitor these after deployment:
- [ ] Number of roles created
- [ ] Number of users assigned to roles
- [ ] Login success rate
- [ ] Permission-related errors (should be 0)
- [ ] User feedback positive

---

**Deployment Date**: __________________
**Deployed By**: __________________
**Status**: ⬜ Pending | ⬜ In Progress | ⬜ Complete
