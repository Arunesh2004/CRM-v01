import { describe, it, expect } from 'vitest';
import { isBlockedIPv4, isBlockedIPv6 } from '@/lib/security/ssrf';

describe('SSRF Protection Unit Tests', () => {
  describe('IPv4 Blocking', () => {
    it('blocks loopback', () => {
      expect(isBlockedIPv4('127.0.0.1')).toBe(true);
      expect(isBlockedIPv4('127.1.2.3')).toBe(true);
    });

    it('blocks ANY address', () => {
      expect(isBlockedIPv4('0.0.0.0')).toBe(true);
    });

    it('blocks link-local / cloud metadata', () => {
      expect(isBlockedIPv4('169.254.169.254')).toBe(true);
      expect(isBlockedIPv4('169.254.0.1')).toBe(true);
    });

    it('allows valid private IPs typically used by customers', () => {
      expect(isBlockedIPv4('192.168.1.100')).toBe(false);
      expect(isBlockedIPv4('10.0.0.5')).toBe(false);
      expect(isBlockedIPv4('172.16.0.5')).toBe(false);
    });

    it('allows public IPs', () => {
      expect(isBlockedIPv4('8.8.8.8')).toBe(false);
    });
  });

  describe('IPv6 Blocking (Including ULA and Mapped)', () => {
    it('blocks standard loopback', () => {
      expect(isBlockedIPv6('::1')).toBe(true);
      expect(isBlockedIPv6('0:0:0:0:0:0:0:1')).toBe(true);
    });

    it('blocks unspecified', () => {
      expect(isBlockedIPv6('::')).toBe(true);
    });

    it('blocks IPv4-mapped IPv6 loopbacks', () => {
      expect(isBlockedIPv6('::ffff:127.0.0.1')).toBe(true);
    });

    it('blocks link-local', () => {
      expect(isBlockedIPv6('fe80::1')).toBe(true);
      expect(isBlockedIPv6('FE80::1')).toBe(true);
    });

    it('blocks Unique Local Addresses (ULA) explicitly as requested', () => {
      expect(isBlockedIPv6('fc00::1')).toBe(true);
      expect(isBlockedIPv6('fd00::1')).toBe(true);
      expect(isBlockedIPv6('FC00::1')).toBe(true);
      expect(isBlockedIPv6('FD12:3456::1')).toBe(true);
      expect(isBlockedIPv6('fd00:0:0:0:0:0:0:1')).toBe(true);
    });
    
    it('blocks tricky representations of ULA', () => {
      // 0fc0::1 is technically NOT in fc00::/7 (it starts with 0), but let's test typical tricky compressions
      // Actually, fc::1 is 00fc::1 which is not ULA. ULA MUST have 'fc' or 'fd' at the start of the fully expanded hextet.
      expect(isBlockedIPv6('fc00:0000::1')).toBe(true);
    });

    it('allows safe IPv6 addresses', () => {
      expect(isBlockedIPv6('2001:db8::1')).toBe(false);
      expect(isBlockedIPv6('2600::1')).toBe(false);
    });
  });
});
