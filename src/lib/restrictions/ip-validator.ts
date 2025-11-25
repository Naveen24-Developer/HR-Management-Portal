// lib/restrictions/ip-validator.ts - UPDATED
/**
 * IP validation and CIDR matching utilities
 */

/**
 * Check if an IP address is in valid IPv4 format
 */
export function isValidIPv4(ip: string): boolean {
  if (typeof ip !== 'string') return false;
  
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255 && part === num.toString();
  });
}

/**
 * Validate CIDR notation (e.g., "10.0.0.0/24")
 */
export function isValidCIDR(cidr: string): boolean {
  if (typeof cidr !== 'string') return false;
  
  const [ip, mask] = cidr.split('/');
  if (!ip || !mask) return false;
  
  if (!isValidIPv4(ip)) return false;
  
  const maskNum = parseInt(mask, 10);
  return !isNaN(maskNum) && maskNum >= 0 && maskNum <= 32;
}

/**
 * Convert IPv4 address to 32-bit integer
 */
function ipToInt(ip: string): number {
  const parts = ip.split('.');
  return parts.reduce((acc, part, i) => {
    return acc + (parseInt(part, 10) << (8 * (3 - i)));
  }, 0) >>> 0; // Ensure unsigned 32-bit integer
}

/**
 * Check if an IP is within a CIDR range
 */
export function isIPInCIDR(ip: string, cidr: string): boolean {
  if (!isValidIPv4(ip)) return false;
  
  const [networkStr, maskStr] = cidr.split('/');
  if (!networkStr || !maskStr) return false;
  
  if (!isValidIPv4(networkStr)) return false;

  const ipInt = ipToInt(ip);
  const networkInt = ipToInt(networkStr);
  const maskBits = parseInt(maskStr, 10);
  
  if (isNaN(maskBits) || maskBits < 0 || maskBits > 32) return false;
  
  // Handle /0 case (any IP matches)
  if (maskBits === 0) return true;
  
  const mask = (0xffffffff << (32 - maskBits)) >>> 0;
  
  return (ipInt & mask) === (networkInt & mask);
}

/**
 * Check if client IP matches any of the allowed IPs (exact or CIDR)
 * WITH DEVELOPMENT MODE SUPPORT
 */
export function matchesAllowedIP(clientIP: string, allowedIPs: string[]): boolean {
  if (!clientIP) return false;
  
  // In development mode, allow localhost IPs by default
  if (process.env.NODE_ENV === 'development') {
    const localhostIPs = ['127.0.0.1', '::1', 'localhost'];
    if (localhostIPs.includes(clientIP)) {
      console.log('Development mode: Allowing localhost IP', clientIP);
      return true;
    }
  }
  
  if (!isValidIPv4(clientIP)) return false;
  if (!Array.isArray(allowedIPs)) return false;
  
  for (const allowedIP of allowedIPs) {
    if (typeof allowedIP !== 'string') continue;
    
    const trimmed = allowedIP.trim();
    
    // Skip empty entries
    if (!trimmed) continue;
    
    // Exact match
    if (trimmed === clientIP) {
      return true;
    }
    
    // CIDR match
    if (trimmed.includes('/')) {
      if (isValidCIDR(trimmed) && isIPInCIDR(clientIP, trimmed)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Extract client IP from Next.js request - ENHANCED VERSION
 */
export function extractClientIP(req: any): string | null {
  try {
    let clientIP: string | null = null;

    // Method 1: Check x-forwarded-for header (most common in production)
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
      const ips = forwardedFor.split(',').map((ip: string) => ip.trim());
      clientIP = ips[0];
      console.log('Found IP in x-forwarded-for:', clientIP);
    }

    // Method 2: Check x-real-ip header
    if (!clientIP) {
      const realIP = req.headers.get('x-real-ip');
      if (realIP) {
        clientIP = realIP;
        console.log('Found IP in x-real-ip:', clientIP);
      }
    }

    // Method 3: Check cf-connecting-ip (Cloudflare)
    if (!clientIP) {
      const cfIP = req.headers.get('cf-connecting-ip');
      if (cfIP) {
        clientIP = cfIP;
        console.log('Found IP in cf-connecting-ip:', clientIP);
      }
    }

    // Method 4: Check fastly-client-ip
    if (!clientIP) {
      const fastlyIP = req.headers.get('fastly-client-ip');
      if (fastlyIP) {
        clientIP = fastlyIP;
        console.log('Found IP in fastly-client-ip:', clientIP);
      }
    }

    // Method 5: Check true-client-ip
    if (!clientIP) {
      const trueClientIP = req.headers.get('true-client-ip');
      if (trueClientIP) {
        clientIP = trueClientIP;
        console.log('Found IP in true-client-ip:', clientIP);
      }
    }

    // Method 6: For development, use localhost
    if (!clientIP) {
      clientIP = '127.0.0.1';
      console.log('Using default IP for development:', clientIP);
    }

    // Clean up the IP
    if (clientIP) {
      // Handle IPv6-mapped IPv4 addresses (::ffff:192.168.1.1)
      clientIP = clientIP.replace(/^::ffff:/, '');
      
      // Handle IPv6 localhost
      if (clientIP === '::1') {
        clientIP = '127.0.0.1';
      }
      
      // Handle localhost hostname
      if (clientIP === 'localhost') {
        clientIP = '127.0.0.1';
      }
      
      console.log('Final IP:', clientIP);
      return clientIP;
    }

    console.log('No IP found in headers');
    return '127.0.0.1'; // Fallback for development
    
  } catch (error) {
    console.error('Error extracting client IP:', error);
    return '127.0.0.1'; // Fallback for development
  }
}

/**
 * Debug function to log all headers for troubleshooting
 */
export function debugHeaders(req: any): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('=== HEADERS DEBUG ===');
    const headers: { [key: string]: string } = {};
    
    req.headers.forEach((value: string, key: string) => {
      headers[key] = value;
    });
    
    console.log('All headers:', headers);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('=== END HEADERS DEBUG ===');
  }
}