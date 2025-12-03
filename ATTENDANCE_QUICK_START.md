# Attendance System - Quick Start Guide

## Overview
The new attendance system provides comprehensive tracking of employee check-in/check-out with automatic status calculations.

## Key Concepts

### 1. Check-in Window
- **Default:** 08:00 - 10:00
- Early Check-in: Before 08:00
- On Time: 08:00 - 10:00
- Late: After 10:00

### 2. Check-out Window
- **Default:** 17:00 - 19:00
- Early Checkout: Before 17:00
- On Time: 17:00 - 19:00
- Overtime: After 19:00

### 3. Attendance Status
- **Present:** Valid check-in (Early or On Time) + Valid check-out (On Time or Over Time)
- **Absent:** No check-in by checkout start time (17:00)
- **Half Day:** Late check-in OR early checkout

## Real-World Examples

### Example 1: Perfect Attendance
```
Check-in: 09:00 AM
- Status: ✓ ON TIME
- Duration: 0 minutes

Check-out: 05:30 PM
- Status: ⏱ OVERTIME
- Duration: +30 minutes

Work Hours: 8.5 hours
Attendance: ✓ PRESENT
Early/Late/OT: OT: 30m
```

### Example 2: Late Check-in
```
Check-in: 10:15 AM
- Status: ⚠ LATE
- Duration: +15 minutes

Check-out: 06:00 PM
- Status: ⏱ OVERTIME
- Duration: +60 minutes

Work Hours: 7.75 hours
Attendance: ✓ PRESENT (Still valid - has late check-in + valid check-out)
Early/Late/OT: Late: 15m, OT: 60m
```

### Example 3: Early Check-in
```
Check-in: 07:45 AM
- Status: ✓ EARLY
- Duration: -15 minutes

Check-out: 05:15 PM
- Status: ✓ ON TIME
- Duration: 0 minutes

Work Hours: 9.5 hours
Attendance: ✓ PRESENT
Early/Late/OT: Early: 15m
```

### Example 4: Absent
```
Check-in: None
Check-out: None

Current Time: 5:30 PM (Past checkout start time 5:00 PM)
Attendance: ✗ ABSENT
```

### Example 5: Half Day
```
Check-in: 10:30 AM (Late)
- Status: ⚠ LATE
- Duration: +30 minutes

Check-out: 04:45 PM (Early)
- Status: Early Checkout
- Duration: -15 minutes

Work Hours: 6.25 hours
Attendance: ◐ HALF DAY
Early/Late/OT: Late: 30m, Early Checkout: 15m
```

## API Integration Examples

### Check-in API Request
```bash
POST /api/admin/attendance/checkin
Authorization: Bearer {token}
Content-Type: application/json

{
  "timestamp": "2025-11-27T09:15:00Z",
  "latitude": 28.7041,
  "longitude": 77.1025
}
```

### Check-in API Response
```json
{
  "success": true,
  "message": "Checked in successfully",
  "checkInStatus": "late",
  "attendance": {
    "id": "uuid",
    "employeeId": "uuid",
    "date": "2025-11-27",
    "checkIn": "2025-11-27T09:15:00Z",
    "status": "late",
    "checkInStatus": "late",
    "checkInDuration": 15,
    "lateMinutes": 15
  }
}
```

### Check-out API Request
```bash
POST /api/admin/attendance/checkout
Authorization: Bearer {token}
Content-Type: application/json

{
  "timestamp": "2025-11-27T17:45:00Z"
}
```

### Check-out API Response
```json
{
  "success": true,
  "message": "Checked out successfully. Worked 8.5 hours (Over time by 45 minutes)",
  "checkOutStatus": "over_time",
  "attendanceStatus": "present",
  "attendance": {
    "id": "uuid",
    "employeeId": "uuid",
    "date": "2025-11-27",
    "checkIn": "2025-11-27T09:15:00Z",
    "checkOut": "2025-11-27T17:45:00Z",
    "status": "present",
    "checkInStatus": "late",
    "checkInDuration": 15,
    "checkOutStatus": "over_time",
    "checkOutDuration": 45,
    "workHours": 8.5,
    "overtimeMinutes": 45,
    "lateMinutes": 15
  }
}
```

## Frontend Usage

### Accessing Attendance Data
```typescript
// Fetch attendance records
const response = await fetch(`/api/admin/attendance?date=2025-11-27`, {
  headers: { Authorization: `Bearer ${token}` }
});
const { attendance } = await response.json();

// Calculate statuses (frontend)
attendance.forEach(record => {
  const { checkInStatus, checkOutStatus, attendanceStatus } = calculateAllStatus(record);
  console.log(`Employee: ${record.firstName} - ${attendanceStatus}`);
});
```

### Display Status with Icons
```typescript
const getStatusIcon = (status: string) => {
  switch(status) {
    case 'present': return '✓ Present';
    case 'absent': return '✗ Absent';
    case 'late': return '⚠ Late';
    case 'half_day': return '◐ Half Day';
    default: return '?';
  }
};
```

## Filtering & Searching

### By Date
```
Select date: 2025-11-27
Shows: All attendance records for that date
```

### By Department
```
Select department: "IT"
Shows: Only IT department employees
```

### By Status
```
Select status: "Present"
Shows: Only employees marked as Present
```

### By Employee (Search)
```
Search: "John"
Shows: All employees with "John" in name/email
```

## Manual Entry

When to use manual entry:
- Employee forgot to check-in/out
- System was unavailable during check-in/out
- Correcting erroneous records
- Adjusted timings for special circumstances

Steps:
1. Click "Manual Entry" button
2. Select employee
3. Enter date
4. Enter check-in time
5. Enter check-out time
6. Add optional notes
7. Click "Add Record"

## Exporting Data

### Excel Export
```
1. Set desired filters (date, department, status)
2. Click "Export Excel"
3. File downloads as: attendance-YYYY-MM-DD.xlsx
4. Contains all filtered records with all columns
```

### Data Included:
- Employee name, email, department
- Check-in/out times
- Status (check-in, check-out, overall)
- Work hours
- Early/late/overtime durations

## Settings Configuration

### How to Change Settings

1. Navigate to Admin → Settings → Attendance
2. Update the following:

```
Check-in Start Time: 08:00
Check-in End Time: 10:00
Check-out Start Time: 17:00
Check-out End Time: 19:00
Standard Work Hours: 8.0
```

3. Click "Save Settings"
4. Changes apply immediately to new records

## Troubleshooting

### Issue: "Already checked in today"
**Cause:** Employee already has a check-in record
**Solution:** Use manual entry to edit if needed, or contact admin

### Issue: "Must check in before checking out"
**Cause:** Employee attempting check-out without check-in
**Solution:** Check-in first, then check-out

### Issue: Attendance showing as "Absent"
**Cause:** No check-in recorded by checkout start time
**Solution:** Check employee's timestamp; may need manual entry

### Issue: Work hours showing 0
**Cause:** No check-out time recorded yet
**Solution:** Employee hasn't checked out yet or system pending update

## Common Scenarios

### Scenario 1: Standard 9-5 Employee
```
Ideal Times:
- Check-in: 08:30 - 09:00
- Check-out: 17:00 - 17:30
Expected: ✓ PRESENT, ~8.5 hours
```

### Scenario 2: Employee Working Late
```
Times:
- Check-in: 08:45
- Check-out: 19:30
Expected: ✓ PRESENT, ~10.75 hours, OT: 90 minutes
```

### Scenario 3: Employee Late Morning
```
Times:
- Check-in: 10:30
- Check-out: 17:00
Expected: ◐ HALF DAY, ~6.5 hours, Late: 30 min
```

### Scenario 4: Employee Not Showing Up
```
Times:
- Check-in: None
- Current time: 17:15 (Past checkout start)
Expected: ✗ ABSENT
```

## Key Metrics

### Displayed in Dashboard:
- **Total Employees:** Count of all active employees
- **Present Today:** Employees marked as Present
- **Late Today:** Employees with late check-in
- **Average Work Hours:** Average hours worked today
- **On Time Percentage:** % of employees on time

### Calculated in Reports:
- Monthly attendance rate
- Repeat late arrivals
- Overtime distribution
- Half-day trends
- Absence patterns

## Database Fields Reference

### Attendance Table Key Fields:
```
- date: Date of attendance
- checkIn: Timestamp of check-in
- checkInStatus: 'early' | 'on_time' | 'late'
- checkInDuration: Minutes (signed)
- checkOut: Timestamp of check-out
- checkOutStatus: 'early' | 'on_time' | 'over_time'
- checkOutDuration: Minutes (signed)
- workHours: Decimal (8.5, 7.75, etc.)
- status: 'present' | 'absent' | 'half_day'
- lateMinutes: Minutes late (if applicable)
- overtimeMinutes: Minutes overtime (if applicable)
- earlyCheckout: Boolean
```

## Best Practices

1. **Consistent Check-in Times:** Encourage employees to check in around the same time daily
2. **Enable GPS:** Use geofencing for accurate location verification
3. **Regular Reviews:** Check attendance reports weekly or monthly
4. **Clear Policies:** Communicate grace periods and expectations
5. **Fair Application:** Apply rules consistently across all departments
6. **Feedback:** Discuss patterns with employees showing frequent delays

## Support

For issues or questions:
- Check the main documentation: `ATTENDANCE_IMPLEMENTATION.md`
- Review the utility functions: `src/lib/utils/attendance-calculator.ts`
- Check API routes for detailed implementation
- Refer to test files for usage examples
