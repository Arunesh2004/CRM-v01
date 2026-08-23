import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import prisma from '../../../database/utils/prisma';
import { withTenantTransaction } from '../../../database/utils/prisma-tenant';
import * as crypto from 'crypto';

describe('Audit Integrity Security Tests', () => {
  const tenantId = crypto.randomUUID();
  const auditId = crypto.randomUUID();

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantId}', 'Tenant A', now(), now())`);
      await tx.$executeRawUnsafe(`-- Insert genuine audit record
        INSERT INTO "AuditLog" (id, "tenantId", "actorId", "actorType", action, resource, "resourceId", timestamp)
        VALUES ('${auditId}', '${tenantId}', 'SYSTEM', 'SYSTEM', 'TEST_ACTION', 'TEST_RESOURCE', '123', now())`);
    });
  });

  afterAll(async () => {
    // Only SYSTEM with trigger bypass can delete an AuditLog, or deleting the Tenant cascades it
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // Cannot delete tenant because of AuditLog references
    });
  });

  it('blocks attempts to DELETE an AuditLog record', async () => {
    await prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      await expect(
        tx.$executeRawUnsafe(`DELETE FROM "AuditLog" WHERE id = '${auditId}'`)
      ).rejects.toThrow();
    });
  });

  it('blocks attempts to UPDATE an AuditLog record', async () => {
    await prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      await expect(
        tx.$executeRawUnsafe(`UPDATE "AuditLog" SET action = 'HACKED' WHERE id = '${auditId}'`)
      ).rejects.toThrow();
    });
  });
});
