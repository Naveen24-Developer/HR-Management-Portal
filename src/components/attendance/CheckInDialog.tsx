'use client';

import { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

interface CheckInDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    timestamp: string;
    latitude?: number;
    longitude?: number;
  }) => Promise<void>;
  requiresGeo: boolean;
}

interface GeoCoord {
  latitude: number;
  longitude: number;
}

type AlertType = 'loading' | 'success' | 'error' | null;

const ERROR_MESSAGES: Record<string, { title: string; message: string; icon: string }> = {
  // These entries map server/client error codes to the exact user-facing
  // alert strings requested.
  IP_NOT_ALLOWED: {
    title: 'Access denied. You are not in the allowed IP range.',
    message: '',
    icon: 'error',
  },
  GEO_OUTSIDE: {
    title: 'You are outside the allowed location radius',
    message: '',
    icon: 'error',
  },
  GPS_PERMISSION_DENIED: {
    title: 'Please enable GPS to check-in from allowed location.',
    message: '',
    icon: 'error',
  },
  GEO_MISSING: {
    title: 'Unable to validate your location. Please try again.',
    message: '',
    icon: 'error',
  },
  IP_UNKNOWN: {
    title: 'Network Error',
    message: 'Unable to determine your IP address. Please check your connection.',
    icon: 'error',
  },
  LOCATION_UNAVAILABLE: {
    title: 'Unable to validate your location. Please try again.',
    message: '',
    icon: 'error',
  },
  TIMEOUT: {
    title: 'Location validation took too long. Please try again.',
    message: '',
    icon: 'error',
  },
};

export default function CheckInDialog({
  isOpen,
  onClose,
  onSubmit,
  requiresGeo,
}: CheckInDialogProps) {
  const [loading, setLoading] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTitle, setAlertTitle] = useState('');
  const [geoLocation, setGeoLocation] = useState<GeoCoord | null>(null);
  const [errorCode, setErrorCode] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
      setLoading(false);
      setAlertType(null);
      setAlertMessage('');
      setAlertTitle('');
      setGeoLocation(null);
      setErrorCode('');
    }
  }, [isOpen]);

  const requestGeoLocation = (): Promise<GeoCoord> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({
          code: 'GPS_PERMISSION_DENIED',
          message: 'Geolocation is not supported by your browser.',
        });
        return;
      }

      const timeoutId = setTimeout(() => {
        reject({
          code: 'TIMEOUT',
          message: 'Location request timed out.',
        });
      }, 15000); // 15 second timeout

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject({
                code: 'GPS_PERMISSION_DENIED',
                message: 'Please enable GPS to check-in from allowed location.',
              });
              break;
            case error.POSITION_UNAVAILABLE:
              reject({
                code: 'LOCATION_UNAVAILABLE',
                message: 'Unable to validate your location. Please try again.',
              });
              break;
            case error.TIMEOUT:
              reject({
                code: 'TIMEOUT',
                message: 'Location validation took too long. Please try again.',
              });
              break;
            default:
              reject({
                code: 'LOCATION_UNAVAILABLE',
                message: 'Unable to get your location.',
              });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleCheckIn = async () => {
    setLoading(true);
    setAlertType('loading');
    setAlertTitle('Validating your location…');
    setAlertMessage('');
    setErrorCode('');

    try {
      let location: GeoCoord | undefined;

      // Collect location if GEO restriction is applicable
      if (requiresGeo) {
        location = await requestGeoLocation();
        setGeoLocation(location);
      }

      // Call check-in API
      const timestamp = new Date().toISOString();
      await onSubmit({
        timestamp,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });

      // Success
      setAlertType('success');
      setAlertTitle('Check-in Successful');
      setAlertMessage('You have been checked in successfully.');

      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: any) {
      const code = error?.code || error?.response?.data?.code || 'UNKNOWN';
      const message = error?.message || error?.response?.data?.error || 'Failed to check in';

      setErrorCode(code);
      setAlertType('error');

      const errorInfo = ERROR_MESSAGES[code] || {
        title: 'Check-in Failed',
        message: message,
        icon: 'error',
      };

      setAlertTitle(errorInfo.title);
      setAlertMessage(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLoading(false);
    setAlertType(null);
    setAlertMessage('');
    setAlertTitle('');
    setGeoLocation(null);
    setErrorCode('');
    onClose();
  };

  if (!isOpen) return null;

  // Backdrop
  const showBackdrop = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-40"
      onClick={!loading ? handleClose : undefined}
    />
  );

  // Main Dialog
  return (
    <>
      {showBackdrop}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Employee Check-In</h2>
            {!loading && (
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {/* Alert Message */}
            {alertType && (
              <div
                className={`mb-6 p-4 rounded-lg flex items-start space-x-3 ${
                  alertType === 'loading'
                    ? 'bg-blue-50'
                    : alertType === 'success'
                    ? 'bg-green-50'
                    : 'bg-red-50'
                }`}
              >
                <div className="flex-shrink-0">
                  {alertType === 'loading' && (
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  {alertType === 'success' && (
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  )}
                  {alertType === 'error' && (
                    <XCircleIcon className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-semibold ${
                      alertType === 'loading'
                        ? 'text-blue-900'
                        : alertType === 'success'
                        ? 'text-green-900'
                        : 'text-red-900'
                    }`}
                  >
                    {alertTitle}
                  </p>
                  {alertMessage && (
                    <p
                      className={`text-sm mt-1 ${
                        alertType === 'loading'
                          ? 'text-blue-700'
                          : alertType === 'success'
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}
                    >
                      {alertMessage}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Location Status (if GEO required) */}
            {requiresGeo && geoLocation && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <MapPinIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Location Detected</p>
                    <p className="text-xs text-blue-700 mt-1">
                      {geoLocation.latitude.toFixed(4)}, {geoLocation.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info Message (when idle) */}
            {!alertType && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  {requiresGeo
                    ? 'Your location will be verified during check-in. Please ensure GPS is enabled.'
                    : 'Click the button below to check in.'}
                </p>
              </div>
            )}

            {/* Error Details (for debugging, optional) */}
            {errorCode && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-mono text-gray-600">Code: {errorCode}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
            {!loading && alertType !== 'success' && (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                {!alertType || alertType === 'error' ? (
                  <button
                    onClick={handleCheckIn}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    Check In
                  </button>
                ) : null}
              </>
            )}
            {alertType === 'success' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
