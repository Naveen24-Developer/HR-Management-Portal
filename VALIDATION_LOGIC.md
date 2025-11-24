// VALIDATION_LOGIC.md - Core IP/Geo Restriction Validation Guide

# IP & Geo Restriction Validation Logic

## Overview

The IP/Geo restriction feature provides two complementary validation mechanisms to control where employees can check in:

1. **IP-based validation**: Restricts check-ins to specific IP addresses or networks
2. **Geo-based validation**: Restricts check-ins to specific geographic locations

Both can be used independently or combined for enhanced security.

---

## IP Validation Logic

### How It Works

1. **Extract Client IP from Request**
   - Server extracts the client's public IP address from the incoming request
   - Tries multiple headers in order of preference:
     - `X-Forwarded-For` (for proxies/CDNs)
     - `CF-Connecting-IP` (for Cloudflare)
     - Direct socket connection
     - `req.ip` fallback

2. **Match Against Allowed IPs**
   - Client IP is compared against the employee's allowed IP list
   - Supports two formats:
     - **Exact IP**: `192.168.1.100`
     - **CIDR range**: `192.168.1.0/24` (192.168.1.0 to 192.168.1.255)

3. **Decision**
   - ✅ If IP matches → Check-in allowed
   - ❌ If IP doesn't match → Check-in blocked with `IP_NOT_ALLOWED` error

### IP Address Format

#### Exact IPv4 Address
Format: `XXX.XXX.XXX.XXX` where each segment is 0-255
```
Examples:
- 192.168.1.100 (office workstation)
- 10.0.0.1 (VPN gateway)
- 203.0.113.50 (mobile hotspot)
```

#### CIDR Notation
Format: `NETWORK.ADDRESS/MASK_BITS` where mask_bits is 0-32
```
Examples:
- 192.168.1.0/24 → Covers 192.168.1.0 to 192.168.1.255 (256 addresses)
- 10.0.0.0/8 → Covers 10.0.0.0 to 10.255.255.255 (16M addresses)
- 172.16.0.0/12 → Covers 172.16.0.0 to 172.31.255.255 (1M addresses)
- 0.0.0.0/0 → Covers all IP addresses (any IP)
```

### Common IP Restriction Scenarios

#### Scenario 1: Office-Only Access
```
Allowed IPs: ["192.168.0.0/16"]
Employee IP: 192.168.1.100
Result: ✅ ALLOWED
```

#### Scenario 2: Office OR VPN Access
```
Allowed IPs: ["192.168.0.0/16", "10.0.0.0/8"]
Employee at office: 192.168.50.100 → ✅ ALLOWED
Employee on VPN: 10.100.200.50 → ✅ ALLOWED
Employee at home: 203.0.113.50 → ❌ BLOCKED
```

#### Scenario 3: Specific Server Access
```
Allowed IPs: ["192.168.1.100", "192.168.1.101", "192.168.1.102"]
Employee on allowed workstation: 192.168.1.100 → ✅ ALLOWED
Employee on different workstation: 192.168.1.50 → ❌ BLOCKED
```

### IP Extraction Examples

#### Request Behind Reverse Proxy (Nginx)
```
Headers:
X-Forwarded-For: 203.0.113.50, 192.168.1.10
X-Forwarded-Proto: https

Extracted IP: 203.0.113.50 (first non-private IP)
```

#### Request Behind Cloudflare CDN
```
Headers:
CF-Connecting-IP: 203.0.113.50
X-Forwarded-For: 203.0.113.50

Extracted IP: 203.0.113.50
```

#### Direct Connection
```
Socket connection from: 203.0.113.50
Extracted IP: 203.0.113.50
```

### Validation Code Flow

```typescript
// 1. Extract client IP
const clientIP = extractClientIP(req);
// Result: "203.0.113.50"

// 2. Fetch allowed IPs from restriction
const allowedIPs = ["192.168.1.0/24", "10.0.0.0/8"];

// 3. Check if client IP matches any allowed IP/range
const isAllowed = matchesAllowedIP(clientIP, allowedIPs);
// Checks:
// - Does "203.0.113.50" equal "192.168.1.0"? NO
// - Is "203.0.113.50" in "192.168.1.0/24"? NO
// - Is "203.0.113.50" in "10.0.0.0/8"? NO
// Result: false

// 4. Block check-in if not allowed
if (!isAllowed) {
  return {
    error: "Access denied. You are not in the allowed IP range.",
    code: "IP_NOT_ALLOWED"
  };
}
```

### Important IP Validation Notes

⚠️ **VPN Considerations**
- Users on VPNs will have the VPN's exit IP, not their personal IP
- Add VPN ranges to allowed IPs: `"10.0.0.0/8"`
- Note: Cannot distinguish between legitimate VPN and IP spoofing

⚠️ **NAT/Carrier Networks**
- Mobile carriers use Carrier-Grade NAT (CGN)
- Multiple users share same public IP
- Recommend geo-restriction for mobile workers

⚠️ **ISP Dynamic IPs**
- Home internet IPs change frequently
- Use CIDR ranges if possible: `"203.0.0.0/16"`
- Or use Geo restriction for better reliability

---

## Geo Validation Logic

### How It Works

1. **Get Employee's Geolocation**
   - Frontend requests permission for device geolocation
   - Device (GPS/WiFi) provides latitude and longitude
   - Sent with check-in request

2. **Calculate Distance Using Haversine Formula**
   - Server calculates distance between:
     - Employee's current location (client latitude/longitude)
     - Office location center (restriction center lat/lng)
   - Formula accounts for Earth's spherical shape
   - Returns distance in **meters**

3. **Compare Against Allowed Radius**
   - If distance ≤ radius → Check-in allowed
   - If distance > radius → Check-in blocked

4. **Decision**
   - ✅ If within zone → Check-in allowed
   - ❌ If outside zone → Check-in blocked with `GEO_OUTSIDE` error

### Haversine Formula

The Haversine formula calculates the great-circle distance between two points on Earth:

```
a = sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)
c = 2 * atan2(√a, √(1−a))
d = R * c

Where:
φ = latitude in radians
λ = longitude in radians
R = Earth's radius (6,371,000 meters)
d = distance in meters
```

### Geolocation Format

```
latitude: number    // -90 to +90 degrees
                    // Negative = South, Positive = North
                    // Example: 11.0679 (Bangalore)

longitude: number   // -180 to +180 degrees
                    // Negative = West, Positive = East
                    // Example: 77.5432 (Bangalore)

radius_meters: number  // Zone radius in meters (e.g., 500, 1000)
```

### Real-World Distances

Approximate distances between major cities:

```
NYC to San Francisco: ~4,130 km
Tokyo to Sydney: ~7,800 km
London to Bangalore: ~7,200 km
Paris to Berlin: ~880 km
```

For office buildings:
```
Building floor to floor: ~5 meters
Building to parking lot: ~50-100 meters
Office to nearby cafe: ~500 meters - 1 km
Office to home (adjacent area): ~5-10 km
```

### Common Geo Restriction Scenarios

#### Scenario 1: Office Building Zone (500m radius)
```
Office Location: (11.0679°N, 77.5432°E) - Bangalore
Zone Radius: 500 meters

Employee in building: (11.0679°N, 77.5432°E) → ✅ ALLOWED
Employee in parking: (11.0700°N, 77.5450°E) ~300m → ✅ ALLOWED
Employee at cafe: (11.0779°N, 77.5532°E) ~1.2km → ❌ BLOCKED
Employee at home: (12.9716°N, 77.5946°E) ~190km → ❌ BLOCKED
```

#### Scenario 2: City-Wide Zone (10km radius)
```
City Center: (40.7128°N, -74.0060°W) - NYC
Zone Radius: 10 kilometers

Employee uptown: (40.7850°N, -73.9760°W) ~10km → ✅ ALLOWED
Employee in Newark: (40.7357°N, -74.1724°W) ~20km → ❌ BLOCKED
```

#### Scenario 3: Regional Zone (50km radius)
```
Headquarters: (37.7749°N, -122.4194°W) - San Francisco
Zone Radius: 50 kilometers

Employee in SF: (37.7749°N, -122.4194°W) → ✅ ALLOWED
Employee in Oakland: (37.8044°N, -122.2712°W) ~20km → ✅ ALLOWED
Employee in San Jose: (37.3382°N, -121.8863°W) ~80km → ❌ BLOCKED
```

### Validation Code Flow

```typescript
// 1. Get employee's current coordinates from device
const clientCoord = {
  latitude: 11.0670,
  longitude: 77.5430
};

// 2. Fetch allowed zone center from restriction
const zoneCoord = {
  latitude: 11.0679,
  longitude: 77.5432
};
const radiusMeters = 500;

// 3. Calculate distance using Haversine
const distance = haversineDistance(clientCoord, zoneCoord);
// Calculates based on Earth's curvature
// Result: ~680 meters

// 4. Compare against allowed radius
const isAllowed = distance <= radiusMeters;
// 680 > 500 → false

// 5. Block check-in if outside zone
if (!isAllowed) {
  return {
    error: "You are outside the allowed location to check-in.",
    code: "GEO_OUTSIDE",
    distance: 680
  };
}
```

### Important Geo Validation Notes

⚠️ **GPS Accuracy Limitations**
- GPS accuracy typically 5-10 meters in open areas
- 10-50 meters in urban canyons (between buildings)
- 50-100+ meters indoors or tunnels
- Recommend zone radius ≥ 100 meters

⚠️ **Privacy & Consent**
- Must request explicit user permission for geolocation
- Show privacy policy explaining data usage
- Location data should be used only for check-in validation
- Do not store location history without consent

⚠️ **Location Spoofing**
- Sophisticated users can spoof GPS coordinates
- Recommend IP + Geo combination for security
- Consider requiring certified GPS devices

⚠️ **Time Zone Transitions**
- Geolocation timestamps should include timezone
- Use UTC for all server-side calculations

---

## Combined IP + Geo Validation

### Why Combine Both?

**IP-only weakness**: Can be spoofed if VPN is used
**Geo-only weakness**: GPS can be spoofed, requires device permission

**Combined strength**: Employee must be both on correct IP AND at correct location

### Example: Hybrid Restriction

```
Employee: John
Restrictions:
  - IP: Must be on 192.168.0.0/16 OR 10.0.0.0/8
  - GEO: Must be within 500m of (40.7128°N, -74.0060°W)

Scenario 1: John at office on office network
  - IP: 192.168.1.100 ✅
  - GEO: 100m from center ✅
  - Result: ✅ ALLOWED

Scenario 2: John at office on home network (no VPN)
  - IP: 203.0.113.50 ❌
  - GEO: 100m from center ✅
  - Result: ❌ BLOCKED (IP failed)

Scenario 3: John on VPN but at home
  - IP: 10.50.100.200 ✅
  - GEO: 50km from center ❌
  - Result: ❌ BLOCKED (GEO failed)

Scenario 4: John on VPN at office
  - IP: 10.50.100.200 ✅
  - GEO: 100m from center ✅
  - Result: ✅ ALLOWED
```

### Implementation Logic

```typescript
// Check IP restriction if assigned
if (restriction.type === 'IP') {
  const clientIP = extractClientIP(req);
  const allowedIPs = await getIPRestriction(restriction.id);
  
  if (!matchesAllowedIP(clientIP, allowedIPs)) {
    return { error: "IP_NOT_ALLOWED", statusCode: 403 };
  }
}

// Check Geo restriction if assigned
else if (restriction.type === 'GEO') {
  const { latitude, longitude } = req.body;
  const geoRestriction = await getGeoRestriction(restriction.id);
  
  if (!isWithinGeoZone(
    { latitude, longitude },
    { latitude: geoRestriction.latitude, longitude: geoRestriction.longitude },
    geoRestriction.radius_meters
  )) {
    return { error: "GEO_OUTSIDE", statusCode: 403 };
  }
}

// Both passed → Allow check-in
recordCheckIn(employee.id, timestamp);
```

---

## Error Handling & Messages

### IP Validation Errors

| Code | Message | Solution |
|------|---------|----------|
| `IP_NOT_ALLOWED` | "Access denied. You are not in the allowed IP range. Check-in failed." | Connect to office network or VPN |
| `IP_UNKNOWN` | "Unable to determine your IP address" | Check internet connection |

### Geo Validation Errors

| Code | Message | Solution |
|------|---------|----------|
| `GEO_OUTSIDE` | "You are outside the allowed location to check-in." | Move closer to office location |
| `GEO_MISSING` | "Location (latitude/longitude) is required for geo-restricted check-in" | Enable GPS/location permission |
| `GEO_PERMISSION_DENIED` | "Please enable GPS to check-in from allowed location." | Grant location permission in device settings |

---

## Testing

### Unit Tests

Run validation logic tests:

```bash
npm test -- __tests__/lib/restrictions/ip-validator.test.ts
npm test -- __tests__/lib/restrictions/geo-validator.test.ts
npm test -- __tests__/lib/restrictions/validation.integration.test.ts
```

### Manual Testing with curl

#### Test IP Validation
```bash
# Simulate office IP
curl -X POST http://localhost:9006/api/admin/attendance/checkin \
  -H "Authorization: Bearer <token>" \
  -H "X-Forwarded-For: 192.168.1.100" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-11-20T09:00:00Z"
  }'

# Simulate VPN IP
curl -X POST http://localhost:9006/api/admin/attendance/checkin \
  -H "Authorization: Bearer <token>" \
  -H "X-Forwarded-For: 10.0.0.50" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-11-20T09:00:00Z"
  }'
```

#### Test Geo Validation
```bash
# Inside office zone
curl -X POST http://localhost:9006/api/admin/attendance/checkin \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-11-20T09:00:00Z",
    "latitude": 11.0679,
    "longitude": 77.5432
  }'

# Outside office zone
curl -X POST http://localhost:9006/api/admin/attendance/checkin \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-11-20T09:00:00Z",
    "latitude": 12.9716,
    "longitude": 77.5946
  }'
```

---

## Performance Considerations

### IP Validation
- **Complexity**: O(n) where n = number of allowed IPs
- **Speed**: < 1ms per validation
- **Scalability**: Handles 1000+ CIDR ranges efficiently

### Geo Validation
- **Complexity**: O(1) single distance calculation
- **Speed**: < 5ms per validation
- **Accuracy**: ±100 meters depending on GPS

---

## Security Notes

### IP Validation
- ✅ Protects against unauthorized location access
- ❌ Can be bypassed with VPN/proxy
- Recommendation: Use IP + Geo combination

### Geo Validation
- ✅ Prevents remote check-in abuse
- ❌ Can be spoofed with GPS tools
- Recommendation: Combine with IP validation

### Best Practices
1. Always validate on the server side
2. Don't trust client-provided IP address alone
3. Extract IP from trusted headers (X-Forwarded-For from known proxies)
4. Log all validation failures for auditing
5. Rate-limit repeated validation failures (prevent brute force)
6. Use HTTPS for all check-in requests
7. Combine IP + Geo for maximum security
