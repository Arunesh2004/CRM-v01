import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { validateEnvironment, ENV } from '@/lib/config/env';

describe('PHASE S16.1A.2J: CCTV Startup Decoupling Configuration', () => {
  const originalEnv = process.env;
  let consoleWarnSpy: MockInstance;
  let consoleLogSpy: MockInstance;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    
    // Provide core config to prevent core validation failures
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_123';
    process.env.CLERK_SECRET_KEY = 'sk_test_123';
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_123';
    process.env.ENCRYPTION_KEY = '01234567890123456789012345678901';

    // Remove CCTV variables
    delete process.env.CCTV_STREAM_JWT_SECRET;
    delete process.env.CCTV_OPAQUE_PATH_SECRET;
    delete process.env.MEDIAMTX_API_URL;
    delete process.env.MEDIAMTX_WEBHOOK_SECRET;
    delete process.env.PUBLIC_APP_URL;

    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('Test 1: Core configuration valid + CCTV absent', () => {
    expect(() => validateEnvironment()).not.toThrow();
    expect(ENV.cctvEnabled).toBe(false);
    expect(consoleLogSpy).toHaveBeenCalledWith('INFO: CCTV integration is not configured. CCTV features will be disabled.');
  });

  it('Test 2: Core configuration invalid', () => {
    delete process.env.DATABASE_URL;
    expect(() => validateEnvironment()).toThrow(/CRITICAL STARTUP FAILURE: Missing required environment variables: DATABASE_URL/);
  });

  it('Test 3: CCTV partially configured', () => {
    process.env.CCTV_STREAM_JWT_SECRET = 'secret';
    // Missing MEDIAMTX_API_URL, etc.
    expect(() => validateEnvironment()).not.toThrow();
    expect(ENV.cctvEnabled).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('WARNING: CCTV integration is partially configured. Missing variables')
    );
  });

  it('Test 4: CCTV fully configured', () => {
    process.env.CCTV_STREAM_JWT_SECRET = 'secret123';
    process.env.CCTV_OPAQUE_PATH_SECRET = 'opaque123';
    process.env.MEDIAMTX_API_URL = 'http://mediamtx:9997';
    process.env.MEDIAMTX_WEBHOOK_SECRET = 'whsec123';
    process.env.PUBLIC_APP_URL = 'https://crm-v01.vercel.app';

    expect(() => validateEnvironment()).not.toThrow();
    expect(ENV.cctvEnabled).toBe(true);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('Test 5 & 6: CCTV unavailable -> No stream JWT minted or MediaMTX API requests', () => {
    expect(ENV.cctvEnabled).toBe(false);
    expect(() => ENV.cctvStreamJwtSecret).toThrow('CCTV module is disabled');
    expect(() => ENV.mediamtxApiUrl).toThrow('CCTV module is disabled');
  });

  it('Test 7: Webhook endpoint without valid CCTV configuration fails safely', () => {
    expect(ENV.cctvEnabled).toBe(false);
    expect(() => ENV.mediamtxWebhookSecret).toThrow('CCTV module is disabled');
  });
});
