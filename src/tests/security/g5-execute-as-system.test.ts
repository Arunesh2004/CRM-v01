import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { Logger } from '@/lib/logger/logger';

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: class {
      $transaction = vi.fn().mockImplementation(async (cb) => cb({}));
    }
  };
});

vi.mock('@/lib/logger/logger', () => ({
  Logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() }
}));

describe('G5: executeAsSystem Logging Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs operation categorically without dumping raw context', async () => {
    const sensitiveContext = {
      password: 'super-secret-password',
      token: 'sk-1234567890',
      database_url: 'postgres://user:pass@host/db'
    };

    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async () => {
      return 'success';
    }, sensitiveContext);

    expect(Logger.warn).toHaveBeenCalledWith('System RLS Bypass Invoked', expect.objectContaining({
      operation: SystemOperation.SECURITY_AUDIT,
      hasContext: true,
    }));

    // Ensure sensitive context was NOT logged
    const warnCall = vi.mocked(Logger.warn).mock.calls[0];
    const logPayload = JSON.stringify(warnCall);
    expect(logPayload).not.toContain('super-secret-password');
    expect(logPayload).not.toContain('sk-1234567890');
    expect(logPayload).not.toContain('postgres://');
  });
});
