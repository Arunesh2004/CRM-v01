import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateAndResolveHostname, isBlockedIPv4, isBlockedIPv6 } from '@/lib/security/ssrf';

// Mock DNS
vi.mock('node:dns/promises', () => {
  return {
    default: {
      lookup: vi.fn(async (hostname) => {
        if (hostname === 'camera.example.com') return [{ address: '203.0.113.10', family: 4 }];
        if (hostname === 'evil.rebinding.com') return [{ address: '169.254.169.254', family: 4 }];
        if (hostname === 'db') return [{ address: '172.19.0.2', family: 4 }];
        if (hostname === 'redis') return [{ address: '172.19.0.3', family: 4 }];
        if (hostname === 'mediamtx') return [{ address: '172.19.0.5', family: 4 }];
        if (hostname === 'app') return [{ address: '172.19.0.4', family: 4 }];
        throw new Error('ENOTFOUND');
      })
    }
  };
});

describe('SSRF Protection (Phase C10.2)', () => {
  describe('IPv4 Blocklist', () => {
    it('blocks loopback', () => {
      expect(isBlockedIPv4('127.0.0.1')).toBe(true);
      expect(isBlockedIPv4('127.1.2.3')).toBe(true);
    });
    
    it('blocks cloud metadata', () => {
      expect(isBlockedIPv4('169.254.169.254')).toBe(true);
    });

    it('blocks current network', () => {
      expect(isBlockedIPv4('0.0.0.0')).toBe(true);
    });

    it('allows valid private ranges (RFC1918) for corporate cameras', () => {
      expect(isBlockedIPv4('192.168.1.100')).toBe(false);
      expect(isBlockedIPv4('10.0.0.5')).toBe(false);
      expect(isBlockedIPv4('172.16.0.10')).toBe(false);
    });
  });

  describe('IPv6 Blocklist', () => {
    it('blocks loopback', () => {
      expect(isBlockedIPv6('::1')).toBe(true);
      expect(isBlockedIPv6('0:0:0:0:0:0:0:1')).toBe(true);
    });
    
    it('blocks IPv4-mapped loopback', () => {
      expect(isBlockedIPv6('::ffff:127.0.0.1')).toBe(true);
    });
  });

  describe('DNS Resolution & Rebinding Prevention', () => {
    it('resolves and allows valid hostnames', async () => {
      const ip = await validateAndResolveHostname('camera.example.com');
      expect(ip).toBe('203.0.113.10');
    });

    it('rejects domains that resolve to blocked IPs', async () => {
      await expect(validateAndResolveHostname('evil.rebinding.com')).rejects.toThrow(/SSRF Blocked/);
    });

    it('rejects docker internal hostnames', async () => {
      await expect(validateAndResolveHostname('db')).rejects.toThrow(/SSRF Blocked/);
      await expect(validateAndResolveHostname('redis')).rejects.toThrow(/SSRF Blocked/);
    });
  });
});
