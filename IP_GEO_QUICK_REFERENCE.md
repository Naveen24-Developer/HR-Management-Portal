// IP_GEO_QUICK_REFERENCE.md - Implementation Quick Start

# IP & Geo Restriction - Quick Reference Guide

## What Was Implemented

### 1. Database (SQL Migration)
**File**: `drizzle/0008_add_ip_geo_restrictions.sql`

Three new tables:
- `ip_restrictions` - Stores allowed IP ranges
- `geo_restrictions` - Stores office location zones
- `employee_restrictions` - Links employees to restrictions

### 2. Validation Libraries
**Files**: 
- `src/lib/restrictions/ip-validator.ts` - IP/CIDR validation & matching
- `src/lib/restrictions/geo-validator.ts` - Haversine distance & geo zone checks

### 3. Backend APIs
**Files**:
- `src/app/api/admin/security/ip-restrictions/route.ts` - Create/list IP restrictions
- `src/app/api/admin/security/geo-restrictions/route.ts` - Create/list Geo restrictions
- `src/app/api/admin/security/assign/route.ts` - Assign restrictions to employees
- `src/app/api/admin/attendance/checkin/route.ts` - Enhanced with validation

### 4. Frontend UI
**File**: `src/app/admin/settings/page.tsx`

New Security tab with forms:
- Create IP Restriction
- Create Geo Restriction
- Assign Employee to Restriction

### 5. Test Suite
**Files**:
- `__tests__/lib/restrictions/ip-validator.test.ts` - 30+ IP validation tests
- `__tests__/lib/restrictions/geo-validator.test.ts` - 40+ Geo validation tests
- `__tests__/lib/restrictions/validation.integration.test.ts` - Real-world scenarios

---

## Quick Setup Steps

### 1. Run Database Migration
```bash
npm run db:migrate
```

This creates the three new tables in your PostgreSQL database.

### 2. Verify API Endpoints
```bash
# List IP restrictions (should return empty initially)
curl -X GET http://localhost:9006/api/admin/security/ip-restrictions \
  -H "Authorization: Bearer <admin-token>"

# List Geo restrictions (should return empty initially)
curl -X GET http://localhost:9006/api/admin/security/geo-restrictions \
  -H "Authorization: Bearer <admin-token>"
```

### 3. Create a Test Restriction
```bash
# Create office IP restriction
curl -X POST http://localhost:9006/api/admin/security/ip-restrictions \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Office Network",
    "ips": ["192.168.1.0/24"]
  }'
```

### 4. Access Admin UI
```
http://localhost:9006/admin/settings → Security tab
```

---

## IP Validation Flow

```
Employee checks in
    ↓
System extracts client IP from request
    ↓
System queries employee_restrictions for IP restriction
    ↓
System gets allowed IPs from ip_restrictions table
    ↓
System matches client IP against allowed IPs:
  - Exact match? (e.g., 192.168.1.100)
  - In CIDR range? (e.g., 192.168.1.0/24)
    ↓
  ✅ If match → Allow check-in
  ❌ If no match → Block with IP_NOT_ALLOWED error
```

**Error Response (403)**:
```json
{
  "error": "Access denied. You are not in the allowed IP range. Check-in failed.",
  "code": "IP_NOT_ALLOWED"
}
```

---

## Geo Validation Flow

```
Employee checks in with latitude/longitude
    ↓
System queries employee_restrictions for GEO restriction
    ↓
System gets zone center & radius from geo_restrictions table
    ↓
System calculates distance using Haversine formula:
  Distance = sqrt((lat2-lat1)² + (lng2-lng1)²) × Earth's radius
    ↓
  ✅ If distance ≤ radius → Allow check-in
  ❌ If distance > radius → Block with GEO_OUTSIDE error
```

**Error Response (403)**:
```json
{
  "error": "You are outside the allowed location to check-in.",
  "code": "GEO_OUTSIDE"
}
```

---

## IP Validation Examples

### Example 1: Single Office Network
```
Admin creates restriction:
  Title: "Main Office"
  IPs: ["192.168.1.0/24"]

Employee at office (IP: 192.168.1.50) → ✅ ALLOWED
Employee at home (IP: 203.0.113.50) → ❌ BLOCKED
```

### Example 2: Office + VPN
```
Admin creates restriction:
  Title: "Office or VPN"
  IPs: ["192.168.0.0/16", "10.0.0.0/8"]

Employee at office (IP: 192.168.50.100) → ✅ ALLOWED
Employee on VPN (IP: 10.100.200.50) → ✅ ALLOWED
Employee at home (IP: 203.0.113.50) → ❌ BLOCKED
```

### Example 3: Specific Servers Only
```
Admin creates restriction:
  Title: "Secure Workstations"
  IPs: ["192.168.1.10", "192.168.1.11", "192.168.1.12"]

Employee on allowed server (192.168.1.10) → ✅ ALLOWED
Employee on different server (192.168.1.50) → ❌ BLOCKED
```

---

## Geo Validation Examples

### Example 1: 500m Office Zone
```
Admin creates restriction:
  Title: "Headquarters Zone"
  Latitude: 11.0679 (Bangalore)
  Longitude: 77.5432 (Bangalore)
  Radius: 500 meters

Employee in building (11.0679, 77.5432) → ✅ ALLOWED (0m away)
Employee in parking (11.0700, 77.5450) → ✅ ALLOWED (~300m away)
Employee at cafe (11.0779, 77.5532) → ❌ BLOCKED (~1.2km away)
```

### Example 2: 10km City Zone
```
Admin creates restriction:
  Title: "New York Operations"
  Latitude: 40.7128 (NYC)
  Longitude: -74.0060 (NYC)
  Radius: 10000 meters (10km)

Employee uptown (40.7850, -73.9760) → ✅ ALLOWED (~8km away)
Employee in Newark (40.7357, -74.1724) → ❌ BLOCKED (~20km away)
```

---

## Testing Validation

### Run All Tests
```bash
npm test -- __tests__/lib/restrictions/
```

### Run Specific Test Suite
```bash
# IP validation tests
npm test -- ip-validator.test.ts

# Geo validation tests
npm test -- geo-validator.test.ts

# Integration tests
npm test -- validation.integration.test.ts
```

### Manual Test: Check-in with IP Validation
```bash
curl -X POST http://localhost:9006/api/admin/attendance/checkin \
  -H "Authorization: Bearer <employee-token>" \
  -H "X-Forwarded-For: 192.168.1.100" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-11-20T09:30:00Z"
  }'
```

### Manual Test: Check-in with Geo Validation
```bash
curl -X POST http://localhost:9006/api/admin/attendance/checkin \
  -H "Authorization: Bearer <employee-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-11-20T09:30:00Z",
    "latitude": 11.0679,
    "longitude": 77.5432
  }'
```

---

## Common CIDR Ranges

```
Private Networks:
  10.0.0.0/8              - Large private network
  172.16.0.0/12           - Private network (default for Docker)
  192.168.0.0/16          - Home/small office networks

Common VPN Ranges:
  10.0.0.0/8              - Most VPNs
  172.31.0.0/16           - Some corporate VPNs

Specific Network Masks:
  /8   = 16,777,216 hosts
  /12  = 1,048,576 hosts
  /16  = 65,536 hosts
  /24  = 256 hosts (single office network)
  /32  = 1 host (specific machine)
```

---

## Common City Coordinates

```
New York:      40.7128°N, 74.0060°W
San Francisco: 37.7749°N, 122.4194°W
London:        51.5074°N, 0.1278°W
Tokyo:         35.6762°N, 139.6917°E
Sydney:        -33.8688°S, 151.2093°E
Bangalore:     11.0679°N, 77.5432°E
Delhi:         28.7041°N, 77.1025°E
Dubai:         25.2048°N, 55.2708°E
```

---

## IP Extraction from Headers

### Nginx Reverse Proxy
```
Header: X-Forwarded-For: 203.0.113.50, 192.168.1.1
Extracted: 203.0.113.50 (client IP)
```

### Cloudflare CDN
```
Header: CF-Connecting-IP: 203.0.113.50
Extracted: 203.0.113.50 (client IP)
```

### Direct Connection
```
Socket: remoteAddress = 203.0.113.50
Extracted: 203.0.113.50 (client IP)
```

---

## Distance Reference

Approximate distances calculated by Haversine formula:

```
Same location:               0 meters
Different floors (building):  5-20 meters
Within same office:          20-100 meters
Parking lot nearby:          50-200 meters
Adjacent building:           200-500 meters
Same street block:           50-150 meters
Same neighborhood:           500-2000 meters
Different neighborhood:      2-5 km
Same city:                   5-20 km
Different city:              100+ km
Different country:           1000+ km
```

---

## File Structure

```
src/
├── lib/restrictions/
│   ├── ip-validator.ts          ← IP validation logic
│   └── geo-validator.ts         ← Geo validation logic
│
├── app/api/admin/security/
│   ├── ip-restrictions/
│   │   └── route.ts             ← IP restriction CRUD
│   ├── geo-restrictions/
│   │   └── route.ts             ← Geo restriction CRUD
│   └── assign/
│       └── route.ts             ← Employee assignment
│
├── app/admin/settings/
│   └── page.tsx                 ← Admin UI forms
│
└── app/api/admin/attendance/
    └── checkin/
        └── route.ts             ← Enhanced check-in

drizzle/
└── 0008_add_ip_geo_restrictions.sql  ← DB migration

__tests__/lib/restrictions/
├── ip-validator.test.ts         ← 30+ IP tests
├── geo-validator.test.ts        ← 40+ Geo tests
└── validation.integration.test.ts ← Real-world scenarios

Documentation:
├── VALIDATION_LOGIC.md          ← Detailed explanation
└── IP_GEO_QUICK_REFERENCE.md    ← This file
```

---

## Troubleshooting

### IP Validation Not Working
1. Check employee has a restriction assigned: `employee_restrictions` table
2. Verify restriction exists: `ip_restrictions` table
3. Ensure `allowed_ips` column has valid IP/CIDR
4. Check `X-Forwarded-For` header is being sent

### Geo Validation Not Working
1. Verify employee has geo restriction assigned
2. Check coordinates are valid: lat (-90 to 90), lng (-180 to 180)
3. Ensure frontend sends `latitude` & `longitude` in request
4. Verify radius > 0

### Tests Failing
1. Run `npm test -- __tests__/lib/restrictions/` to see detailed errors
2. Check that validation functions exist in `src/lib/restrictions/`
3. Ensure TypeScript compiles: `npm run typecheck`

---

## Next Steps

1. ✅ Run migration: `npm run db:migrate`
2. ✅ Start dev server: `npm run dev`
3. ✅ Test UI: Open `/admin/settings` → Security tab
4. ✅ Create test restrictions via UI or API
5. ✅ Assign restrictions to test employees
6. ✅ Test check-in validation with curl commands
7. ✅ Run test suite: `npm test -- __tests__/lib/restrictions/`
8. ✅ Deploy to production

---

## Support & Documentation

- **Detailed Explanation**: See `VALIDATION_LOGIC.md`
- **Test Examples**: See `__tests__/lib/restrictions/*.test.ts`
- **API Documentation**: See endpoint route files in `src/app/api/admin/security/`
