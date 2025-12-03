/**
 * Attendance Calculator Utility
 * Implements comprehensive attendance logic based on requirements:
 * - Check-in Status: Early, On Time, or Late
 * - Check-out Status: Early, On Time, or Over Time
 * - Attendance Status: Present or Absent
 * - Duration Calculations: Early/Late/OT Duration
 */

export interface AttendanceSettings {
  checkInStart: string; // HH:MM format
  checkInEnd: string; // HH:MM format
  checkOutStart: string; // HH:MM format
  checkOutEnd: string; // HH:MM format
  workHours: number; // Standard work hours per day
}

export interface CheckInCalculation {
  status: 'early' | 'on_time' | 'late'; // Check-in status
  duration: number; // Minutes early or late (positive for late, negative for early)
  description: string;
}

export interface CheckOutCalculation {
  status: 'early' | 'on_time' | 'over_time'; // Check-out status
  duration: number; // Minutes (positive for overtime)
  description: string;
}

export interface AttendanceStatusCalculation {
  attendanceStatus: 'present' | 'absent' | 'half_day'; // Final attendance status
  isPresent: boolean; // True if Present
  checkInStatus: CheckInCalculation | null;
  checkOutStatus: CheckOutCalculation | null;
  workHours: number; // Total work hours
  description: string;
}

/**
 * Convert time string (HH:MM) to total minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Calculate check-in status based on actual check-in time
 * @param actualCheckInTime - Date/time of actual check-in
 * @param checkInStart - Earliest acceptable check-in time (HH:MM)
 * @param checkInEnd - Latest acceptable check-in time (HH:MM)
 * @returns CheckInCalculation with status and duration
 */
export function calculateCheckInStatus(
  actualCheckInTime: Date,
  checkInStart: string,
  checkInEnd: string
): CheckInCalculation {
  const checkInStartMinutes = timeToMinutes(checkInStart);
  const checkInEndMinutes = timeToMinutes(checkInEnd);

  const actualCheckInMinutes =
    actualCheckInTime.getHours() * 60 + actualCheckInTime.getMinutes();

  if (actualCheckInMinutes < checkInStartMinutes) {
    // EARLY: Checked in before Check-in Start
    const earlyDuration = checkInStartMinutes - actualCheckInMinutes;
    return {
      status: 'early',
      duration: -earlyDuration, // Negative for early
      description: `Early by ${earlyDuration} minutes`,
    };
  } else if (actualCheckInMinutes > checkInEndMinutes) {
    // LATE: Checked in after Check-in End
    const lateDuration = actualCheckInMinutes - checkInEndMinutes;
    return {
      status: 'late',
      duration: lateDuration, // Positive for late
      description: `Late by ${lateDuration} minutes`,
    };
  } else {
    // ON TIME: Within the allowed window
    return {
      status: 'on_time',
      duration: 0,
      description: 'On time',
    };
  }
}

/**
 * Calculate check-out status based on actual check-out time
 * @param actualCheckOutTime - Date/time of actual check-out
 * @param checkOutStart - Earliest acceptable check-out time (HH:MM)
 * @param checkOutEnd - Latest acceptable check-out time (HH:MM)
 * @returns CheckOutCalculation with status and duration
 */
export function calculateCheckOutStatus(
  actualCheckOutTime: Date,
  checkOutStart: string,
  checkOutEnd: string
): CheckOutCalculation {
  const checkOutStartMinutes = timeToMinutes(checkOutStart);
  const checkOutEndMinutes = timeToMinutes(checkOutEnd);

  const actualCheckOutMinutes =
    actualCheckOutTime.getHours() * 60 + actualCheckOutTime.getMinutes();

  if (actualCheckOutMinutes < checkOutStartMinutes) {
    // EARLY: Checked out before Check-out Start
    const earlyDuration = checkOutStartMinutes - actualCheckOutMinutes;
    return {
      status: 'early',
      duration: -earlyDuration, // Negative for early
      description: `Early checkout by ${earlyDuration} minutes`,
    };
  } else if (actualCheckOutMinutes > checkOutEndMinutes) {
    // OVER TIME: Checked out after Check-out End
    const overtimeDuration = actualCheckOutMinutes - checkOutEndMinutes;
    return {
      status: 'over_time',
      duration: overtimeDuration, // Positive for overtime
      description: `Over time by ${overtimeDuration} minutes`,
    };
  } else {
    // ON TIME: Within the allowed window
    return {
      status: 'on_time',
      duration: 0,
      description: 'On time',
    };
  }
}

/**
 * Calculate total work hours between check-in and check-out
 * @param checkInTime - Check-in timestamp
 * @param checkOutTime - Check-out timestamp
 * @returns Total work hours as decimal (e.g., 8.5 for 8 hours 30 minutes)
 */
export function calculateWorkHours(
  checkInTime: Date,
  checkOutTime: Date
): number {
  const diffMs = checkOutTime.getTime() - checkInTime.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate final attendance status
 * @param checkInTime - Check-in timestamp (null if not checked in)
 * @param checkOutTime - Check-out timestamp (null if not checked out)
 * @param settings - Attendance settings containing time windows
 * @param currentTime - Current time for determining absence (default: now)
 * @returns AttendanceStatusCalculation with all status info
 */
export function calculateAttendanceStatus(
  checkInTime: Date | null,
  checkOutTime: Date | null,
  settings: AttendanceSettings,
  currentTime: Date = new Date()
): AttendanceStatusCalculation {
  // Step 1: Check for absence
  // If there is NO check-in record AND current time is past Check-out Start, mark as ABSENT
  if (!checkInTime) {
    const checkOutStartMinutes = timeToMinutes(settings.checkOutStart);
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    if (currentMinutes >= checkOutStartMinutes) {
      // Past checkout time with no check-in = ABSENT
      return {
        attendanceStatus: 'absent',
        isPresent: false,
        checkInStatus: null,
        checkOutStatus: null,
        workHours: 0,
        description: 'Absent - No check-in by checkout start time',
      };
    }

    // Still within working hours but hasn't checked in yet
    return {
      attendanceStatus: 'half_day',
      isPresent: false,
      checkInStatus: null,
      checkOutStatus: null,
      workHours: 0,
      description: 'No check-in yet',
    };
  }

  // Step 2: Calculate check-in status
  const checkInStatus = calculateCheckInStatus(
    checkInTime,
    settings.checkInStart,
    settings.checkInEnd
  );

  // Step 3: Check for checkout and calculate checkout status
  let checkOutStatus: CheckOutCalculation | null = null;
  let workHours = 0;
  let attendanceStatus: 'present' | 'absent' | 'half_day' = 'present';

  if (checkOutTime) {
    // Step 4: Calculate check-out status
    checkOutStatus = calculateCheckOutStatus(
      checkOutTime,
      settings.checkOutStart,
      settings.checkOutEnd
    );

    // Step 5: Calculate total work hours
    workHours = calculateWorkHours(checkInTime, checkOutTime);

    // Step 6: Determine final attendance status
    // PRESENT: Has valid check-in (Early or On Time) AND valid check-out (On Time or Over Time)
    const hasValidCheckIn =
      checkInStatus.status === 'early' || checkInStatus.status === 'on_time';
    const hasValidCheckOut =
      checkOutStatus.status === 'on_time' || checkOutStatus.status === 'over_time';

    if (hasValidCheckIn && hasValidCheckOut) {
      attendanceStatus = 'present';
    } else if (checkInStatus.status === 'late' && checkOutStatus.status === 'early') {
      // Late check-in AND early check-out = might still be marked absent or half_day
      attendanceStatus = 'absent';
    } else if (
      checkInStatus.status === 'late' ||
      checkOutStatus.status === 'early'
    ) {
      attendanceStatus = 'half_day';
    }
  } else {
    // No check-out yet
    const checkOutStartMinutes = timeToMinutes(settings.checkOutStart);
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    if (currentMinutes >= checkOutStartMinutes) {
      // Past checkout time with no checkout = ABSENT
      attendanceStatus = 'absent';
    } else {
      // Still within work hours
      attendanceStatus = 'half_day';
    }
  }

  return {
    attendanceStatus,
    isPresent: attendanceStatus === 'present',
    checkInStatus,
    checkOutStatus,
    workHours,
    description: `${attendanceStatus} - Check-in: ${checkInStatus.description}${
      checkOutStatus ? `, Check-out: ${checkOutStatus.description}` : ''
    }`,
  };
}

/**
 * Format duration to human-readable string
 * @param minutes - Duration in minutes (positive or negative)
 * @param includeSign - Include "+" or "-" sign
 * @returns Formatted string like "15 min", "1h 30m", etc.
 */
export function formatDuration(minutes: number, includeSign: boolean = true): string {
  const absMins = Math.abs(minutes);
  const hours = Math.floor(absMins / 60);
  const mins = absMins % 60;

  const sign = includeSign ? (minutes < 0 ? '- ' : '+ ') : '';

  if (hours === 0) {
    return `${sign}${mins}m`;
  } else if (mins === 0) {
    return `${sign}${hours}h`;
  } else {
    return `${sign}${hours}h ${mins}m`;
  }
}

/**
 * Get display label for check-in status
 */
export function getCheckInStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    early: '✓ Early',
    on_time: '✓ On Time',
    late: '⚠ Late',
  };
  return labels[status] || status;
}

/**
 * Get display label for check-out status
 */
export function getCheckOutStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    early: 'Early Checkout',
    on_time: '✓ On Time',
    over_time: '⏱ Overtime',
  };
  return labels[status] || status;
}

/**
 * Get display label for attendance status
 */
export function getAttendanceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    present: '✓ Present',
    absent: '✗ Absent',
    half_day: '◐ Half Day',
  };
  return labels[status] || status;
}
