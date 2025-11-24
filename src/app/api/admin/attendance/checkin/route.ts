// app/api/admin/attendance/checkin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { attendance, employees, attendanceSettings, employeeRestrictions, ipRestrictions, geoRestrictions } from '@/lib/database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/utils';
import { matchesAllowedIP, extractClientIP } from '@/lib/restrictions/ip-validator';
import { isWithinGeoZone, haversineDistance } from '@/lib/restrictions/geo-validator';



export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { timestamp, latitude, longitude } = await req.json();
    if (!timestamp) {
      return NextResponse.json({ error: 'Timestamp is required' }, { status: 400 });
    }

    const checkInTime = new Date(timestamp);
    const today = checkInTime.toISOString().split('T')[0];

    // Get employee record (support both userId and id)
    const userId = decoded.userId || decoded.id;
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, userId))
      .limit(1);

    if (!employee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    // ===== IP/GEO RESTRICTION VALIDATION =====
    // Fetch all restrictions assigned to this employee
    const assigned = await db
      .select({ id: employeeRestrictions.id, restriction_type: employeeRestrictions.restrictionType, restriction_id: employeeRestrictions.restrictionId })
      .from(employeeRestrictions)
      .where(eq(employeeRestrictions.employeeId, employee.id));

    // No restrictions assigned => allow check-in
    if (!assigned || assigned.length === 0) {
      // proceed with attendance creation
    } else {
      // Split assigned into IP and GEO arrays
      const ipAssigned = assigned.filter((r: any) => r.restriction_type === 'IP').map((r: any) => r.restriction_id);
      const geoAssigned = assigned.filter((r: any) => r.restriction_type === 'GEO').map((r: any) => r.restriction_id);

      // Evaluate IP check if any IP restrictions assigned
      let ipOk = true;
      let clientIP: string | null = null;
      let ipDebugRows: any[] = [];
      if (ipAssigned.length > 0) {
        clientIP = extractClientIP(req);
        if (!clientIP) {
          ipOk = false;
        } else {
          // fetch allowed IP lists
          const ipRows = await db
            .select({ id: ipRestrictions.id, allowedIps: ipRestrictions.allowedIps })
            .from(ipRestrictions)
            .where(sql`ip_restrictions.id = ANY(${ipAssigned})`);
          ipDebugRows = ipRows as any[];
          // if any assigned restriction allows the client IP, ipOk = true
          ipOk = ipRows.some((r: any) => matchesAllowedIP(clientIP as string, r.allowedIps || []));
        }
      }

      // Evaluate GEO check if any GEO restrictions assigned
      let geoOk = true;
      let matchedZoneId: number | null = null;
      let matchedDistanceMeters: number | null = null;
      let geoInvalidCoords = false;

      if (geoAssigned.length > 0) {
        // Parse and validate numeric latitude/longitude
        const latNum = latitude === undefined ? undefined : Number(latitude);
        const lonNum = longitude === undefined ? undefined : Number(longitude);

        const coordsMissing = latNum === undefined || lonNum === undefined;
        const coordsInvalid = !coordsMissing && (!isFinite(latNum as number) || !isFinite(lonNum as number) || (latNum as number) < -90 || (latNum as number) > 90 || (lonNum as number) < -180 || (lonNum as number) > 180);

        if (coordsMissing || coordsInvalid) {
          geoOk = false;
          geoInvalidCoords = true;
        } else {
          const geoRows = await db
            .select({ id: geoRestrictions.id, latitude: geoRestrictions.latitude, longitude: geoRestrictions.longitude, radiusMeters: geoRestrictions.radiusMeters })
            .from(geoRestrictions)
            .where(sql`geo_restrictions.id = ANY(${geoAssigned})`);
          const clientCoord = { latitude: latNum as number, longitude: lonNum as number };

          // geoOk if any geo restriction contains the client. Also capture matched zone and distance for dev debugging.
          geoOk = geoRows.some((z: any) => {
            const zoneLat = Number(z.latitude);
            const zoneLon = Number(z.longitude);
            const zoneRad = Number(z.radiusMeters);
            const inside = isWithinGeoZone(clientCoord, { latitude: zoneLat, longitude: zoneLon }, zoneRad);
            if (inside && matchedZoneId === null) {
              matchedZoneId = z.id;
              try {
                matchedDistanceMeters = haversineDistance(clientCoord, { latitude: zoneLat, longitude: zoneLon });
              } catch (e) {
                matchedDistanceMeters = null;
              }
            }
            return inside;
          });
        }
      }

      // Apply final rules (combined logic)
      const dev = process.env.NODE_ENV !== 'production';

      if (ipAssigned.length > 0 && geoAssigned.length > 0) {
        // Both assigned: require both to pass
        if (!ipOk) {
          const debug: any = dev ? { clientIP, ipAssigned, ipDebugRows } : undefined;
          return NextResponse.json({ error: 'You are not in the allowed IP range', code: 'IP_NOT_ALLOWED', debug }, { status: 403 });
        }
        if (!geoOk) {
          const debug: any = dev ? { clientIP, coords: { latitude, longitude }, matchedZoneId, distanceMeters: matchedDistanceMeters } : undefined;
          return NextResponse.json({ error: 'You are outside the allowed location radius', code: 'GEO_OUTSIDE', debug }, { status: 403 });
        }
      } else if (ipAssigned.length > 0) {
        // Only IP assigned
        if (!ipOk) {
          const debug: any = dev ? { clientIP, ipAssigned, ipDebugRows } : undefined;
          return NextResponse.json({ error: 'You are not in the allowed IP range', code: 'IP_NOT_ALLOWED', debug }, { status: 403 });
        }
      } else if (geoAssigned.length > 0) {
        // Only GEO assigned
        if (!geoOk) {
          const debug: any = dev ? { clientIP, coords: { latitude, longitude }, matchedZoneId, distanceMeters: matchedDistanceMeters } : undefined;
          if (geoInvalidCoords) {
            return NextResponse.json({ error: 'Please enable GPS to check-in from allowed location.', code: 'GEO_MISSING', debug }, { status: 400 });
          }
          return NextResponse.json({ error: 'You are outside the allowed location radius', code: 'GEO_OUTSIDE', debug }, { status: 403 });
        }
      }
    }
    // ===== END IP/GEO VALIDATION =====

    // Get attendance settings
    const [settings] = await db.select().from(attendanceSettings).limit(1);
    if (!settings) {
      return NextResponse.json({ error: 'Attendance settings not configured' }, { status: 500 });
    }

    // Check if already checked in today
    const [existingRecord] = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, employee.id),
          eq(attendance.date, today)
        )
      )
      .limit(1);

    if (existingRecord && existingRecord.checkIn) {
      return NextResponse.json(
        {
          error: 'Already checked in today',
          attendance: existingRecord,
        },
        { status: 400 }
      );
    }

    // Parse check-in settings times
    const [checkInStartHour, checkInStartMinute] = settings.checkInStart
      .toString()
      .split(':')
      .map(Number);
    const [checkInEndHour, checkInEndMinute] = settings.checkInEnd
      .toString()
      .split(':')
      .map(Number);

    const checkInStartTotalMinutes = checkInStartHour * 60 + checkInStartMinute;
    const checkInEndTotalMinutes = checkInEndHour * 60 + checkInEndMinute;

    // Get actual check-in time in minutes
    const checkInHours = checkInTime.getHours();
    const checkInMinutes = checkInTime.getMinutes();
    const checkInTotalMinutes = checkInHours * 60 + checkInMinutes;

    // Determine check-in status according to specifications
    let status = 'present'; // Default to present (On Time)
    let lateMinutes = 0;

    if (checkInTotalMinutes < checkInStartTotalMinutes) {
      // Check-in happens before Check-in Start time - EARLY
      // Store negative value to indicate early, or use a flag
      status = 'early';
      lateMinutes = checkInStartTotalMinutes - checkInTotalMinutes; // Store as positive but indicate early via status
    } else if (checkInTotalMinutes > checkInEndTotalMinutes) {
      // Check-in happens after Check-in End time - LATE
      status = 'late';
      lateMinutes = checkInTotalMinutes - checkInEndTotalMinutes;
    }
    // else: Check-in within Check-in Start-End range = On Time (present)

    // Create or update attendance record
    if (existingRecord) {
      const [updated] = await db
        .update(attendance)
        .set({
          checkIn: checkInTime,
          status,
          lateMinutes,
          updatedAt: new Date(),
        })
        .where(eq(attendance.id, existingRecord.id))
        .returning();

      const statusMsg = status === 'early' 
        ? `Early by ${lateMinutes} minutes`
        : status === 'late'
        ? `Late by ${lateMinutes} minutes`
        : 'On Time';

      return NextResponse.json({
        success: true,
        message: `Checked in successfully (${statusMsg})`,
        attendance: updated,
      });
    } else {
      const [newRecord] = await db
        .insert(attendance)
        .values({
          employeeId: employee.id,
          date: today,
          checkIn: checkInTime,
          status,
          lateMinutes,
          workHours: '0',
        })
        .returning();

      const statusMsg = status === 'early' 
        ? `Early by ${lateMinutes} minutes`
        : status === 'late'
        ? `Late by ${lateMinutes} minutes`
        : 'On Time';

      return NextResponse.json({
        success: true,
        message: `Checked in successfully (${statusMsg})`,
        attendance: newRecord,
      });
    }
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check in',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
