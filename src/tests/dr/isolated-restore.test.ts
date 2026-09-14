import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { requestRestore } from '@/modules/recovery/restore.engine';
import globalPrisma from '@db/utils/prisma';

describe('Disaster Recovery Isolated Restore', () => {
  beforeEach(async () => {
    vi.stubEnv('ALLOW_DESTRUCTIVE_RESTORE', 'true');
    vi.stubEnv('RECOVERY_TARGET_ENV', 'isolated_recovery');
    vi.stubEnv('NODE_ENV', 'test');
    await globalPrisma.recoveryJob.deleteMany();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await globalPrisma.recoveryJob.deleteMany();
  });

  it('DR1: Fails closed if ALLOW_DESTRUCTIVE_RESTORE is not true for RECOVERY mode', async () => {
    vi.stubEnv('ALLOW_DESTRUCTIVE_RESTORE', 'false');

    await expect(requestRestore('local://123e4567-e89b-12d3-a456-426614174000/archive', 'fake-checksum', 'owner-id', 'RECOVERY'))
      .rejects.toThrow('Forbidden: Destructive RECOVERY mode is disabled in this environment.');
  });

  it('DR2: Fails closed if RECOVERY_TARGET_ENV is not isolated_recovery', async () => {
    vi.stubEnv('RECOVERY_TARGET_ENV', 'some_other_env');

    await expect(requestRestore('local://123e4567-e89b-12d3-a456-426614174000/archive', 'fake-checksum', 'owner-id', 'RECOVERY'))
      .rejects.toThrow('Forbidden: RECOVERY must explicitly target an isolated environment.');
  });

  it('DR3: Fails closed if NODE_ENV is production', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    await expect(requestRestore('local://123e4567-e89b-12d3-a456-426614174000/archive', 'fake-checksum', 'owner-id', 'RECOVERY'))
      .rejects.toThrow('Forbidden: RECOVERY must explicitly target an isolated environment.');
  });

  it('DR4: Allows RECOVERY when authorized and correctly targeted', async () => {
    // This will hit the next stage: Enumeration prevention (since checksum is fake)
    // But it passes the environment guards
    await expect(requestRestore('local://123e4567-e89b-12d3-a456-426614174000/archive', 'fake-checksum', 'owner-id', 'RECOVERY'))
      .rejects.toThrow('Forbidden: Archive identity cannot be verified');
  });

  it('DR5: CLONE mode remains safe and allowed in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    
    // Bypass the RECOVERY checks, hits the archive identity check
    await expect(requestRestore('local://123e4567-e89b-12d3-a456-426614174000/archive', 'fake-checksum', 'owner-id', 'CLONE'))
      .rejects.toThrow('Forbidden: Archive identity cannot be verified');
  });

  it('DR6: DRY_RUN mode remains safe and allowed in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    
    await expect(requestRestore('local://123e4567-e89b-12d3-a456-426614174000/archive', 'fake-checksum', 'owner-id', 'DRY_RUN'))
      .rejects.toThrow('Forbidden: Archive identity cannot be verified');
  });
});
