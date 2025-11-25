/**
 * API error handling utilities for check-in/checkout operations
 */

export interface APIError {
  code?: string;
  error?: string;
  message?: string;
  details?: any;
}

export interface ErrorAlert {
  title: string;
  message: string;
  type: 'error' | 'warning';
}

export const ERROR_ALERT_MAP: Record<string, ErrorAlert> = {
  // IP Restriction Errors
  IP_NOT_ALLOWED: {
    title: 'Access Denied',
    message: 'Your IP is not in the allowed range.',
    type: 'error',
  },
  IP_UNKNOWN: {
    title: 'Network Error',
    message: 'Unable to determine your IP address. Please check your connection.',
    type: 'error',
  },

  // GEO Restriction Errors
  GEO_OUTSIDE: {
    title: 'Location Not Allowed',
    message: 'You are outside the allowed location to check-in.',
    type: 'error',
  },
  GEO_MISSING: {
    title: 'Location Required',
    message: 'Unable to validate your location. Please try again.',
    type: 'error',
  },
  LOCATION_UNAVAILABLE: {
    title: 'Location Unavailable',
    message: 'Unable to validate your location. Please try again.',
    type: 'error',
  },

  // GPS Errors
  GPS_PERMISSION_DENIED: {
    title: 'GPS Permission Denied',
    message: 'Please enable GPS to check-in from allowed location.',
    type: 'error',
  },
  GPS_TIMEOUT: {
    title: 'GPS Timeout',
    message: 'Location validation took too long. Please try again.',
    type: 'error',
  },

  // Timeout/Network Errors
  TIMEOUT: {
    title: 'Request Timeout',
    message: 'Location validation took too long. Please try again.',
    type: 'error',
  },

  // Attendance Errors
  ALREADY_CHECKED_IN: {
    title: 'Already Checked In',
    message: 'You have already checked in today.',
    type: 'warning',
  },

  // Generic Errors
  UNKNOWN: {
    title: 'Check-in Failed',
    message: 'An unexpected error occurred. Please try again.',
    type: 'error',
  },
};

/**
 * Extract error code and message from API response or error object
 */
export function extractErrorInfo(error: any): {
  code: string;
  message: string;
  details?: any;
} {
  // Try to get from response data
  if (error?.response?.data) {
    const data = error.response.data;
    return {
      code: data.code || data.error || 'UNKNOWN',
      message: data.message || data.error || 'Unknown error',
      details: data,
    };
  }

  // Try to get from direct error object
  if (error?.code || error?.message) {
    return {
      code: error.code || 'UNKNOWN',
      message: error.message || 'Unknown error',
      details: error,
    };
  }

  // Default
  return {
    code: 'UNKNOWN',
    message: error?.toString?.() || 'Unknown error occurred',
    details: error,
  };
}

/**
 * Get alert information for an error code
 */
export function getErrorAlert(code: string): ErrorAlert {
  return ERROR_ALERT_MAP[code] || ERROR_ALERT_MAP.UNKNOWN;
}

/**
 * Format error for display to user
 */
export function formatErrorAlert(error: any): ErrorAlert {
  const { code } = extractErrorInfo(error);
  return getErrorAlert(code);
}
