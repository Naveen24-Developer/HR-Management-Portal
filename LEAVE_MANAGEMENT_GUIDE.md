# Leave Management System - Implementation Guide

## Overview

A comprehensive leave management system with role-based access control, dynamic approver selection, automatic balance calculations, and admin manual entry capabilities.

## Architecture

### Database Schema

#### 1. **leave_requests** (Enhanced)
```sql
- id (uuid, primary key)
- employee_id (uuid, references employees.id with CASCADE DELETE)
- approver_id (uuid, references users.id) - Who will approve this request
- leave_type (varchar) - sick, casual, earned, maternity, paternity
- start_date (date)
- end_date (date)
- days (integer) - Working days count (excludes weekends)
- reason (text)
- status (varchar) - pending, approved, rejected
- approved_by (uuid, references users.id) - Who actually approved/rejected
- approved_at (timestamp)
- rejection_reason (text)
- emergency_contact (varchar)
- handover_notes (text)
- document_url (text)
- is_manual_entry (boolean) - True if admin created manually
- manual_entry_by (uuid, references users.id)
- created_at (timestamp)
```

#### 2. **leave_policies** (New)
```sql
- id (uuid, primary key)
- leave_type (varchar, unique) - sick, casual, earned, maternity, paternity
- display_name (varchar)
- annual_quota (integer) - Total days per year
- max_consecutive_days (integer)
- requires_document (boolean)
- requires_approval (boolean)
- carry_forward_enabled (boolean)
- max_carry_forward (integer)
- min_notice_days (integer)
- description (text)
- is_active (boolean)
```

**Default Policies:**
- Sick Leave: 12 days, requires document
- Casual Leave: 8 days, no document required
- Earned Leave: 21 days, carry forward enabled (max 7 days)
- Maternity Leave: 180 days, requires document
- Paternity Leave: 15 days, no document required

#### 3. **leave_balances** (New)
```sql
- id (uuid, primary key)
- employee_id (uuid, references employees.id with CASCADE DELETE)
- leave_type (varchar)
- year (integer)
- total_quota (integer) - Annual quota + carried forward
- used_quota (integer) - Approved leave days
- pending_quota (integer) - Pending approval days
- available_quota (integer) - Remaining days
- carried_forward (integer) - Days carried from previous year
- unique constraint on (employee_id, leave_type, year)
```

**Automatic Trigger:**
```sql
CREATE FUNCTION update_leave_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-update balance when leave request status changes
  -- Recalculates used_quota, pending_quota, and available_quota
END;
$$;
```

### API Endpoints

#### Employee Endpoints

**1. GET /api/leave/approvers**
- Returns list of users with approve permission in leave module
- Excludes current user (can't approve own leave)
- Filters by role permissions: `leave.approve === true`

**2. GET /api/leave/requests**
- Fetches leave requests for current user
- Query params: `page`, `limit`, `status`, `type`, `date`, `employeeId`
- Employees see: Own requests + Requests they need to approve
- Admins see: All requests

**3. POST /api/leave/requests**
- Creates new leave request
- Required: `leaveType`, `startDate`, `endDate`, `reason`, `approverId` (for employees)
- Optional: `emergencyContact`, `handoverNotes`, `documentUrl`
- Auto-calculates working days (excludes weekends)

**4. GET /api/leave/stats**
- Returns statistics: totalRequests, pendingRequests, approvedThisMonth, rejectedThisMonth
- Returns leave balance for current user from `leave_balances` table

**5. GET /api/leave/balance/:employeeId**
- Fetches leave balance for specific employee
- Auto-initializes if not exists (from `leave_policies`)
- Employees: Can view own balance
- Admins: Can view any employee's balance

**6. PUT /api/leave/:id/approve**
- Approves a leave request
- Authorization: Admin or designated approver (approverId)
- Updates: status='approved', approvedBy, approvedAt
- Trigger automatically updates leave_balances

**7. PUT /api/leave/:id/reject**
- Rejects a leave request
- Required: `reason` (rejection reason)
- Authorization: Admin or designated approver
- Updates: status='rejected', approvedBy, approvedAt, rejectionReason
- Trigger automatically updates leave_balances

#### Admin Endpoints

**8. POST /api/admin/leave/manual**
- Admin manually creates leave entry for employee
- Use cases: Phone/message leave requests, corrections, historical entries
- Required: `employeeId`, `leaveType`, `startDate`, `endDate`, `reason`
- Optional: `status` (default: 'approved'), `days`, `emergencyContact`, `handoverNotes`
- Sets: `isManualEntry=true`, `manualEntryBy=adminId`, no approver needed

### UI Components

#### Employee View

**Leave Request Form:**
- Leave Type dropdown (from leave_policies)
- Start Date & End Date pickers
- Auto-calculated working days (excludes weekends)
- Reason textarea (required)
- **Approver Selection dropdown** (only users with approve permission, excludes self)
- Emergency Contact (optional)
- Handover Notes (optional)
- Supporting Document URL (optional, required for sick/maternity)

**Leave Balance Display:**
- Shows available/used/pending quotas per leave type
- Dynamically fetched from leave_balances table
- Updates in real-time when requests are approved/rejected

#### Admin View

**All Requests Table:**
- View all employees' leave requests
- Filter by: Status, Type, Date, Employee
- Actions: View Details, Approve, Reject, Delete

**Manual Leave Entry Modal:**
- Select Employee dropdown
- Same fields as employee form
- Pre-select status (pending/approved/rejected)
- Marks as manual entry with admin tracking

**Approver Queue:**
- Users with approve permission see requests where they are designated approver
- Can approve/reject with comments

## Permission System

### Required Permissions

**leave.create** - Submit leave requests
**leave.view** - View leave requests (own or all)
**leave.edit** - Edit leave requests
**leave.approve** - Approve/reject leave requests, appears in approver dropdown
**leave.delete** - Delete leave requests
**leave.manage** - Admin-level management (manual entries, view all)

### Role Setup Example

**Employee Role:**
```json
{
  "leave": {
    "create": true,
    "view": true,
    "edit": false,
    "approve": false,
    "delete": false,
    "manage": false
  }
}
```

**Manager/Approver Role:**
```json
{
  "leave": {
    "create": true,
    "view": true,
    "edit": true,
    "approve": true,
    "delete": false,
    "manage": false
  }
}
```

**Admin Role:**
```json
{
  "leave": {
    "create": true,
    "view": true,
    "edit": true,
    "approve": true,
    "delete": true,
    "manage": true
  }
}
```

## Business Logic

### Working Days Calculation
```typescript
function calculateWorkingDays(startDate, endDate) {
  let days = 0;
  let current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sat/Sun
      days++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}
```

### Leave Balance Calculation (Automatic Trigger)
```sql
-- When leave status changes to 'approved':
UPDATE leave_balances
SET 
  used_quota = used_quota + days,
  pending_quota = pending_quota - days,
  available_quota = total_quota - used_quota - pending_quota
WHERE employee_id = NEW.employee_id 
  AND leave_type = NEW.leave_type 
  AND year = EXTRACT(YEAR FROM NEW.start_date);

-- When leave status changes to 'pending':
UPDATE leave_balances
SET 
  pending_quota = pending_quota + days,
  available_quota = total_quota - used_quota - pending_quota
WHERE ...;

-- When leave status changes to 'rejected':
UPDATE leave_balances
SET 
  pending_quota = pending_quota - days,
  available_quota = total_quota - used_quota - pending_quota
WHERE ...;
```

### Approver Selection Logic
1. Fetch all active users with `leave.approve === true` permission
2. Exclude current user (cannot approve own leave)
3. Display in dropdown: `Full Name - Position (Role)`
4. Employee must select approver before submitting
5. Admin can submit without approver (optional)

## Workflows

### Employee Leave Request Flow
```
1. Employee clicks "Request Leave"
2. Fills form (type, dates, reason)
3. Selects approver from dropdown (filtered list)
4. Submits request
5. Status: pending
6. leave_balances.pending_quota += days
7. Approver receives notification (future feature)
8. Approver approves/rejects
9. If approved:
   - leave_balances.pending_quota -= days
   - leave_balances.used_quota += days
   - leave_balances.available_quota recalculated
10. If rejected:
    - leave_balances.pending_quota -= days
    - leave_balances.available_quota recalculated
```

### Admin Manual Entry Flow
```
1. Admin clicks "Manual Action"
2. Selects employee from dropdown
3. Fills form (type, dates, reason, status)
4. Submits
5. Leave created with:
   - is_manual_entry = true
   - manual_entry_by = admin_id
   - status = 'approved' (or selected status)
6. Balance updated automatically via trigger
```

## Database Migration

**File:** `drizzle/0015_enhanced_leave_management.sql`

**To Apply:**
```bash
npm run db:push
# or
npm run db:migrate
```

**Rollback (if needed):**
```sql
DROP TRIGGER IF EXISTS update_leave_balance_trigger ON leave_requests;
DROP FUNCTION IF EXISTS update_leave_balance();
DROP TABLE IF EXISTS leave_balances CASCADE;
DROP TABLE IF EXISTS leave_policies CASCADE;
ALTER TABLE leave_requests DROP COLUMN IF EXISTS approver_id CASCADE;
-- ... revert other columns
```

## Testing Checklist

### Setup
- [ ] Run database migration
- [ ] Create "Manager" role with `leave.approve = true`
- [ ] Assign Manager role to a test user (e.g., john@example.com)
- [ ] Create "Employee" role with `leave.create = true, leave.approve = false`
- [ ] Assign Employee role to another user (e.g., jane@example.com)

### Employee Functionality
- [ ] Employee logs in (jane@example.com)
- [ ] Sees leave balance (sick: 12, casual: 8, earned: 21)
- [ ] Clicks "Request Leave"
- [ ] Selects leave type "Casual"
- [ ] Picks start/end dates (e.g., 3 days)
- [ ] **Approver dropdown shows only john@example.com (Manager), not self**
- [ ] Selects approver (john@example.com)
- [ ] Fills reason, emergency contact
- [ ] Submits successfully
- [ ] Status shows "Pending"
- [ ] Leave balance shows: available: 8, pending: 3, used: 0

### Approver Functionality
- [ ] Manager logs in (john@example.com)
- [ ] Sees leave request from jane@example.com in queue
- [ ] Clicks "View Details"
- [ ] Reviews request information
- [ ] Clicks "Approve"
- [ ] Request status changes to "Approved"
- [ ] jane's leave balance updates: available: 5, pending: 0, used: 3

### Rejection Flow
- [ ] jane submits another leave request (2 days, Sick)
- [ ] john receives request
- [ ] Clicks "Reject"
- [ ] Enters rejection reason: "Insufficient staffing"
- [ ] Request status: "Rejected"
- [ ] jane's sick leave balance: available: 12, pending: 0, used: 0

### Admin Manual Entry
- [ ] Admin logs in
- [ ] Clicks "Manual Action"
- [ ] Selects employee: jane@example.com
- [ ] Enters: Casual, 1 day, "Phone call leave request"
- [ ] Status: "Approved"
- [ ] Submits
- [ ] Leave marked as manual entry
- [ ] jane's casual balance: available: 4, used: 4

### Edge Cases
- [ ] Employee tries to select self as approver → Not in dropdown
- [ ] Employee submits without selecting approver → Validation error
- [ ] Admin submits leave without approver → Success (approver optional for admin)
- [ ] User tries to approve own leave → Should fail (authorization check)
- [ ] Non-approver tries to approve request → Should fail
- [ ] Approving already-approved request → Error: "Already approved"

## Future Enhancements

1. **Email Notifications:** Send email to approver when leave is submitted
2. **Push Notifications:** Real-time alerts for approvers
3. **Leave Calendar:** Visual calendar showing team leave schedules
4. **Conflict Detection:** Warn if multiple team members on leave same dates
5. **Carry Forward Automation:** Auto-carry forward unused earned leave at year-end
6. **Leave Policy Settings UI:** Admin page to configure policies (currently hardcoded)
7. **Delegation:** Approvers can delegate approval to another user
8. **Multi-level Approval:** Escalation to higher authority for long leaves
9. **Public Holidays:** Integration with holiday calendar, exclude from day count
10. **Leave Reports:** Generate reports on leave utilization by department/type

## Configuration

### Leave Policy Customization

Edit `drizzle/0015_enhanced_leave_management.sql` to modify default policies:

```sql
INSERT INTO leave_policies (leave_type, display_name, annual_quota, ...)
VALUES 
  ('sick', 'Sick Leave', 15, ...), -- Change 12 to 15
  ...;
```

Then re-run migration.

### Working Days Logic

To include Saturdays or use different weekend pattern, modify calculation in:
- `src/app/api/leave/requests/route.ts` (line ~200)
- `src/app/dashboard/leave/page.tsx` (handleCalculateDays function)

## Troubleshooting

**Issue:** Approver dropdown is empty
- **Solution:** Ensure at least one user has `leave.approve = true` in their role permissions
- Check: Navigate to `/dashboard/roles`, edit role, go to "Action Permissions" tab, enable "Approve" for Leave module

**Issue:** Leave balance not updating after approval
- **Solution:** Check if trigger is installed: `SELECT * FROM pg_trigger WHERE tgname = 'update_leave_balance_trigger';`
- Re-run migration if trigger missing

**Issue:** Employee can't submit leave (approver required error)
- **Solution:** Employee must select an approver from dropdown before submitting

**Issue:** Manual entry fails with "Only administrators" error
- **Solution:** User must have `role = 'admin'` in users table

## API Response Examples

**GET /api/leave/approvers**
```json
{
  "success": true,
  "approvers": [
    {
      "id": "uuid-123",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "position": "Manager",
      "employeeId": "EMP001",
      "role": "manager"
    }
  ],
  "count": 1
}
```

**GET /api/leave/balance/:employeeId**
```json
{
  "success": true,
  "employeeId": 456,
  "year": 2025,
  "balances": [
    {
      "leaveType": "casual",
      "totalQuota": 8,
      "usedQuota": 3,
      "pendingQuota": 2,
      "availableQuota": 3,
      "carriedForward": 0,
      "policyDisplayName": "Casual Leave"
    }
  ]
}
```

**POST /api/leave/requests**
```json
{
  "leaveType": "sick",
  "startDate": "2025-02-01",
  "endDate": "2025-02-03",
  "reason": "Medical appointment",
  "approverId": "uuid-approver",
  "emergencyContact": "Jane Doe - 555-1234",
  "documentUrl": "https://example.com/medical-cert.pdf"
}
```

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── leave/
│   │   │   ├── approvers/route.ts       # GET approvers list
│   │   │   ├── requests/route.ts        # GET/POST leave requests
│   │   │   ├── stats/route.ts           # GET leave statistics
│   │   │   ├── balance/[employeeId]/route.ts  # GET leave balance
│   │   │   └── [id]/
│   │   │       ├── approve/route.ts     # PUT approve request
│   │   │       └── reject/route.ts      # PUT reject request
│   │   └── admin/
│   │       └── leave/
│   │           └── manual/route.ts      # POST manual entry
│   └── dashboard/
│       └── leave/page.tsx               # Leave management UI
├── lib/
│   └── database/
│       └── schema.ts                    # Updated with new tables
└── drizzle/
    └── 0015_enhanced_leave_management.sql  # Migration file
```

---

**Documentation Version:** 1.0
**Last Updated:** 2025-01-28
**Author:** GitHub Copilot
**Status:** ✅ Ready for Testing
