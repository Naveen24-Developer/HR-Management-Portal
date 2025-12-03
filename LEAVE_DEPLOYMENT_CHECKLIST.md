# Leave Management System - Deployment Checklist

## ✅ Pre-Deployment Verification

### 1. Code Review
- [x] Database migration created (`drizzle/0015_enhanced_leave_management.sql`)
- [x] Schema.ts updated with new tables
- [x] 8 API endpoints created and tested (structure verified)
- [x] Frontend UI updated with approver selection
- [x] TypeScript compilation: **0 errors**
- [x] Documentation complete (3 comprehensive guides)

### 2. Database Migration (REQUIRED)

**Status:** ⏳ **PENDING EXECUTION**

**Command to run:**
```bash
cd "c:\Users\ADMIN\OneDrive\Documents\HRM-Portal-main\HRM-Portal-main"
npm run db:push
```

**What this does:**
1. Creates `leave_policies` table with 5 default policies
2. Creates `leave_balances` table
3. Adds 7 new columns to `leave_requests` table
4. Creates `update_leave_balance()` trigger function
5. Adds 5 performance indexes

**Verification after migration:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('leave_policies', 'leave_balances');

-- Check trigger
SELECT tgname FROM pg_trigger WHERE tgname = 'update_leave_balance_trigger';

-- Check default policies
SELECT leave_type, display_name, annual_quota FROM leave_policies;
```

**Expected output:**
```
leave_type | display_name      | annual_quota
-----------|-------------------|-------------
sick       | Sick Leave        | 12
casual     | Casual Leave      | 8
earned     | Earned Leave      | 21
maternity  | Maternity Leave   | 180
paternity  | Paternity Leave   | 15
```

### 3. Role Configuration

**Action Required:** Create roles with proper permissions

#### Step 1: Create "Manager" Role
1. Navigate to: `http://localhost:3000/dashboard/roles`
2. Click "Create New Role"
3. Fill Basic Info:
   - Name: `Manager`
   - Description: `Team managers with approval authority`
4. Go to **"Action Permissions"** tab
5. Expand **"Leave"** module
6. Enable:
   - ✅ View
   - ✅ Create
   - ✅ Edit
   - ✅ **Approve** ← CRITICAL (makes them appear in approver dropdown)
7. Save role

#### Step 2: Create "Employee" Role
1. Click "Create New Role"
2. Fill Basic Info:
   - Name: `Employee`
   - Description: `Standard employees`
3. Go to **"Action Permissions"** tab
4. Expand **"Leave"** module
5. Enable:
   - ✅ View (own requests only)
   - ✅ Create
   - ❌ Approve (leave unchecked)
6. Save role

#### Step 3: Assign Users to Roles
1. On Roles page, find "Manager" role
2. Click **"Assign Users"**
3. Select users who should be approvers (e.g., department heads)
4. Repeat for "Employee" role

### 4. Testing Workflow

#### Test Case 1: Employee Submits Leave
**Prerequisites:**
- 1 user with "Manager" role (john@example.com)
- 1 user with "Employee" role (jane@example.com)

**Steps:**
1. Login as `jane@example.com` (Employee)
2. Navigate to **Leave Management**
3. Check leave balance:
   - Expected: Sick: 0, Casual: 0, Earned: 0 (will initialize on first request)
4. Click **"Request Leave"**
5. Fill form:
   - Leave Type: `Casual`
   - Start Date: Tomorrow
   - End Date: Day after tomorrow
   - Reason: `Test leave request`
   - **Approver**: Should show `john@example.com` (and NOT jane herself)
6. Submit
7. Expected result:
   - Success message
   - Status: "Pending"
   - Balance initializes: Casual available: 8, pending: 2 (if 2 working days)

**Verification Points:**
- ✅ Approver dropdown shows only users with approve permission
- ✅ Current user (jane) is NOT in approver dropdown
- ✅ If no approver selected → Validation error
- ✅ Leave balance auto-initializes on first request
- ✅ Pending quota increases

#### Test Case 2: Approver Approves Leave
**Steps:**
1. Login as `john@example.com` (Manager)
2. Navigate to **Leave Management**
3. See jane's pending request in list
4. Click **"View Details"** or directly click **"Approve"**
5. Confirm approval
6. Expected result:
   - Status changes to "Approved"
   - jane's balance updates: Casual available: 6, pending: 0, used: 2

**Verification Points:**
- ✅ Manager sees requests assigned to them
- ✅ Approval updates status immediately
- ✅ Leave balance auto-updates (trigger fires)
- ✅ used_quota increases, pending_quota decreases

#### Test Case 3: Approver Rejects Leave
**Steps:**
1. jane submits another leave (3 days Sick)
2. john sees request
3. john clicks **"Reject"**
4. Enters reason: `Team is short-staffed`
5. Expected result:
   - Status: "Rejected"
   - Rejection reason visible
   - jane's balance: Sick available: 12, pending: 0, used: 0

**Verification Points:**
- ✅ Rejection reason is required
- ✅ Rejected requests don't affect used_quota
- ✅ pending_quota decreases back to 0

#### Test Case 4: Admin Manual Entry
**Prerequisites:**
- Login as admin user

**Steps:**
1. Navigate to **Leave Management**
2. Click **"Manual Action"** button
3. Fill form:
   - Select Employee: `jane@example.com`
   - Leave Type: `Casual`
   - Start Date: Yesterday
   - End Date: Yesterday
   - Reason: `Called in sick via phone`
   - Status: `Approved`
4. Submit
5. Expected result:
   - Leave created with status "Approved"
   - Marked as `is_manual_entry = true`
   - jane's balance: Casual used: 3 (2 + 1)

**Verification Points:**
- ✅ Only admin can access "Manual Action"
- ✅ Manual entries are pre-approved
- ✅ Audit trail with manual_entry_by
- ✅ Balance updates immediately

#### Test Case 5: Edge Cases
1. **Self-approval attempt:**
   - Login as user with approve permission
   - Try to select self as approver
   - Expected: Self NOT in dropdown

2. **Unauthorized approval:**
   - Login as employee (no approve permission)
   - Try to approve a request via API
   - Expected: 403 Forbidden

3. **Duplicate approval:**
   - Approve a request
   - Try to approve again
   - Expected: Error "Already approved"

4. **Empty approver list:**
   - No users with approve permission
   - Employee tries to submit leave
   - Expected: Empty dropdown, cannot submit

### 5. Performance Verification

**Indexes created:**
```sql
idx_leave_balances_employee_year
idx_leave_balances_leave_type
idx_leave_requests_employee_status
idx_leave_requests_approver_status
idx_leave_requests_status_dates
```

**Test queries:**
```sql
-- Should use index
EXPLAIN ANALYZE 
SELECT * FROM leave_balances 
WHERE employee_id = 'uuid' AND year = 2025;

-- Should use index
EXPLAIN ANALYZE 
SELECT * FROM leave_requests 
WHERE approver_id = 'uuid' AND status = 'pending';
```

**Expected:** `Index Scan` in query plan (not `Seq Scan`)

### 6. Security Verification

**Checklist:**
- [ ] JWT tokens expire after 7 days
- [ ] All API endpoints validate token
- [ ] Non-approver cannot approve requests
- [ ] Employee cannot select self as approver
- [ ] Employee cannot view other employees' requests (unless approver)
- [ ] Only admin can create manual entries
- [ ] SQL injection protection (parameterized queries via Drizzle)

### 7. Data Integrity

**Cascade Delete Test:**
```sql
-- Delete an employee
DELETE FROM employees WHERE id = 'test-employee-uuid';

-- Verify leave_requests and leave_balances are also deleted
SELECT COUNT(*) FROM leave_requests WHERE employee_id = 'test-employee-uuid';
-- Expected: 0

SELECT COUNT(*) FROM leave_balances WHERE employee_id = 'test-employee-uuid';
-- Expected: 0
```

### 8. API Response Validation

**Test all endpoints return proper JSON:**
```bash
# Approvers list
curl http://localhost:3000/api/leave/approvers \
  -H "Authorization: Bearer <token>"
# Expected: {"success":true,"approvers":[...],"count":N}

# Leave requests
curl http://localhost:3000/api/leave/requests \
  -H "Authorization: Bearer <token>"
# Expected: {"success":true,"leaveRequests":[...],"pagination":{...}}

# Leave balance
curl http://localhost:3000/api/leave/balance/123 \
  -H "Authorization: Bearer <token>"
# Expected: {"success":true,"balances":[...]}

# Stats
curl http://localhost:3000/api/leave/stats \
  -H "Authorization: Bearer <token>"
# Expected: {"success":true,"stats":{...}}
```

### 9. UI/UX Verification

**Frontend Checklist:**
- [ ] Approver dropdown populated correctly
- [ ] Working days auto-calculated (excludes weekends)
- [ ] Leave balance displays correctly
- [ ] Status badges show proper colors (pending=yellow, approved=green, rejected=red)
- [ ] Rejection reason visible for rejected requests
- [ ] Manual entry button only visible to admin
- [ ] Form validation prevents submission without required fields
- [ ] Success/error alerts display properly

### 10. Documentation Review

**Files to review before deployment:**
- [ ] README.md updated with leave management features
- [ ] LEAVE_QUICK_START.md accessible to end users
- [ ] LEAVE_MANAGEMENT_GUIDE.md complete for developers
- [ ] LEAVE_IMPLEMENTATION_SUMMARY.md reviewed by team

## 🚀 Deployment Steps

### Step 1: Backup Current Database
```bash
pg_dump -U postgres -h localhost hrm_db > backup_before_leave_migration.sql
```

### Step 2: Run Migration (Production)
```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://user:pass@prod-host:5432/hrm_prod"

# Run migration
npm run db:push
```

### Step 3: Verify Migration Success
```sql
-- Check tables
SELECT COUNT(*) FROM leave_policies;  -- Should be 5
SELECT COUNT(*) FROM leave_balances;  -- Should be 0 (empty initially)

-- Check trigger
SELECT prosrc FROM pg_proc WHERE proname = 'update_leave_balance';
-- Should return function code
```

### Step 4: Create Default Roles
- Create "Manager" role with approve permission
- Create "Employee" role without approve permission
- Assign 2-3 test users to Manager role

### Step 5: Smoke Test
- Submit 1 test leave request as employee
- Approve as manager
- Verify balance updates
- Delete test data

### Step 6: Monitor Logs
```bash
# Watch for errors
tail -f /var/log/hrm-portal/app.log

# Check database connections
SELECT * FROM pg_stat_activity WHERE datname = 'hrm_prod';
```

### Step 7: User Training
- Send LEAVE_QUICK_START.md to all users
- Conduct demo session showing:
  - How to submit leave
  - How to select approver
  - How to approve/reject (for managers)
  - How to check balance

## 📊 Success Metrics

**After 1 week:**
- [ ] 80%+ employees have submitted at least 1 leave request
- [ ] 90%+ leave requests approved/rejected within 24 hours
- [ ] 0 errors in leave balance calculations
- [ ] Average response time < 500ms for all leave APIs

**After 1 month:**
- [ ] Leave policies configured in Settings (future feature)
- [ ] 100% of leave requests go through digital system (no manual tracking)
- [ ] Reports generated showing leave utilization

## 🐛 Rollback Plan

**If issues occur:**
```bash
# Restore database backup
psql -U postgres -h localhost hrm_db < backup_before_leave_migration.sql

# Revert code changes
git revert <commit-hash>

# Redeploy previous version
npm run build
pm2 restart hrm-portal
```

## 📞 Support Contacts

**Technical Issues:**
- Database: DBA team
- API: Backend team
- UI: Frontend team

**Business Issues:**
- Leave policies: HR department
- User access: IT admin

---

**Deployment Readiness:** ⏳ **PENDING MIGRATION EXECUTION**
**Risk Level:** 🟢 **LOW** (Non-breaking changes, new tables)
**Estimated Downtime:** 0 minutes (online migration)
**Rollback Time:** < 5 minutes

**Next Action:** Run `npm run db:push` to apply migration

---

**Checklist Last Updated:** January 28, 2025
**Prepared By:** GitHub Copilot
**Reviewed By:** _Pending_
**Approved For Deployment:** _Pending_
