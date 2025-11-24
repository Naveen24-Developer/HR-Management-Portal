// lib/restrictions/geo-validator.ts
/**
 * Geolocation validation utilities
 * Uses Haversine formula to calculate distance between coordinates
 */

export interface GeoCoord {
  latitude: number;
  longitude: number;
}

/**
 * Validate latitude (-90 to 90)
 */
export function isValidLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

/**
 * Validate longitude (-180 to 180)
 */
export function isValidLongitude(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function haversineDistance(
  coord1: GeoCoord,
  coord2: GeoCoord
): number {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const R = 6371000; // Earth's radius in meters
  
  const lat1 = coord1.latitude;
  const lon1 = coord1.longitude;
  const lat2 = coord2.latitude;
  const lon2 = coord2.longitude;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // distance in meters
}

/**
 * Check if a coordinate is within an allowed geo zone
 * @param clientCoord Current user's coordinates
 * @param zoneCoord Center of the allowed zone
 * @param radiusMeters Allowed radius in meters
 * @returns true if within zone, false otherwise
 */
export function isWithinGeoZone(
  clientCoord: GeoCoord,
  zoneCoord: GeoCoord,
  radiusMeters: number
): boolean {
  // Validate inputs
  if (!isValidLatitude(clientCoord.latitude) || !isValidLongitude(clientCoord.longitude)) {
    return false;
  }
  
  if (!isValidLatitude(zoneCoord.latitude) || !isValidLongitude(zoneCoord.longitude)) {
    return false;
  }
  
  if (radiusMeters <= 0) {
    return false;
  }
  
  const distance = haversineDistance(clientCoord, zoneCoord);
  return distance <= radiusMeters;
}
