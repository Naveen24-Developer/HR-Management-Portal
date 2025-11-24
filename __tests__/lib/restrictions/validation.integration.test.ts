// __tests__/lib/restrictions/validation.integration.test.ts
/**
 * Integration tests for IP and Geo validation in check-in scenarios
 */

import { matchesAllowedIP } from '@/lib/restrictions/ip-validator';
import { isWithinGeoZone, GeoCoord } from '@/lib/restrictions/geo-validator';

describe('Validation Integration: Real-world Scenarios', () => {
  describe('Scenario 1: Office-only IP restriction', () => {
    const officeIps = ['192.168.1.0/24']; // Office network
    const vpnIps = ['10.0.0.0/8']; // VPN network
    const allowedIps = [...officeIps, ...vpnIps];

    it('should allow office employee to check in', () => {
      const employeeIP = '192.168.1.100';
      expect(matchesAllowedIP(employeeIP, allowedIps)).toBe(true);
    });

    it('should allow VPN employee to check in', () => {
      const employeeIP = '10.50.100.200';
      expect(matchesAllowedIP(employeeIP, allowedIps)).toBe(true);
    });

    it('should block remote employee outside office/VPN', () => {
      const homeIP = '203.0.113.45'; // ISP IP
      expect(matchesAllowedIP(homeIP, allowedIps)).toBe(false);
    });

    it('should block employee on public WiFi', () => {
      const publicWiFi = '8.8.8.8';
      expect(matchesAllowedIP(publicWiFi, allowedIps)).toBe(false);
    });
  });

  describe('Scenario 2: Geolocation-based office zone', () => {
    // Office in Bangalore, 500m radius
    const officeZone: GeoCoord = { latitude: 11.0679, longitude: 77.5432 };
    const zoneRadius = 500; // meters

    it('should allow employee inside office building', () => {
      const insideOffice: GeoCoord = { latitude: 11.0679, longitude: 77.5432 };
      expect(isWithinGeoZone(insideOffice, officeZone, zoneRadius)).toBe(true);
    });

    it('should allow employee on nearby parking lot', () => {
      // Approximately 200m from office
      const parking: GeoCoord = { latitude: 11.0704, longitude: 77.5445 };
      expect(isWithinGeoZone(parking, officeZone, zoneRadius)).toBe(true);
    });

    it('should block employee at nearby cafe (outside radius)', () => {
      // Approximately 1km away
      const cafe: GeoCoord = { latitude: 11.0779, longitude: 77.5532 };
      expect(isWithinGeoZone(cafe, officeZone, zoneRadius)).toBe(false);
    });

    it('should block employee at home (far away)', () => {
      // Different city
      const home: GeoCoord = { latitude: 12.9716, longitude: 77.5946 };
      expect(isWithinGeoZone(home, officeZone, zoneRadius)).toBe(false);
    });
  });

  describe('Scenario 3: Multiple restricted employees', () => {
    const employees = [
      {
        name: 'Alice (Office IP restricted)',
        ipRestriction: true,
        allowedIps: ['192.168.1.0/24'],
        currentIp: '192.168.1.50',
        canCheckIn: true,
      },
      {
        name: 'Bob (Office IP restricted, not at office)',
        ipRestriction: true,
        allowedIps: ['192.168.1.0/24'],
        currentIp: '203.0.113.100',
        canCheckIn: false,
      },
      {
        name: 'Charlie (Geo restricted at office)',
        ipRestriction: false,
        geoRestriction: true,
        officeLocation: { latitude: 11.0679, longitude: 77.5432 } as GeoCoord,
        radius: 500,
        currentLocation: { latitude: 11.0679, longitude: 77.5432 } as GeoCoord,
        canCheckIn: true,
      },
      {
        name: 'Diana (Geo restricted, away from office)',
        ipRestriction: false,
        geoRestriction: true,
        officeLocation: { latitude: 11.0679, longitude: 77.5432 } as GeoCoord,
        radius: 500,
        currentLocation: { latitude: 11.1679, longitude: 77.6432 } as GeoCoord,
        canCheckIn: false,
      },
    ];

    it('should correctly validate all employees', () => {
      employees.forEach((emp: any) => {
        let canCheckIn = true;

        if (emp.ipRestriction) {
          canCheckIn = matchesAllowedIP(emp.currentIp, emp.allowedIps);
        }

        if (emp.geoRestriction) {
          canCheckIn = isWithinGeoZone(
            emp.currentLocation,
            emp.officeLocation,
            emp.radius
          );
        }

        expect(canCheckIn).toBe(
          emp.canCheckIn,
          `${emp.name} validation failed`
        );
      });
    });
  });

  describe('Scenario 4: Hybrid restrictions (IP AND Geo)', () => {
    // Employee must be on office IP AND within office location (if traveling, VPN + geo)
    const officeIps = ['192.168.1.0/24'];
    const vpnIps = ['10.0.0.0/8'];
    const allowedIps = [...officeIps, ...vpnIps];

    const officeZone: GeoCoord = { latitude: 11.0679, longitude: 77.5432 };
    const zoneRadius = 500;

    it('employee at office on office network should check in', () => {
      const ip = '192.168.1.100';
      const location: GeoCoord = { latitude: 11.0679, longitude: 77.5432 };

      const ipMatch = matchesAllowedIP(ip, allowedIps);
      const geoMatch = isWithinGeoZone(location, officeZone, zoneRadius);

      expect(ipMatch && geoMatch).toBe(true);
    });

    it('employee at home on home network should fail', () => {
      const ip = '203.0.113.100';
      const location: GeoCoord = { latitude: 12.9716, longitude: 77.5946 };

      const ipMatch = matchesAllowedIP(ip, allowedIps);
      const geoMatch = isWithinGeoZone(location, officeZone, zoneRadius);

      expect(ipMatch && geoMatch).toBe(false);
    });

    it('employee on VPN but far from office should fail geo check', () => {
      const ip = '10.50.100.200'; // On VPN
      const location: GeoCoord = { latitude: 12.9716, longitude: 77.5946 }; // Different city

      const ipMatch = matchesAllowedIP(ip, allowedIps);
      const geoMatch = isWithinGeoZone(location, officeZone, zoneRadius);

      // IP passes but geo fails
      expect(ipMatch).toBe(true);
      expect(geoMatch).toBe(false);
      expect(ipMatch && geoMatch).toBe(false);
    });

    it('employee spoofing location but correct IP should fail', () => {
      const ip = '192.168.1.100'; // Valid office IP
      const fakeLocation: GeoCoord = { latitude: 12.9716, longitude: 77.5946 }; // Spoofed location

      const ipMatch = matchesAllowedIP(ip, allowedIps);
      const geoMatch = isWithinGeoZone(fakeLocation, officeZone, zoneRadius);

      // IP is correct but geo is fake
      expect(ipMatch).toBe(true);
      expect(geoMatch).toBe(false);
      expect(ipMatch && geoMatch).toBe(false);
    });
  });

  describe('Scenario 5: Error handling and edge cases', () => {
    it('should handle empty IP list', () => {
      expect(matchesAllowedIP('192.168.1.100', [])).toBe(false);
    });

    it('should handle invalid IP format', () => {
      const invalidIPs = ['256.256.256.256', 'not.an.ip', '192.168.1'];
      invalidIPs.forEach(ip => {
        expect(matchesAllowedIP(ip, ['192.168.1.0/24'])).toBe(false);
      });
    });

    it('should handle null/undefined geo coordinates', () => {
      const zone: GeoCoord = { latitude: 11.0679, longitude: 77.5432 };
      
      // Invalid latitude
      expect(isWithinGeoZone({ latitude: 91, longitude: 77.5432 }, zone, 500)).toBe(false);
      
      // Invalid longitude
      expect(isWithinGeoZone({ latitude: 11.0679, longitude: 181 }, zone, 500)).toBe(false);
    });

    it('should handle zero radius', () => {
      const zone: GeoCoord = { latitude: 11.0679, longitude: 77.5432 };
      const location: GeoCoord = { latitude: 11.0679, longitude: 77.5432 };
      
      expect(isWithinGeoZone(location, zone, 0)).toBe(false);
    });

    it('should handle negative coordinates (Southern and Western hemispheres)', () => {
      const sydney: GeoCoord = { latitude: -33.8688, longitude: 151.2093 };
      const nearby: GeoCoord = { latitude: -33.8700, longitude: 151.2100 };
      
      expect(isWithinGeoZone(nearby, sydney, 1000)).toBe(true);
    });
  });

  describe('Scenario 6: Performance considerations', () => {
    it('should quickly validate large IP lists', () => {
      // Create a list of 100+ CIDR ranges
      const largeIPList = Array.from({ length: 100 }, (_, i) => {
        const third = Math.floor(i / 10);
        const fourth = i % 10;
        return `10.${third}.${fourth}.0/24`;
      });

      const testIP = '10.5.7.100';
      const start = performance.now();
      const result = matchesAllowedIP(testIP, largeIPList);
      const duration = performance.now() - start;

      expect(result).toBe(true);
      expect(duration).toBeLessThan(10); // Should complete in less than 10ms
    });

    it('should quickly validate geo zones', () => {
      const office: GeoCoord = { latitude: 11.0679, longitude: 77.5432 };
      const employee: GeoCoord = { latitude: 11.0700, longitude: 77.5450 };

      const start = performance.now();
      const result = isWithinGeoZone(employee, office, 500);
      const duration = performance.now() - start;

      expect(result).toBe(true);
      expect(duration).toBeLessThan(5); // Should complete in less than 5ms
    });
  });
});
