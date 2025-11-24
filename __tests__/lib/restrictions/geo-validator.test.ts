// __tests__/lib/restrictions/geo-validator.test.ts
/**
 * Unit tests for Geolocation validation and Haversine distance calculation
 */

import {
  isValidLatitude,
  isValidLongitude,
  haversineDistance,
  isWithinGeoZone,
  GeoCoord,
} from '@/lib/restrictions/geo-validator';

describe('Geo Validation', () => {
  describe('isValidLatitude', () => {
    it('should validate correct latitudes', () => {
      expect(isValidLatitude(0)).toBe(true);
      expect(isValidLatitude(90)).toBe(true);
      expect(isValidLatitude(-90)).toBe(true);
      expect(isValidLatitude(45.123456)).toBe(true);
      expect(isValidLatitude(-33.8688)).toBe(true); // Sydney
      expect(isValidLatitude(11.0679)).toBe(true); // Bangalore
    });

    it('should reject invalid latitudes', () => {
      expect(isValidLatitude(91)).toBe(false);
      expect(isValidLatitude(-91)).toBe(false);
      expect(isValidLatitude(180)).toBe(false);
      expect(isValidLatitude(-180)).toBe(false);
    });
  });

  describe('isValidLongitude', () => {
    it('should validate correct longitudes', () => {
      expect(isValidLongitude(0)).toBe(true);
      expect(isValidLongitude(180)).toBe(true);
      expect(isValidLongitude(-180)).toBe(true);
      expect(isValidLongitude(77.5432)).toBe(true);
      expect(isValidLongitude(-122.4194)).toBe(true); // San Francisco
      expect(isValidLongitude(139.6917)).toBe(true); // Tokyo
    });

    it('should reject invalid longitudes', () => {
      expect(isValidLongitude(181)).toBe(false);
      expect(isValidLongitude(-181)).toBe(false);
      expect(isValidLongitude(270)).toBe(false);
    });
  });

  describe('haversineDistance', () => {
    it('should calculate distance between same coordinates as 0', () => {
      const coord = { latitude: 11.0679, longitude: 77.5432 };
      const distance = haversineDistance(coord, coord);
      expect(distance).toBeLessThan(1); // less than 1 meter
    });

    it('should calculate approximately correct distances', () => {
      // New Delhi to Bangalore: ~2150 km (approximately)
      const delhi: GeoCoord = { latitude: 28.7041, longitude: 77.1025 };
      const bangalore: GeoCoord = { latitude: 12.9716, longitude: 77.5946 };
      
      const distance = haversineDistance(delhi, bangalore);
      // Distance should be around 2150 km (2150000 meters)
      // Allow 10% margin of error
      expect(distance).toBeGreaterThan(1900000); // > 1900 km
      expect(distance).toBeLessThan(2400000); // < 2400 km
    });

    it('should calculate distance to San Francisco from New York', () => {
      // NYC to SF: ~4130 km (approximately)
      const nyc: GeoCoord = { latitude: 40.7128, longitude: -74.0060 };
      const sf: GeoCoord = { latitude: 37.7749, longitude: -122.4194 };
      
      const distance = haversineDistance(nyc, sf);
      // Allow 5% margin
      expect(distance).toBeGreaterThan(3900000); // > 3900 km
      expect(distance).toBeLessThan(4300000); // < 4300 km
    });

    it('should calculate distance across equator', () => {
      const northern: GeoCoord = { latitude: 10, longitude: 0 };
      const southern: GeoCoord = { latitude: -10, longitude: 0 };
      
      const distance = haversineDistance(northern, southern);
      // ~20 degrees = ~2223 km
      expect(distance).toBeGreaterThan(2000000);
      expect(distance).toBeLessThan(2400000);
    });

    it('should be symmetric (distance A to B = distance B to A)', () => {
      const coord1: GeoCoord = { latitude: 11.0679, longitude: 77.5432 };
      const coord2: GeoCoord = { latitude: 12.0, longitude: 78.0 };
      
      const dist1 = haversineDistance(coord1, coord2);
      const dist2 = haversineDistance(coord2, coord1);
      
      expect(Math.abs(dist1 - dist2)).toBeLessThan(1); // Should be identical
    });

    it('should work with negative coordinates', () => {
      const southern: GeoCoord = { latitude: -33.8688, longitude: 151.2093 }; // Sydney
      const northern: GeoCoord = { latitude: 51.5074, longitude: -0.1278 }; // London
      
      const distance = haversineDistance(southern, northern);
      // Sydney to London: ~17000 km (approximately)
      expect(distance).toBeGreaterThan(16000000); // > 16000 km
      expect(distance).toBeLessThan(18000000); // < 18000 km
    });

    it('should handle office location scenario', () => {
      // Office at Bangalore coordinates
      const office: GeoCoord = { latitude: 11.0679, longitude: 77.5432 };
      
      // Employee 500m away
      const nearbyEmployee: GeoCoord = { latitude: 11.0729, longitude: 77.5482 };
      const nearbyDistance = haversineDistance(office, nearbyEmployee);
      expect(nearbyDistance).toBeGreaterThan(400); // > 400m
      expect(nearbyDistance).toBeLessThan(800); // < 800m
      
      // Employee 2km away
      const distantEmployee: GeoCoord = { latitude: 11.0979, longitude: 77.5732 };
      const distantDistance = haversineDistance(office, distantEmployee);
      expect(distantDistance).toBeGreaterThan(1800000); // > 1800m
      expect(distantDistance).toBeLessThan(2200000); // < 2200m
    });
  });

  describe('isWithinGeoZone', () => {
    const officeCenter: GeoCoord = { latitude: 11.0679, longitude: 77.5432 };

    it('should allow check-in at zone center', () => {
      expect(isWithinGeoZone(officeCenter, officeCenter, 500)).toBe(true);
    });

    it('should allow check-in within 500m radius', () => {
      // Slightly offset location (~600m away)
      const nearby: GeoCoord = { latitude: 11.0779, longitude: 77.5532 };
      
      // Should be allowed within 1000m
      expect(isWithinGeoZone(nearby, officeCenter, 1000)).toBe(true);
      
      // Might be outside 500m
      // (depends on exact calculation, but should be close to boundary)
    });

    it('should deny check-in outside zone radius', () => {
      // Location ~5km away
      const distant: GeoCoord = { latitude: 11.1179, longitude: 77.5832 };
      
      expect(isWithinGeoZone(distant, officeCenter, 500)).toBe(false);
      expect(isWithinGeoZone(distant, officeCenter, 1000)).toBe(false);
    });

    it('should handle 0 radius (exact location only)', () => {
      expect(isWithinGeoZone(officeCenter, officeCenter, 0)).toBe(false); // 0 radius not allowed
    });

    it('should handle negative radius (invalid)', () => {
      expect(isWithinGeoZone(officeCenter, officeCenter, -100)).toBe(false);
    });

    it('should reject invalid client coordinates', () => {
      const invalidLat: GeoCoord = { latitude: 91, longitude: 77.5432 };
      const invalidLng: GeoCoord = { latitude: 11.0679, longitude: 181 };
      
      expect(isWithinGeoZone(invalidLat, officeCenter, 500)).toBe(false);
      expect(isWithinGeoZone(invalidLng, officeCenter, 500)).toBe(false);
    });

    it('should reject invalid zone coordinates', () => {
      const clientCoord: GeoCoord = { latitude: 11.0679, longitude: 77.5432 };
      const invalidZone: GeoCoord = { latitude: 91, longitude: 77.5432 };
      
      expect(isWithinGeoZone(clientCoord, invalidZone, 500)).toBe(false);
    });

    it('should handle real office scenarios', () => {
      // Typical office building scenario: 300m radius
      const officeLocation: GeoCoord = { latitude: 40.7128, longitude: -74.0060 }; // NYC
      const radius = 300; // 300 meters

      // Employee in same building (should be ~0m away)
      const sameBuilding: GeoCoord = { latitude: 40.7128, longitude: -74.0060 };
      expect(isWithinGeoZone(sameBuilding, officeLocation, radius)).toBe(true);

      // Employee on same street block (should be ~50-100m away)
      const sameBlock: GeoCoord = { latitude: 40.7138, longitude: -74.0070 };
      expect(isWithinGeoZone(sameBlock, officeLocation, radius)).toBe(true);

      // Employee 500m away (coffee shop nearby, outside zone)
      const coffeeShop: GeoCoord = { latitude: 40.7178, longitude: -74.0060 };
      expect(isWithinGeoZone(coffeeShop, officeLocation, radius)).toBe(false);
    });

    it('should handle large radius zones (city-wide)', () => {
      // City-wide zone: 10km radius
      const cityCenter: GeoCoord = { latitude: 40.7128, longitude: -74.0060 }; // NYC
      const largeRadius = 10000; // 10 km

      // Within city
      const uptown: GeoCoord = { latitude: 40.7850, longitude: -73.9760 };
      expect(isWithinGeoZone(uptown, cityCenter, largeRadius)).toBe(true);

      // Outside city
      const newark: GeoCoord = { latitude: 40.7357, longitude: -74.1724 };
      expect(isWithinGeoZone(newark, cityCenter, largeRadius)).toBe(false);
    });
  });

  describe('Integration: Geo restriction scenarios', () => {
    it('should correctly validate multiple office zones', () => {
      // Company has two offices: New York and San Francisco
      const nyc: GeoCoord = { latitude: 40.7128, longitude: -74.0060 };
      const sf: GeoCoord = { latitude: 37.7749, longitude: -122.4194 };
      const radius = 500; // 500m radius for each office

      // NYC employee can check in at NYC office
      const nycEmployee: GeoCoord = { latitude: 40.7128, longitude: -74.0060 };
      expect(isWithinGeoZone(nycEmployee, nyc, radius)).toBe(true);
      expect(isWithinGeoZone(nycEmployee, sf, radius)).toBe(false); // Can't check in at SF

      // SF employee can check in at SF office
      const sfEmployee: GeoCoord = { latitude: 37.7749, longitude: -122.4194 };
      expect(isWithinGeoZone(sfEmployee, sf, radius)).toBe(true);
      expect(isWithinGeoZone(sfEmployee, nyc, radius)).toBe(false); // Can't check in at NYC
    });

    it('should handle boundary conditions', () => {
      const center: GeoCoord = { latitude: 0, longitude: 0 };
      
      // Exactly at equator and meridian
      expect(isWithinGeoZone(center, center, 100)).toBe(true);
      
      // Near poles
      const northPole: GeoCoord = { latitude: 90, longitude: 0 };
      const nearNorthPole: GeoCoord = { latitude: 89.99, longitude: 0 };
      expect(isWithinGeoZone(nearNorthPole, northPole, 2000)).toBe(true);
      
      const southPole: GeoCoord = { latitude: -90, longitude: 0 };
      const nearSouthPole: GeoCoord = { latitude: -89.99, longitude: 0 };
      expect(isWithinGeoZone(nearSouthPole, southPole, 2000)).toBe(true);
    });
  });
});
