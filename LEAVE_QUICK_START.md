# Leave Management System - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Apply Database Migration
```bash
cd "c:\Users\ADMIN\OneDrive\Documents\HRM-Portal-main\HRM-Portal-main"
npm run db:push
```

### Step 2: Create Roles

1. Navigate to `http://localhost:3000/dashboard/roles`
2. Create **"Manager"** role:
   - Basic Info: Name = "Manager"
   - Action Permissions → Leave Module:
     - ✅ View
     - ✅ Create
     - ✅ Approve ← **IMPORTANT**
     - ✅ Edit
     - ❌ Delete
3. Create **"Employee"** role:
   - Basic Info: Name = "Employee"
   - Action Permissions → Leave Module:
     - ✅ View (own requests only)
     - ✅ Create
     - ❌ Approve
     - ❌ Edit
     - ❌ Delete

### Step 3: Assign Roles to Users

1. Go to Roles page
2. Click **"Assign Users"** for "Manager" role
3. Select a user (e.g., john@example.com)
4. Repeat for "Employee" role with another user (e.g., jane@example.com)

### Step 4: Test Employee Flow

1. **Login as Employee** (jane@example.com)
2. Navigate to **Leave Management**
3. Click **"Request Leave"**
4. Fill form:
   - Leave Type: Casual
   - Start Date: Tomorrow
   - End Date: Day after tomorrow
   - Reason: "Personal work"
   - **Select Approver**: Choose Manager (john@example.com) from dropdown
5. Click **"Submit Leave Request"**
6. ✅ Request created with status "Pending"

### Step 5: Test Approver Flow

1. **Login as Manager** (john@example.com)
2. Navigate to **Leave Management**
3. See employee's pending request
4. Click **"View Details"**
5. Click **"Approve"**
6. ✅ Request approved, employee's leave balance auto-updated

---

## 🎯 Key Features at a Glance

### For Employees
- ✅ Submit leave requests with approver selection
- ✅ View leave balance (available/used/pending)
- ✅ Track request status (pending/approved/rejected)
- ✅ Automatic working days calculation (excludes weekends)

### For Approvers
- ✅ View requests assigned to them
- ✅ Approve or reject with reasons
- ✅ See employee details and leave history

### For Admins
- ✅ View all leave requests across organization
- ✅ Manual leave entry for employees (phone/email requests)
- ✅ Override approvals/rejections
- ✅ Manage leave policies (future: Settings page)

---

## 📋 Leave Types & Default Quotas

| Leave Type       | Annual Quota | Requires Document | Carry Forward |
|------------------|--------------|-------------------|---------------|
| **Sick Leave**   | 12 days      | Yes               | No            |
| **Casual Leave** | 8 days       | No                | No            |
| **Earned Leave** | 21 days      | No                | Yes (max 7)   |
| **Maternity**    | 180 days     | Yes               | No            |
| **Paternity**    | 15 days      | No                | No            |

---

## 🔑 Important Notes

### Approver Dropdown Logic
- Shows only users with **"Approve"** permission in Leave module
- **Excludes self** (cannot approve own leave)
- If dropdown is empty → No users have approve permission → Create Manager role

### Admin vs Employee
- **Admin**: Can submit leave without selecting approver (optional)
- **Employee**: Must select approver (required validation)

### Leave Balance Auto-Update
- When request is **approved**: `used_quota` increases, `available_quota` decreases
- When request is **rejected**: `pending_quota` decreases, `available_quota` increases
- When request is **submitted**: `pending_quota` increases
- Fully automatic via database trigger

### Manual Entry (Admin Only)
- Use when employee calls/emails for leave
- Pre-select status (approved/rejected/pending)
- Marked with `is_manual_entry = true` for audit trail

---

## 🐛 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| **Approver dropdown is empty** | Create role with `leave.approve = true`, assign to users |
| **"Approver required" error** | Employee must select an approver before submitting |
| **Leave balance not updating** | Check if migration ran successfully: `npm run db:push` |
| **Can't approve request** | User must be either admin OR the designated approver |
| **Manual entry fails** | Only admins can create manual entries |

---

## 🎨 UI Screenshots

### Employee Leave Request Form
```
┌─────────────────────────────────────┐
│ Request Leave                       │
├─────────────────────────────────────┤
│ Leave Type: [Casual Leave ▼]        │
│ Start Date: [2025-02-01]            │
│ End Date:   [2025-02-03]            │
│ Days: 3 days (Weekends excluded)    │
│                                     │
│ Select Approver: [John Doe - Manager▼] ← NEW
│                                     │
│ Reason: [Personal work...]         │
│ Emergency Contact: [Jane - 555-1234]│
│ Handover Notes: [...]              │
│                                     │
│ [Cancel] [Submit Leave Request]    │
└─────────────────────────────────────┘
```

### Leave Balance Display
```
┌─────────────────────────────────────┐
│ Leave Balance                       │
├─────────────────────────────────────┤
│ Sick Leave:    12 available / 12    │
│ Casual Leave:   5 available / 8     │
│                 3 used              │
│ Earned Leave:  21 available / 21    │
└─────────────────────────────────────┘
```

---

## 📚 Next Steps

1. **Run the migration**: `npm run db:push`
2. **Create roles** with approve permission
3. **Assign users** to roles
4. **Test employee flow**: Submit → Approve → Check balance
5. **Test admin manual entry**
6. **Configure policies** (future: Settings UI)

---

## 🆘 Need Help?

- **Full Documentation**: See `LEAVE_MANAGEMENT_GUIDE.md`
- **Testing Checklist**: Follow step-by-step in main guide
- **API Reference**: Check API endpoint examples in guide

---

**Ready to go!** 🎉 Start by running the migration and creating your first Manager role.
