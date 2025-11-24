// __tests__/lib/restrictions/ip-validator.test.ts
/**
 * Unit tests for IP validation and CIDR matching
 */

import {
  isValidIPv4,
  isValidCIDR,
  isIPInCIDR,
  matchesAllowedIP,
} from '@/lib/restrictions/ip-validator';

describe('IP Validation', () => {
  describe('isValidIPv4', () => {
    it('should validate correct IPv4 addresses', () => {
      expect(isValidIPv4('192.168.1.1')).toBe(true);
      expect(isValidIPv4('10.0.0.0')).toBe(true);
      expect(isValidIPv4('172.16.0.1')).toBe(true);
      expect(isValidIPv4('255.255.255.255')).toBe(true);
      expect(isValidIPv4('0.0.0.0')).toBe(true);
    });

    it('should reject invalid IPv4 addresses', () => {
      expect(isValidIPv4('256.1.1.1')).toBe(false); // octet > 255
      expect(isValidIPv4('192.168.1')).toBe(false); // missing octet
      expect(isValidIPv4('192.168.1.1.1')).toBe(false); // too many octets
      expect(isValidIPv4('abc.def.ghi.jkl')).toBe(false); // non-numeric
      expect(isValidIPv4('192.168.1.1a')).toBe(false); // contains letter
      expect(isValidIPv4('192.168.-1.1')).toBe(false); // negative octet
    });
  });

  describe('isValidCIDR', () => {
    it('should validate correct CIDR notation', () => {
      expect(isValidCIDR('10.0.0.0/8')).toBe(true);
      expect(isValidCIDR('172.16.0.0/12')).toBe(true);
      expect(isValidCIDR('192.168.0.0/16')).toBe(true);
      expect(isValidCIDR('192.168.1.0/24')).toBe(true);
      expect(isValidCIDR('192.168.1.128/25')).toBe(true);
      expect(isValidCIDR('0.0.0.0/0')).toBe(true); // any IP
      expect(isValidCIDR('255.255.255.255/32')).toBe(true); // single IP
    });

    it('should reject invalid CIDR notation', () => {
      expect(isValidCIDR('10.0.0.0/33')).toBe(false); // mask > 32
      expect(isValidCIDR('10.0.0.0/-1')).toBe(false); // negative mask
      expect(isValidCIDR('256.0.0.0/24')).toBe(false); // invalid IP
      expect(isValidCIDR('10.0.0.0')).toBe(false); // missing mask
      expect(isValidCIDR('10.0.0.0/')).toBe(false); // missing mask value
      expect(isValidCIDR('/24')).toBe(false); // missing IP
    });
  });

  describe('isIPInCIDR', () => {
    it('should correctly match IPs in /24 networks', () => {
      // 192.168.1.0/24 = 192.168.1.0 to 192.168.1.255
      expect(isIPInCIDR('192.168.1.0', '192.168.1.0/24')).toBe(true);
      expect(isIPInCIDR('192.168.1.1', '192.168.1.0/24')).toBe(true);
      expect(isIPInCIDR('192.168.1.100', '192.168.1.0/24')).toBe(true);
      expect(isIPInCIDR('192.168.1.255', '192.168.1.0/24')).toBe(true);
      expect(isIPInCIDR('192.168.2.1', '192.168.1.0/24')).toBe(false); // different network
    });

    it('should correctly match IPs in /16 networks', () => {
      // 172.16.0.0/16 = 172.16.0.0 to 172.16.255.255
      expect(isIPInCIDR('172.16.0.0', '172.16.0.0/16')).toBe(true);
      expect(isIPInCIDR('172.16.1.1', '172.16.0.0/16')).toBe(true);
      expect(isIPInCIDR('172.16.255.255', '172.16.0.0/16')).toBe(true);
      expect(isIPInCIDR('172.17.0.0', '172.16.0.0/16')).toBe(false);
    });

    it('should correctly match IPs in /8 networks', () => {
      // 10.0.0.0/8 = 10.0.0.0 to 10.255.255.255
      expect(isIPInCIDR('10.0.0.0', '10.0.0.0/8')).toBe(true);
      expect(isIPInCIDR('10.1.2.3', '10.0.0.0/8')).toBe(true);
      expect(isIPInCIDR('10.255.255.255', '10.0.0.0/8')).toBe(true);
      expect(isIPInCIDR('11.0.0.0', '10.0.0.0/8')).toBe(false);
    });

    it('should correctly match /32 (single IP)', () => {
      expect(isIPInCIDR('192.168.1.100', '192.168.1.100/32')).toBe(true);
      expect(isIPInCIDR('192.168.1.101', '192.168.1.100/32')).toBe(false);
    });

    it('should correctly match /0 (any IP)', () => {
      expect(isIPInCIDR('0.0.0.0', '0.0.0.0/0')).toBe(true);
      expect(isIPInCIDR('192.168.1.1', '0.0.0.0/0')).toBe(true);
      expect(isIPInCIDR('255.255.255.255', '0.0.0.0/0')).toBe(true);
    });
  });

  describe('matchesAllowedIP', () => {
    it('should match exact IP in allowed list', () => {
      const allowed = ['192.168.1.100', '10.0.0.1'];
      expect(matchesAllowedIP('192.168.1.100', allowed)).toBe(true);
      expect(matchesAllowedIP('10.0.0.1', allowed)).toBe(true);
      expect(matchesAllowedIP('192.168.1.101', allowed)).toBe(false);
    });

    it('should match IP in CIDR range', () => {
      const allowed = ['192.168.1.0/24', '10.0.0.0/8'];
      expect(matchesAllowedIP('192.168.1.50', allowed)).toBe(true);
      expect(matchesAllowedIP('10.50.100.200', allowed)).toBe(true);
      expect(matchesAllowedIP('172.16.0.1', allowed)).toBe(false);
    });

    it('should match with mixed exact and CIDR', () => {
      const allowed = ['192.168.1.100', '10.0.0.0/8', '172.16.0.0/12'];
      expect(matchesAllowedIP('192.168.1.100', allowed)).toBe(true); // exact
      expect(matchesAllowedIP('10.99.99.99', allowed)).toBe(true); // CIDR
      expect(matchesAllowedIP('172.16.5.10', allowed)).toBe(true); // CIDR
      expect(matchesAllowedIP('192.168.1.101', allowed)).toBe(false);
    });

    it('should handle whitespace in IP list', () => {
      const allowed = [' 192.168.1.100 ', ' 10.0.0.0/8 '];
      expect(matchesAllowedIP('192.168.1.100', allowed)).toBe(true);
      expect(matchesAllowedIP('10.50.0.0', allowed)).toBe(true);
    });

    it('should reject invalid client IP', () => {
      const allowed = ['192.168.1.0/24'];
      expect(matchesAllowedIP('256.1.1.1', allowed)).toBe(false);
      expect(matchesAllowedIP('abc.def.ghi.jkl', allowed)).toBe(false);
    });

    it('should return false for empty allowed list', () => {
      expect(matchesAllowedIP('192.168.1.100', [])).toBe(false);
    });

    it('should handle office scenarios', () => {
      // Office IP restriction: Allow office network 192.168.0.0/16 OR VPN 10.0.0.0/24
      const allowed = ['192.168.0.0/16', '10.0.0.0/24'];
      
      // On office network
      expect(matchesAllowedIP('192.168.1.100', allowed)).toBe(true);
      expect(matchesAllowedIP('192.168.99.50', allowed)).toBe(true);
      
      // On VPN
      expect(matchesAllowedIP('10.0.0.50', allowed)).toBe(true);
      
      // Outside both networks
      expect(matchesAllowedIP('8.8.8.8', allowed)).toBe(false); // public IP
      expect(matchesAllowedIP('172.16.0.1', allowed)).toBe(false); // different private IP
    });
  });
});
