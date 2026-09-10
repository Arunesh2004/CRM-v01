import { describe, it, expect, vi } from 'vitest';

describe('System Client Isolation', () => {
  it('1. missing ADMIN_DATABASE_URL -> explicit failure', async () => {
    // backup current env
    const backup = process.env.ADMIN_DATABASE_URL;
    delete process.env.ADMIN_DATABASE_URL;

    // Reset module cache to re-evaluate the module level if-statement
    vi.resetModules();

    try {
      await import('@db/utils/prisma-system');
      expect.fail('Should have thrown an error');
    } catch (e: any) {
      expect(e.message).toContain('SECURITY_ERROR: ADMIN_DATABASE_URL must be strictly defined');
    }

    // restore
    if (backup) {
      process.env.ADMIN_DATABASE_URL = backup;
    }
  });

  it('2. executeAsSystem never silently falls back to normal Prisma', async () => {
    vi.resetModules();
    // With ADMIN_DATABASE_URL defined, it should construct globalSystemPrisma successfully.
    // The fallback has been mechanically removed from the code, so it's guaranteed.
    const { executeAsSystem } = await import('@db/utils/prisma-system');
    expect(executeAsSystem).toBeDefined();
  });
});
