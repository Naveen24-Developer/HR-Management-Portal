// app/api/admin/attendance/checkin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { 
  attendance, 
  employees, 
  attendanceSettings, 
  employeeRestrictions, 
  ipRestrictions, 
  geoRestrictions 
} from '@/lib/database/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/utils';
import { matchesAllowedIP, extractClientIP, debugHeaders } from '@/lib/restrictions/ip-validator';
import { isWithinGeoZone, parseCoordinate } from '@/lib/restrictions/geo-validator';
import { calculateCheckInStatus } from '@/lib/utils/attendance-calculator';

export async function POST(req: NextRequest) {
  debugHeaders(req);

  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded: any = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { timestamp, latitude, longitude } = body;
    
    if (!timestamp) {
      return NextResponse.json({ error: 'Timestamp is required' }, { status: 400 });
    }

    const checkInTime = new Date(timestamp);
    if (isNaN(checkInTime.getTime())) {
      return NextResponse.json({ error: 'Invalid timestamp' }, { status: 400 });
    }

    const today = checkInTime.toISOString().split('T')[0];

    // Get employee record
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
    const assignedRestrictions = await db
      .select({
        id: employeeRestrictions.id,
        restrictionType: employeeRestrictions.restrictionType,
        restrictionId: employeeRestrictions.restrictionId,
      })
      .from(employeeRestrictions)
      .where(eq(employeeRestrictions.employeeId, employee.id));

    let restrictionPassed = true;
    let restrictionFailureCode: string | null = null;
    let checkInIp: string | null = null;
    let checkInLatitude: string | null = null;
    let checkInLongitude: string | null = null;

    console.log('Employee restrictions:', assignedRestrictions);

    // If employee has restrictions, validate them
    if (assignedRestrictions.length > 0) {
      const ipRestrictionAssignments = assignedRestrictions.filter(r => r.restrictionType === 'IP');
      const geoRestrictionAssignments = assignedRestrictions.filter(r => r.restrictionType === 'GEO');

      console.log('IP restrictions assigned:', ipRestrictionAssignments);
      console.log('GEO restrictions assigned:', geoRestrictionAssignments);

// Validate IP Restrictions
if (ipRestrictionAssignments.length > 0) {
  checkInIp = extractClientIP(req);
  console.log('Extracted client IP:', checkInIp);
  
  if (!checkInIp) {
    restrictionPassed = false;
    restrictionFailureCode = 'IP_UNKNOWN';
    console.log('IP restriction failed: Could not extract client IP');
  } else {
    const ipRestrictionIds = ipRestrictionAssignments.map(r => r.restrictionId);
    console.log('IP restriction IDs:', ipRestrictionIds);
    
    // Use inArray instead of sql`ANY`
    const allowedIPRecords = await db
      .select({ allowedIps: ipRestrictions.allowedIps })
      .from(ipRestrictions)
      .where(inArray(ipRestrictions.id, ipRestrictionIds));

    console.log('Allowed IP records from DB:', allowedIPRecords);

    // Flatten all allowed IPs from all assigned IP restrictions
    const allAllowedIPs: string[] = [];
    allowedIPRecords.forEach(record => {
      if (Array.isArray(record.allowedIps)) {
        allAllowedIPs.push(...record.allowedIps);
      }
    });

    console.log('All allowed IPs:', allAllowedIPs);
    console.log('Client IP to check:', checkInIp);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    // Check if current IP matches ANY of the allowed IPs
    const ipMatch = matchesAllowedIP(checkInIp, allAllowedIPs);
    console.log('IP match result:', ipMatch);

    if (!ipMatch) {
      // In development mode, show a warning but allow check-in
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: IP restriction would fail, but allowing check-in for testing');
        // Continue with check-in but log the restriction issue
        restrictionPassed = true;
      } else {
        // In production, enforce the restriction
        restrictionPassed = false;
        restrictionFailureCode = 'IP_NOT_ALLOWED';
        console.log('IP restriction failed: IP not in allowed list');
      }
    } else {
      console.log('IP restriction passed');
    }
  }
}

      // Validate GEO Restrictions (only if IP restrictions passed or don't exist)
      if (restrictionPassed && geoRestrictionAssignments.length > 0) {
        console.log('Checking GEO restrictions...');
        
        const geoRestrictionIds = geoRestrictionAssignments.map(r => r.restrictionId);
        
        // FIXED: Use inArray instead of sql`ANY`
        const geoZones = await db
          .select({
            id: geoRestrictions.id,
            latitude: geoRestrictions.latitude,
            longitude: geoRestrictions.longitude,
            radiusMeters: geoRestrictions.radiusMeters,
          })
          .from(geoRestrictions)
          .where(inArray(geoRestrictions.id, geoRestrictionIds));

        console.log('Geo zones from DB:', geoZones);

        // Parse and validate coordinates
        const clientCoord = parseCoordinate(latitude, longitude);
        console.log('Parsed client coordinates:', clientCoord);
        
        if (!clientCoord) {
          restrictionPassed = false;
          restrictionFailureCode = 'GEO_MISSING';
          console.log('GEO restriction failed: Missing or invalid coordinates');
        } else {
          checkInLatitude = clientCoord.latitude.toString();
          checkInLongitude = clientCoord.longitude.toString();
          
          // Check if current location is within ANY of the assigned geo zones
          const geoMatch = geoZones.some(zone => {
            const zoneCoord = {
              latitude: Number(zone.latitude),
              longitude: Number(zone.longitude)
            };
            
            if (isNaN(zoneCoord.latitude) || isNaN(zoneCoord.longitude)) {
              console.log('Invalid zone coordinates:', zone);
              return false;
            }
            
            const radius = Number(zone.radiusMeters);
            if (isNaN(radius) || radius <= 0) {
              console.log('Invalid radius:', zone.radiusMeters);
              return false;
            }
            
            const isWithin = isWithinGeoZone(clientCoord, zoneCoord, radius);
            console.log(`Zone check: client (${clientCoord.latitude}, ${clientCoord.longitude}) vs zone (${zoneCoord.latitude}, ${zoneCoord.longitude}) radius ${radius}m -> ${isWithin}`);
            
            return isWithin;
          });

          console.log('Overall GEO match result:', geoMatch);

          if (!geoMatch) {
            restrictionPassed = false;
            restrictionFailureCode = 'GEO_OUTSIDE';
            console.log('GEO restriction failed: Outside allowed zones');
          } else {
            console.log('GEO restriction passed');
          }
        }
      }
    } else {
      console.log('No restrictions assigned to employee, proceeding with check-in');
    }

    // If restrictions failed, return appropriate error
    if (!restrictionPassed && restrictionFailureCode) {
      const errorMessages: Record<string, { message: string; status: number }> = {
        'IP_NOT_ALLOWED': { 
          message: 'Your IP is not in the allowed range for check-in.', 
          status: 403 
        },
        'GEO_OUTSIDE': { 
          message: 'You are outside the allowed location radius. Check-in not permitted.', 
          status: 403 
        },
        'GEO_MISSING': { 
          message: 'Please enable GPS to check-in from allowed location.', 
          status: 400 
        },
        'IP_UNKNOWN': { 
          message: 'Unable to determine your IP address. Please check your connection.', 
          status: 400 
        },
      };

      const errorInfo = errorMessages[restrictionFailureCode] || { 
        message: 'Restriction validation failed', 
        status: 403 
      };

      console.log('Returning restriction error:', errorInfo.message);
      
      return NextResponse.json({ 
        error: errorInfo.message, 
        code: restrictionFailureCode 
      }, { status: errorInfo.status });
    }

    // ===== ATTENDANCE CREATION =====
    console.log('All restrictions passed, creating attendance record...');
    
    const [settingsRaw] = await db.select().from(attendanceSettings).limit(1);
    if (!settingsRaw) {
      return NextResponse.json({ error: 'Attendance settings not configured' }, { status: 500 });
    }

    const settings = settingsRaw as any;

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
        { error: 'Already checked in today', attendance: existingRecord },
        { status: 400 }
      );
    }

    // Calculate check-in status using new utility function
    const checkInCalculation = calculateCheckInStatus(
      checkInTime,
      (settings.checkInStart || '08:00').toString(),
      (settings.checkInEnd || '10:00').toString()
    );

    // Map calculation result to status field
    // Status field stores the final attendance status (present/late/early/absent)
    const status = checkInCalculation.status === 'early' ? 'early' : 
                   checkInCalculation.status === 'late' ? 'late' : 
                   'present';

    const lateMinutes = checkInCalculation.status === 'late' 
      ? checkInCalculation.duration 
      : 0;

    console.log('Check-in time analysis:', {
      checkInTime: checkInTime.toISOString(),
      checkInWindow: `${settings.checkInStart || '08:00'} - ${settings.checkInEnd || '10:00'}`,
      status,
      checkInStatus: checkInCalculation.status,
      duration: checkInCalculation.duration,
      lateMinutes,
    });

    // Create attendance record
    const attendanceData = {
      employeeId: employee.id,
      date: today,
      checkIn: checkInTime,
      status,
      checkInStatus: checkInCalculation.status,
      checkInDuration: checkInCalculation.duration,
      lateMinutes,
      workHours: '0',
      restrictionPassed,
      restrictionFailureCode,
      checkInIp,
      checkInLatitude,
      checkInLongitude,
      updatedAt: new Date(),
    };

    let resultRecord;
    if (existingRecord) {
      [resultRecord] = await db
        .update(attendance)
        .set(attendanceData)
        .where(eq(attendance.id, existingRecord.id))
        .returning();
    } else {
      [resultRecord] = await db
        .insert(attendance)
        .values(attendanceData)
        .returning();
    }

    console.log('Check-in successful:', resultRecord);

    return NextResponse.json({
      success: true,
      message: 'Checked in successfully',
      attendance: resultRecord,
      checkInStatus: checkInCalculation.status,
    });

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