import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { checkPermissionFast, requirePermission, requirePermissionFast } from '../../lib/auth';
import * as crypto from 'crypto';

describe('AI Permission Module Tests', () => {
  const tenantId = crypto.randomUUID();
  const unauthUserId = crypto.randomUUID();

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantId}', 'Tenant A', now(), now())`);
      await tx.$executeRawUnsafe(`-- Unauthorized User
        INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") 
        VALUES ('${unauthUserId}', '${tenantId}', 'unauth@test.com', 'ACTIVE', now(), now())`);
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // Cannot delete tenant because of FK
    });
  });

  it('denies AI prompt execution for user without AI roles', async () => {
    await expect(
      requirePermissionFast(unauthUserId, 'AI_EVENT', 'CREATE')
    ).rejects.toThrow(/Forbidden/);
  });
});
