// lib/restrictions/ip-validator.ts
/**
 * IP validation and CIDR matching utilities
 */

/**
 * Check if an IP address is in valid IPv4 format
 */
export function isValidIPv4(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Validate CIDR notation (e.g., "10.0.0.0/24")
 */
export function isValidCIDR(cidr: string): boolean {
  const [ip, mask] = cidr.split('/');
  if (!ip || !mask) return false;
  
  if (!isValidIPv4(ip)) return false;
  
  const maskNum = parseInt(mask, 10);
  return maskNum >= 0 && maskNum <= 32;
}

/**
 * Convert IPv4 address to 32-bit integer
 */
function ipToInt(ip: string): number {
  const parts = ip.split('.');
  return parts.reduce((acc, part, i) => {
    return acc + (parseInt(part, 10) << (8 * (3 - i)));
  }, 0);
}

/**
 * Convert 32-bit integer to IPv4 address
 */
function intToIP(int: number): string {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255,
  ].join('.');
}

/**
 * Check if an IP is within a CIDR range
 */
export function isIPInCIDR(ip: string, cidr: string): boolean {
  const [networkStr, maskStr] = cidr.split('/');
  if (!networkStr || !maskStr) return false;
  
  const ipInt = ipToInt(ip);
  const networkInt = ipToInt(networkStr);
  const maskBits = parseInt(maskStr, 10);
  
  if (maskBits < 0 || maskBits > 32) return false;
  
  const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
  
  return (ipInt & mask) === (networkInt & mask);
}

/**
 * Check if client IP matches any of the allowed IPs (exact or CIDR)
 */
export function matchesAllowedIP(clientIP: string, allowedIPs: string[]): boolean {
  if (!isValidIPv4(clientIP)) return false;
  
  for (const allowedIP of allowedIPs) {
    const trimmed = allowedIP.trim();
    
    // Exact match
    if (trimmed === clientIP) {
      return true;
    }
    
    // CIDR match
    if (trimmed.includes('/') && isValidCIDR(trimmed)) {
      if (isIPInCIDR(clientIP, trimmed)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Extract client IP from request headers
 * Handles X-Forwarded-For and direct connection
 */
export function extractClientIP(req: any): string {
  // Try X-Forwarded-For first (for proxies, load balancers, CDNs)
  const forwarded = req.headers.get?.('x-forwarded-for') || req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2, ...)
    // Take the first one (client IP)
    const ips = forwarded.split(',');
    const clientIp = ips[0].trim();
    if (isValidIPv4(clientIp)) {
      return clientIp;
    }
  }
  
  // Try CF-Connecting-IP (Cloudflare)
  const cfIP = req.headers.get?.('cf-connecting-ip') || req.headers['cf-connecting-ip'];
  if (cfIP && isValidIPv4(cfIP)) {
    return cfIP;
  }
  
  // Try direct connection
  const remoteAddr = req.socket?.remoteAddress || req.connection?.remoteAddress;
  if (remoteAddr && isValidIPv4(remoteAddr)) {
    return remoteAddr;
  }
  
  // Try from req directly
  if (req.ip && isValidIPv4(req.ip)) {
    return req.ip;
  }
  
  // Fallback
  return '';
}
