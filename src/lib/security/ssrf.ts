import dns from 'node:dns/promises';
import { isIPv4, isIPv6 } from 'node:net';

// Cached dynamic internal IP blocklist (resolved on first use or periodically)
let dynamicInternalIps: Set<string> | null = null;

async function getInternalDockerIps(): Promise<Set<string>> {
  if (dynamicInternalIps) return dynamicInternalIps;
  const ips = new Set<string>();
  const services = ['db', 'redis', 'mediamtx', 'app'];
  
  for (const svc of services) {
    try {
      const results = await dns.lookup(svc, { all: true });
      for (const res of results) {
        ips.add(res.address);
      }
    } catch {
      // Ignore resolution failures for services that might not be running or resolvable
    }
  }
  
  dynamicInternalIps = ips;
  return ips;
}

export function isBlockedIPv4(ip: string): boolean {
  if (!isIPv4(ip)) return false;
  
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return true;
  
  const [a, b] = parts;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  
  // 0.0.0.0/8 (Current network / ANY)
  if (a === 0) return true;
  
  // 169.254.0.0/16 (Link-local / Cloud Metadata)
  if (a === 169 && b === 254) return true;
  
  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;
  
  // 100.64.0.0/10 (CGNAT / Tailscale / k8s)
  if (a === 100 && b >= 64 && b <= 127) return true;

  return false;
}

function expandIPv6(ip: string): string {
  let str = ip.toLowerCase();
  
  // Handle IPv4-mapped IPv6 for expansion by converting the v4 part to hex?
  // No, we just need the prefix, so as long as the first hextets are correct it's fine.
  if (str.includes('::')) {
    const parts = str.split('::');
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts[1] ? parts[1].split(':') : [];
    // An IPv6 address has 8 segments. If the last segment is an IPv4 address, it counts as 2 segments.
    const isV4Mapped = right.length > 0 && right[right.length - 1].includes('.');
    const totalTarget = isV4Mapped ? 7 : 8;
    const missing = totalTarget - (left.length + right.length);
    const middle = Array(Math.max(0, missing)).fill('0000');
    str = [...left, ...middle, ...right].join(':');
  }
  
  return str.split(':').map(p => {
    if (p.includes('.')) return p; // Leave IPv4 part alone
    return p.padStart(4, '0');
  }).join(':');
}

export function isBlockedIPv6(ip: string): boolean {
  if (!isIPv6(ip)) return false;
  
  const lowerIp = ip.toLowerCase();
  
  // Loopback (::1)
  if (lowerIp === '::1' || lowerIp === '0:0:0:0:0:0:0:1') return true;
  
  // Unspecified (::)
  if (lowerIp === '::' || lowerIp === '0:0:0:0:0:0:0:0') return true;
  
  // IPv4-mapped IPv6 loopbacks and blocked ranges (e.g. ::ffff:127.0.0.1)
  // Simple mitigation: if it contains an IPv4 sequence, extract and check it.
  const v4Match = lowerIp.match(/ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  if (v4Match && v4Match[1]) {
    return isBlockedIPv4(v4Match[1]);
  }
  
  // Link-local (fe80::/10)
  if (lowerIp.startsWith('fe8') || lowerIp.startsWith('fe9') || lowerIp.startsWith('fea') || lowerIp.startsWith('feb')) return true;
  
  // Multicast (ff00::/8)
  if (lowerIp.startsWith('ff')) return true;

  // Unique Local Addresses (ULA) (fc00::/7)
  // Expand the IP to reliably check the prefix regardless of compression
  const expanded = expandIPv6(ip);
  if (expanded.startsWith('fc') || expanded.startsWith('fd')) return true;

  return false;
}

export async function validateAndResolveHostname(hostname: string): Promise<string> {
  let ipsToValidate: string[] = [];

  if (isIPv4(hostname) || isIPv6(hostname)) {
    ipsToValidate = [hostname];
  } else {
    try {
      const records = await dns.lookup(hostname, { all: true });
      if (!records || records.length === 0) {
        throw new Error('DNS resolution returned no records');
      }
      ipsToValidate = records.map(r => r.address);
    } catch (err: unknown) {
      throw new Error(`Failed to resolve hostname: ${(err as Error).message}`);
    }
  }

  const internalIps = await getInternalDockerIps();

  for (const ip of ipsToValidate) {
    if (isBlockedIPv4(ip) || isBlockedIPv6(ip)) {
      throw new Error(`SSRF Blocked: IP address ${ip} is in a restricted range.`);
    }
    if (internalIps.has(ip)) {
      throw new Error(`SSRF Blocked: IP address ${ip} maps to an internal infrastructure service.`);
    }
  }

  // All IPs are safe. Return the first one for deterministic routing safely.
  return ipsToValidate[0];
}
