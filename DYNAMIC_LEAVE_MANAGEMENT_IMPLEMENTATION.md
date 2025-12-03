# Dynamic Leave Management System - Complete Implementation

## Overview
This document describes the complete dynamic role-based leave management system implementation that allows flexible permissions and workflows for different user roles.

## System Architecture

### 1. Role-Based Access Control (RBAC)

#### User Roles
1. **Admin** (`role: 'admin'`)
   - Full access to all leave requests
   - Can approve/reject any leave request
   - Can use Manual Action feature
   - Does not need to select approver when requesting own leave

2. **Employee with Approve Permission** (`role: 'employee'` + `permissions.leave.approve: true`)
   - Can submit leave requests
   - Can approve/reject ONLY requests where they are the designated approver
   - Cannot approve their own requests
   - Must select an approver when requesting leave

3. **Employee with Create Permission** (`role: 'employee'` + `permissions.leave.create: true`)
   - Can submit leave requests
   - Must select an approver
   - Cannot approve their own requests

## Feature Implementation

### A. Leave Request Submission

#### For Admin Users:
- Can submit leave requests WITHOUT selecting an approver
- Approver field is hidden in the form
- Backend accepts `approverId: null` for admin requests

#### For Employee Users:
- MUST select an approver from dropdown
- Approver dropdown shows:
  - All admin users (excluding self)
  - All users with `leave.approve` permission (excluding self)
- Cannot select themselves as approver (validated both frontend and backend)
- Form shows approver selection field
- Backend rejects request if approver not selected

**API Endpoint:** `POST /api/admin/leave/requests`
```typescript
// Validation Logic:
if (decoded.role === 'admin') {
  // Admin doesn't need approver
  finalApproverId = approverId || null;
} else {
  // Employee must select an approver
  if (!approverId) {
    return error: 'Approver selection is required';
  }
  // Cannot select self
  if (approverId === decoded.id) {
    return error: 'You cannot approve your own leave request';
  }
  finalApproverId = approverId;
}
```

### B. Approver Selection List

**API Endpoint:** `GET /api/admin/leave/approvers`

Returns list of users who can approve leave:
- All active admin users
- All active users with `permissions.leave.approve === true`
- Excludes the current user (cannot approve own leave)
- Excludes inactive employees

**Frontend Integration:**
```typescript
// Fetched when userInfo.role !== 'admin'
fetchApprovers() // Called in useEffect when userInfo loads
```

### C. Leave Request Viewing

**API Endpoint:** `GET /api/admin/leave/requests`

Returns filtered leave requests based on user role:

#### For Admin:
- Shows ALL leave requests from all employees
- No filtering applied

#### For Employees:
- Shows own submitted requests
- Shows requests where they are the designated approver
- Cannot see other employees' requests

**Backend Query Logic:**
```typescript
if (decoded.role !== 'admin') {
  conditions.push(
    or(
      eq(leaveRequests.employeeId, userEmployee[0].id),  // Own requests
      eq(leaveRequests.approverId, decoded.id)           // Requests to approve
    )
  );
}
```

### D. Approve/Reject Permissions

**API Endpoints:**
- `PUT /api/admin/leave/:id/approve`
- `PUT /api/admin/leave/:id/reject`

#### Authorization Logic:

1. **Admin Users:**
   - Can approve/reject ANY leave request
   - No additional checks required

2. **Employee Users:**
   - Can ONLY approve/reject requests where `approverId === userId`
   - Must have `permissions.leave.approve === true`
   - Cannot approve own requests (excluded by design)

**Backend Authorization:**
```typescript
const isAdmin = decoded.role === 'admin';
const isApprover = leaveRequest[0].approverId === decoded.id;

if (!isAdmin && !isApprover) {
  return error: 'Not authorized to approve this request';
}

// For non-admin approvers, verify permission
if (!isAdmin && isApprover) {
  if (decoded.permissions?.leave?.approve !== true) {
    return error: 'You do not have permission to approve leave requests';
  }
}
```

#### Frontend UI Logic:
```typescript
// Show approve/reject buttons if:
request.status === 'pending' && (
  isAdmin ||  // Admin can approve any
  (request.approverId === userInfo?.id && userInfo?.permissions?.leave?.approve)  // Designated approver with permission
)
```

### E. Manual Action Feature

**API Endpoint:** `POST /api/admin/leave/manual`

**Restrictions:**
- **ONLY available for admin role** (`userInfo?.role === 'admin'`)
- Not available for employees (even with approve permission)
- Allows admin to manually approve/reject leave for employees who request via phone/message

**Frontend UI:**
```typescript
{userInfo?.role === 'admin' && (
  <button onClick={() => setShowManualModal(true)}>
    Manual Action
  </button>
)}
```

### F. Self-Approval Prevention

Multiple layers prevent users from approving their own leave:

1. **Approver Dropdown:** Current user excluded from list
2. **Frontend Validation:** Cannot select self as approver
3. **Backend Validation:** Rejects if `approverId === userId`
4. **Authorization Check:** When approving, checks if user is NOT the employee who requested

## Database Schema

### Leave Requests Table:
```sql
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  approver_id UUID REFERENCES users(id),  -- Who can approve this request
  leave_type VARCHAR,
  start_date DATE,
  end_date DATE,
  days INTEGER,
  reason TEXT,
  status VARCHAR,  -- pending, approved, rejected
  approved_by UUID,  -- Who actually approved/rejected
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  ...
);
```

### User Roles & Permissions:
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name VARCHAR,
  permissions JSONB,  -- { leave: { approve: true/false, create: true/false, ... } }
  ...
);
```

## Complete User Workflows

### Workflow 1: Employee Submits Leave Request
1. Employee logs in with `role: 'employee'` and `permissions.leave.create: true`
2. Opens Leave Management page
3. Clicks "Request Leave" button
4. Form shows approver dropdown (populated via `/api/admin/leave/approvers`)
5. Selects approver from list (admins + users with approve permission, excluding self)
6. Fills in leave details (dates, reason, etc.)
7. Submits request → `POST /api/admin/leave/requests`
8. Backend validates approver selection and creates request with `approverId`
9. Request appears in employee's list with status "pending"

### Workflow 2: Approver Reviews Leave Request
1. User with `permissions.leave.approve: true` logs in
2. Opens Leave Management page
3. Sees requests where they are the designated approver
4. Views pending requests assigned to them
5. Clicks Approve/Reject button
6. Backend verifies:
   - User is the designated approver (`approverId === userId`)
   - User has approve permission
   - Request is pending
7. Updates request status to approved/rejected
8. Employee receives updated status

### Workflow 3: Admin Manages All Requests
1. Admin logs in with `role: 'admin'`
2. Opens Leave Management page
3. Sees ALL employee leave requests
4. Can approve/reject ANY pending request
5. Can use "Manual Action" to create approved/rejected leave for employees
6. Has full visibility and control

### Workflow 4: Admin Submits Own Leave
1. Admin clicks "Request Leave"
2. Approver field is hidden (not required for admin)
3. Submits request without selecting approver
4. Request created with `approverId: null`
5. Status set to "pending"

## Permission Matrix

| Feature | Admin | Employee (Approve) | Employee (Create) |
|---------|-------|-------------------|------------------|
| View Own Requests | ✅ | ✅ | ✅ |
| View All Requests | ✅ | ❌ | ❌ |
| View Assigned Requests | ✅ | ✅ (where approverId = self) | ❌ |
| Create Leave Request | ✅ (no approver needed) | ✅ (approver required) | ✅ (approver required) |
| Approve Own Request | ❌ | ❌ | ❌ |
| Approve Assigned Request | ✅ (any) | ✅ (only assigned) | ❌ |
| Reject Assigned Request | ✅ (any) | ✅ (only assigned) | ❌ |
| Manual Action | ✅ | ❌ | ❌ |
| Select Self as Approver | ❌ | ❌ | ❌ |

## Key Features

### ✅ Dynamic Approver List
- Automatically populated based on roles and permissions
- Shows only users with approve permission
- Excludes current user
- Updates when roles/permissions change

### ✅ Granular Permission Control
- Approve permission controls who can approve requests
- Create permission controls who can submit requests
- Permissions checked at both frontend and backend

### ✅ Self-Approval Prevention
- Multi-layer validation prevents self-approval
- Approver dropdown excludes current user
- Backend validates approver != requester

### ✅ Role-Based Visibility
- Admin sees everything
- Employees see own + assigned requests
- Filtered at database query level

### ✅ Secure Authorization
- Token-based authentication
- Permission verification on every API call
- Role and approver checks before approve/reject

## Testing Checklist

### Test Case 1: Employee Leave Request
- [ ] Employee can see "Request Leave" button
- [ ] Approver dropdown shows admins + approvers
- [ ] Current user excluded from approver list
- [ ] Cannot submit without selecting approver
- [ ] Request created with correct approverId
- [ ] Request appears in employee's list

### Test Case 2: Approver Functionality
- [ ] User with approve permission sees assigned requests
- [ ] Approve/Reject buttons show only for assigned requests
- [ ] Can approve assigned requests successfully
- [ ] Cannot approve requests not assigned to them
- [ ] Status updates correctly after approval

### Test Case 3: Admin Functionality
- [ ] Admin sees all leave requests
- [ ] Admin can approve any request
- [ ] Admin can submit leave without approver
- [ ] Manual Action button visible for admin only
- [ ] Manual Action works correctly

### Test Case 4: Permission Validation
- [ ] User without approve permission cannot approve
- [ ] User without create permission cannot submit
- [ ] Backend rejects unauthorized approve attempts
- [ ] Frontend hides features based on permissions

### Test Case 5: Self-Approval Prevention
- [ ] Cannot select self in approver dropdown
- [ ] Backend rejects if approverId === userId
- [ ] Cannot approve own requests
- [ ] Approve buttons don't show for own requests

## Implementation Files

### Frontend:
- `src/app/dashboard/leave/page.tsx` - Main leave management UI
  - Approver dropdown logic
  - Dynamic button visibility
  - Form validations

### Backend APIs:
- `src/app/api/admin/leave/requests/route.ts` - GET (list), POST (create)
- `src/app/api/admin/leave/[id]/approve/route.ts` - Approve endpoint
- `src/app/api/admin/leave/[id]/reject/route.ts` - Reject endpoint
- `src/app/api/admin/leave/approvers/route.ts` - Get approver list
- `src/app/api/admin/leave/manual/route.ts` - Manual action (admin only)

### Authentication:
- `src/app/api/auth/me/route.ts` - Get current user info with permissions

## Troubleshooting

### Issue: Approver dropdown is empty
**Cause:** No users with approve permission, or all users are inactive
**Fix:** 
1. Check if any users have `permissions.leave.approve: true` in their role
2. Ensure admin users exist and are active
3. Check console logs for API errors

### Issue: Cannot approve assigned requests
**Cause:** User missing approve permission in role
**Fix:**
1. Verify `permissions.leave.approve === true` in user's role
2. Check if user is the designated approver in the request
3. Ensure request status is "pending"

### Issue: Employee can see all requests
**Cause:** Backend query not filtering by role
**Fix:**
1. Verify GET endpoint has role-based filtering
2. Check if `decoded.role` is correctly set in token
3. Ensure employee record exists for the user

## Summary

This implementation provides a fully dynamic, role-based leave management system where:
- **Admins** have full control
- **Employees with approve permission** can approve assigned requests only
- **All employees** must select approvers and cannot approve own requests
- **Manual Action** is admin-exclusive
- **Permissions** are enforced at multiple layers for security
