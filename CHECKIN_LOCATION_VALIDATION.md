# Employee Check-In Implementation with Location Validation

## Overview
This document describes the complete implementation of the employee check-in system with location validation, including IP-based and GPS-based geofencing, proper error handling, and user-friendly alert messages.

## Implementation Summary

### (A) Check-In Process Flow

#### 1. **User Clicks "Check In" Button**
   - Location: Dashboard > "Check In" button in "Today's Attendance" section
   - Action: Opens a modal dialog (`CheckInDialog`)
   - Dialog shows information message based on restriction type

#### 2. **Location Collection (if GEO applicable)**
   - System checks employee's restrictions via `/api/admin/attendance/check-restrictions`
   - If employee has GEO restriction:
     - GPS permission is requested from the browser
     - Geolocation coordinates are collected
   - If employee has only IP restriction:
     - No GPS request needed
     - IP is extracted server-side during validation

#### 3. **Validation Process**
   - Loader displays: "Validating your location…"
   - Check-in data sent to `/api/admin/attendance/checkin`
   - Server validates:
     - **For IP Restrictions**: Client IP matched against allowed IPs/CIDR ranges
     - **For GEO Restrictions**: Location coordinates validated using Haversine distance formula
   - Validation completes and response returned

---

### (B) Error Handling & Alert Messages

#### **If Validation Fails:**

| Error Code | Alert Title | Message |
|-----------|------------|---------|
| `IP_NOT_ALLOWED` | Access Denied | "Access denied. You are not in the allowed IP range." |
| `GEO_OUTSIDE` | Location Not Allowed | "You are outside the allowed location to check-in." |
| `GPS_PERMISSION_DENIED` | GPS Permission Denied | "Please enable GPS to check-in from allowed location." |
| `GEO_MISSING` / `LOCATION_UNAVAILABLE` | Location Required | "Unable to validate your location. Please try again." |
| `TIMEOUT` | Request Timeout | "Location validation took too long. Please try again." |
| `IP_UNKNOWN` | Network Error | "Unable to determine your IP address. Please check your connection." |

Error alerts are displayed with:
- Red background and icon
- Clear, employee-friendly messaging
- "Retry" button available to try check-in again

---

### (C) Successful Check-In

#### **If Validation Passes:**
1. Success message displayed: "Check-in Successful"
2. Dialog shows checkmark icon with green styling
3. Auto-closes after 2 seconds
4. Dashboard updates:
   - Check-in time recorded
   - Attendance status calculated (On Time/Late/Early)
   - Recent activities updated
   - Statistics refreshed

---

## File Structure

### New Components & Files Created

```
src/
├── components/
│   └── attendance/
│       └── CheckInDialog.tsx              (NEW - Main check-in dialog component)
├── lib/
│   └── utils/
│       └── attendance-errors.ts           (NEW - Error mapping utilities)
├── app/
│   └── api/
│       └── admin/
│           └── attendance/
│               ├── check-restrictions/    (NEW - Endpoint to check employee restrictions)
│               │   └── route.ts
│               └── checkin/
│                   └── route.ts           (MODIFIED - Enhanced with validation)
└── app/
    └── admin/
        └── dashboard/
            └── page.tsx                   (MODIFIED - Integrated CheckInDialog)
```

---

## Component Details

### 1. **CheckInDialog Component** (`src/components/attendance/CheckInDialog.tsx`)

**Purpose**: Modal dialog to handle the check-in flow with location collection and validation

**Features**:
- GPS permission request with 15-second timeout
- Location collection using Geolocation API with high accuracy
- Loading state with spinner animation
- Error handling for GPS failures
- Success state with auto-close
- Retry capability for failed attempts
- Backdrop dismiss (disabled while loading)

**Props**:
```typescript
interface CheckInDialogProps {
  isOpen: boolean;                    // Dialog visibility
  onClose: () => void;                // Close handler
  onSubmit: (data: {                  // Submit handler
    timestamp: string;
    latitude?: number;
    longitude?: number;
  }) => Promise<void>;
  requiresGeo: boolean;               // Whether GEO validation is needed
}
```

**States**:
- `loading`: Submit in progress
- `alertType`: 'loading' | 'success' | 'error' | null
- `geoLocation`: Collected coordinates
- `errorCode`: API error code for debugging

---

### 2. **Error Utilities** (`src/lib/utils/attendance-errors.ts`)

**Purpose**: Centralized error code to user message mapping

**Key Functions**:
- `extractErrorInfo()`: Parse error responses
- `getErrorAlert()`: Get user-friendly alert for error code
- `formatErrorAlert()`: Format complete error object for display

**Error Map**:
- IP validation errors (IP_NOT_ALLOWED, IP_UNKNOWN)
- GEO validation errors (GEO_OUTSIDE, GEO_MISSING)
- GPS permission errors (GPS_PERMISSION_DENIED, LOCATION_UNAVAILABLE)
- Network errors (TIMEOUT, UNKNOWN)

---

### 3. **Check Restrictions Endpoint** (`src/app/api/admin/attendance/check-restrictions/route.ts`)

**Purpose**: Frontend queries this endpoint to determine if location validation is required

**Request**: GET `/api/admin/attendance/check-restrictions`

**Response**:
```json
{
  "hasGeoRestriction": boolean,
  "hasIPRestriction": boolean,
  "requiresLocation": boolean
}
```

**Logic**:
1. Authenticates user via Bearer token
2. Retrieves employee record
3. Queries `employee_restrictions` table
4. Returns restriction status to frontend

---

### 4. **Enhanced Check-In API** (`src/app/api/admin/attendance/checkin/route.ts`)

**Purpose**: Validates employee restrictions and records check-in

**Enhanced Features**:
- Checks for employee restrictions before processing
- For IP restrictions: Validates client IP against allowed ranges
- For GEO restrictions: Validates coordinates using Haversine formula
- Returns proper error codes for frontend handling
- Records `hasGeoRestriction` flag (for frontend awareness)

**Request**: POST `/api/admin/attendance/checkin`
```json
{
  "timestamp": "2025-11-20T10:30:00.000Z",
  "latitude": 40.7128,        // Optional, required if GEO
  "longitude": -74.0060       // Optional, required if GEO
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Checked in successfully (On Time)",
  "attendance": { ... }
}
```

**Response (Error)**:
```json
{
  "error": "You are outside the allowed location to check-in.",
  "code": "GEO_OUTSIDE"
}
```

---

### 5. **Dashboard Integration** (`src/app/admin/dashboard/page.tsx`)

**Modifications**:
1. Added `CheckInDialog` component import
2. Added state variables:
   - `checkInDialogOpen`: Dialog visibility toggle
   - `requiresGeo`: Whether GEO restriction applies
3. Added function `checkEmployeeRestrictions()`:
   - Queries restriction endpoint on load
   - Updates `requiresGeo` state
4. Modified `handleCheckIn()`:
   - Opens dialog instead of direct API call
5. Created `handleCheckInSubmit()`:
   - Performs actual check-in with location data
   - Handles errors and displays appropriate alerts
   - Updates dashboard on success
6. Added `<CheckInDialog />` component to JSX

---

## API Validation Flow

### IP Validation Flow
```
1. Employee clicks Check In
2. CheckInDialog opens
3. Dialog sends check-in request with timestamp only
4. Server retrieves employee restrictions
5. If IP restriction exists:
   - Extract client IP from request headers
   - Validate against allowed IP list
   - If valid: Allow check-in
   - If invalid: Return { code: 'IP_NOT_ALLOWED', error: '...' }
6. Dialog receives error and displays: "Access denied..."
```

### GEO Validation Flow
```
1. Employee clicks Check In
2. CheckInDialog detects requiresGeo = true
3. Requests browser geolocation permission
4. If permission granted:
   - Collects latitude/longitude
   - Displays in dialog
   - Sends check-in request with coordinates
5. Server validates coordinates:
   - Calculate distance using Haversine formula
   - Compare against allowed radius
   - If within zone: Allow check-in
   - If outside zone: Return { code: 'GEO_OUTSIDE', error: '...' }
6. If permission denied:
   - Dialog displays: "GPS Permission Denied..."
```

---

## User Experience Flow

### Scenario 1: Employee with NO Restrictions
```
Click "Check In" 
  ↓
Dialog: "Click the button below to check in."
  ↓
Click "Check In" button
  ↓
Loader: "Validating your location…"
  ↓
Success: "Check-in Successful"
  ↓
Dialog auto-closes
  ↓
Dashboard updates with check-in time
```

### Scenario 2: Employee with GEO Restriction (Authorized Location)
```
Click "Check In"
  ↓
Dialog: "Your location will be verified during check-in."
  ↓
Click "Check In" button
  ↓
GPS permission prompt appears
  ↓
User approves GPS
  ↓
Loader: "Validating your location…" + shows coordinates
  ↓
Success: "Check-in Successful"
  ↓
Dashboard updates
```

### Scenario 3: Employee with GEO Restriction (Outside Zone)
```
Click "Check In"
  ↓
GPS permission prompt
  ↓
User approves GPS
  ↓
Loader: "Validating your location…"
  ↓
Error: "Location Not Allowed - You are outside the allowed location to check-in."
  ↓
User can click "Check In" again or "Cancel"
```

### Scenario 4: Employee Denies GPS Permission
```
Click "Check In"
  ↓
GPS permission prompt
  ↓
User denies/cancels
  ↓
Error: "GPS Permission Denied - Please enable GPS to check-in from allowed location."
  ↓
Can retry or cancel
```

---

## Error Messages - Complete List

All error messages are displayed in a user-friendly format within the dialog:

1. **"Access Denied. You are not in the allowed IP range."**
   - Shown when employee's IP doesn't match allowed IPs

2. **"You are outside the allowed location to check-in."**
   - Shown when GPS coordinates are outside allowed geofence

3. **"Please enable GPS to check-in from allowed location."**
   - Shown when GPS permission is denied

4. **"Unable to validate your location. Please try again."**
   - Shown when GPS data is unavailable or missing

5. **"Location validation took too long. Please try again."**
   - Shown if GPS request times out (15-second limit)

6. **"Unable to determine your IP address. Please check your connection."**
   - Shown when server can't extract client IP

---

## Technical Implementation Details

### Geolocation API Usage
- **Method**: `navigator.geolocation.getCurrentPosition()`
- **Accuracy**: High accuracy enabled
- **Timeout**: 10 seconds
- **Max Age**: 0 (fresh data only)
- **Overall Timeout**: 15 seconds (dialog-level)

### Distance Calculation
- **Formula**: Haversine formula for spherical Earth
- **Radius**: 6,371 km (Earth's mean radius)
- **Output**: Distance in meters
- **Comparison**: Client distance <= Allowed radius

### IP Validation
- **Supported**: IPv4 addresses and CIDR notation
- **Examples**: 
  - Exact: `192.168.1.100`
  - Range: `192.168.1.0/24`
- **Extraction**: Headers checked in order:
  1. `X-Forwarded-For`
  2. `CF-Connecting-IP` (Cloudflare)
  3. Direct socket connection
  4. Request IP property

---

## Database Schema Relations

```
employee_restrictions
├── id (UUID)
├── employee_id (FK → employees.id)
├── restriction_type (VARCHAR: 'IP' | 'GEO')
├── restriction_id (FK → ip_restrictions.id | geo_restrictions.id)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

ip_restrictions
├── id (UUID)
├── title (VARCHAR)
├── allowed_ips (JSONB array)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

geo_restrictions
├── id (UUID)
├── title (VARCHAR)
├── latitude (NUMERIC)
├── longitude (NUMERIC)
├── radius_meters (INTEGER)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

---

## Testing Checklist

- [ ] Check-in with no restrictions (IP or GEO)
- [ ] Check-in with IP restriction from authorized IP
- [ ] Check-in with IP restriction from unauthorized IP
- [ ] Check-in with GEO restriction from authorized location
- [ ] Check-in with GEO restriction from outside zone
- [ ] GPS permission denied scenario
- [ ] GPS timeout scenario (> 15 seconds)
- [ ] Network error handling
- [ ] Dialog close/cancel functionality
- [ ] Retry after failed check-in
- [ ] Auto-close on success
- [ ] Dashboard refresh after check-in
- [ ] Error messages display correctly
- [ ] Loading spinner animates
- [ ] Mobile responsiveness

---

## Notes

- All timestamps are in ISO 8601 format
- Time zone handling: Server uses current server time
- GPS coordinates are valid for immediate use (maximumAge: 0)
- Check-in dialog is modal (backdrop prevents other clicks)
- Error codes are standardized for consistent frontend handling
- Type safety: Using TypeScript throughout
- Accessibility: Dialog has proper focus management and close button

