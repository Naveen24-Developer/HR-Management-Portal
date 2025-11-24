# Check-In Location Validation - Quick Reference

## Quick Setup Guide

### For Developers
1. **CheckInDialog Component**: Import and use in any page
   ```tsx
   import CheckInDialog from '@/components/attendance/CheckInDialog';
   
   <CheckInDialog
     isOpen={dialogOpen}
     onClose={() => setDialogOpen(false)}
     onSubmit={handleSubmit}
     requiresGeo={needsGeo}
   />
   ```

2. **Check Employee Restrictions**:
   ```tsx
   const response = await fetch('/api/admin/attendance/check-restrictions', {
     headers: { Authorization: `Bearer ${token}` }
   });
   const { requiresLocation } = await response.json();
   ```

3. **Submit Check-In**:
   ```tsx
   await fetch('/api/admin/attendance/checkin', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       Authorization: `Bearer ${token}`,
     },
     body: JSON.stringify({
       timestamp: new Date().toISOString(),
       latitude: coords?.latitude,
       longitude: coords?.longitude,
     }),
   });
   ```

---

## Error Codes & Responses

### IP Validation
```
Code: IP_NOT_ALLOWED
Status: 403
Message: "Access denied. You are not in the allowed IP range. Check-in failed."

Code: IP_UNKNOWN
Status: 400
Message: "Unable to determine your IP address"
```

### GEO Validation
```
Code: GEO_OUTSIDE
Status: 403
Message: "You are outside the allowed location to check-in."

Code: GEO_MISSING
Status: 400
Message: "Location (latitude/longitude) is required for geo-restricted check-in"
```

### GPS Issues
```
Code: GPS_PERMISSION_DENIED
Message: "Please enable GPS to check-in from allowed location."

Code: LOCATION_UNAVAILABLE
Message: "Unable to validate your location. Please try again."

Code: TIMEOUT
Message: "Location validation took too long. Please try again."
```

---

## User Alert Messages (What Employees See)

| Scenario | Alert Title | Message |
|----------|------------|---------|
| IP outside range | Access Denied | Access denied. You are not in the allowed IP range. |
| Outside GEO zone | Location Not Allowed | You are outside the allowed location to check-in. |
| GPS permission denied | GPS Permission Denied | Please enable GPS to check-in from allowed location. |
| GPS unavailable | Location Required | Unable to validate your location. Please try again. |
| GPS timeout | Request Timeout | Location validation took too long. Please try again. |
| Network error | Network Error | Unable to determine your IP address. Please check your connection. |

---

## File Reference

| File | Purpose |
|------|---------|
| `CheckInDialog.tsx` | Modal dialog for check-in flow |
| `attendance-errors.ts` | Error mapping & utilities |
| `check-restrictions/route.ts` | API endpoint to check restrictions |
| `checkin/route.ts` | API endpoint for validation & check-in |
| `dashboard/page.tsx` | Dashboard with integrated dialog |

---

## Key Functions

### `CheckInDialog`
```typescript
// GPS request
requestGeoLocation(): Promise<GeoCoord>

// Handle check-in
handleCheckIn(): Promise<void>

// Close dialog
handleClose(): void
```

### Error Utilities
```typescript
// Extract error from response
extractErrorInfo(error: any): { code, message, details }

// Get user-friendly alert
getErrorAlert(code: string): ErrorAlert

// Format error for display
formatErrorAlert(error: any): ErrorAlert
```

---

## API Endpoints

### GET `/api/admin/attendance/check-restrictions`
**Purpose**: Check if employee has GEO/IP restrictions
**Returns**:
- `hasGeoRestriction: boolean`
- `hasIPRestriction: boolean`
- `requiresLocation: boolean`

### POST `/api/admin/attendance/checkin`
**Purpose**: Validate & record check-in
**Body**:
```json
{
  "timestamp": "ISO datetime",
  "latitude": 40.7128,
  "longitude": -74.0060
}
```
**Returns**: Success object or error with code

---

## Common Tasks

### Add Check-In to New Page
1. Import `CheckInDialog`
2. Add state: `const [openCheckIn, setOpenCheckIn] = useState(false);`
3. Add state: `const [requiresGeo, setRequiresGeo] = useState(false);`
4. Call check-restrictions endpoint on mount
5. Add dialog to JSX
6. Implement `handleCheckInSubmit` function

### Handle New Error Code
1. Add to `ERROR_ALERT_MAP` in `attendance-errors.ts`
2. Provide title and message
3. Dialog will automatically handle display

### Change GPS Timeout
Edit in `CheckInDialog.tsx`:
```typescript
const timeoutId = setTimeout(() => {
  reject({
    code: 'TIMEOUT',
    message: 'Location request timed out.',
  });
}, 15000); // Change this value (milliseconds)
```

### Change Geolocation Accuracy
Edit in `CheckInDialog.tsx`:
```typescript
navigator.geolocation.getCurrentPosition(
  ...,
  {
    enableHighAccuracy: true,  // Set to false for battery saving
    timeout: 10000,            // Change request timeout
    maximumAge: 0,             // 0 = fresh data only
  }
);
```

---

## Browser Compatibility

- ✅ Chrome/Edge (Windows, macOS, Android)
- ✅ Firefox
- ✅ Safari (macOS, iOS)
- ⚠️ Requires HTTPS (except localhost)
- ⚠️ GPS requires user permission

---

## Database Queries

### Check Employee Restrictions
```sql
SELECT id, restriction_type, restriction_id 
FROM employee_restrictions 
WHERE employee_id = $1 
LIMIT 1;
```

### Get IP Restriction Details
```sql
SELECT allowed_ips 
FROM ip_restrictions 
WHERE id = $1 
LIMIT 1;
```

### Get GEO Restriction Details
```sql
SELECT latitude, longitude, radius_meters 
FROM geo_restrictions 
WHERE id = $1 
LIMIT 1;
```

---

## Debugging

### Enable Console Logs
All API calls and geolocation attempts log to browser console.

### Check IP Extraction
IP is logged in error response:
```json
{
  "error": "...",
  "code": "IP_NOT_ALLOWED",
  "clientIP": "192.168.1.100"
}
```

### Check GEO Validation
Distance is logged in error response:
```json
{
  "error": "...",
  "code": "GEO_OUTSIDE",
  "distance": 1250
}
```

### Test GPS Locally
- Use browser DevTools Sensors tab
- Set custom coordinates
- Test with various locations

---

## Security Notes

- ✅ Token validation on all endpoints
- ✅ Role-based access control
- ✅ IP extraction handles proxy/CDN scenarios
- ✅ GPS data used immediately (no storage)
- ✅ Error messages don't expose sensitive info
- ✅ Rate limiting recommended on production

---

## Performance

- Geolocation: ~2-5 seconds (depends on device/signal)
- API call: ~100-500ms
- Total check-in flow: ~3-7 seconds
- Dialog renders instantly
- No database heavy operations

