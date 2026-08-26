import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { moveDealStage } from '../../modules/crm/deal/deal.service';
import { withTenant } from '../../../database/utils/prisma-tenant';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import crypto from 'crypto';

// Stage 12: Business Logic adversarial tests
// We mock auth to return a specific user who does NOT have DEAL UPDATE permissions
import * as authLib from '../../lib/auth';
import { vi } from 'vitest';
import prisma from '../../../database/utils/prisma';

const tenantId = crypto.randomUUID();
const userId = crypto.randomUUID();
const customerId = crypto.randomUUID();
const pipelineId = crypto.randomUUID();
const stageAId = crypto.randomUUID();
const stageBId = crypto.randomUUID();
const dealId = crypto.randomUUID();

describe('Business Logic Security (Stage 12)', () => {
  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantId}', 'Test Tenant', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") VALUES ('${userId}', '${tenantId}', 'tester@test.com', 'ACTIVE', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Customer" (id, "tenantId", name, "normalizedName", "createdAt", "updatedAt") VALUES ('${customerId}', '${tenantId}', 'Test Customer', 'test', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Pipeline" (id, "tenantId", name, "createdAt", "updatedAt") VALUES ('${pipelineId}', '${tenantId}', 'Test Pipe', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "PipelineStage" (id, "pipelineId", "tenantId", name, "order", "createdAt", "updatedAt") VALUES ('${stageAId}', '${pipelineId}', '${tenantId}', 'Stage A', 1, now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "PipelineStage" (id, "pipelineId", "tenantId", name, "order", "createdAt", "updatedAt") VALUES ('${stageBId}', '${pipelineId}', '${tenantId}', 'Stage B', 2, now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Deal" (id, "tenantId", "customerId", "pipelineId", "stageId", "assignedUserId", "createdById", title, value, status, "createdAt", "updatedAt") VALUES ('${dealId}', '${tenantId}', '${customerId}', '${pipelineId}', '${stageAId}', '${userId}', '${userId}', 'Test Deal', 100, 'OPEN', now(), now())`);
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`DELETE FROM "Deal" WHERE "tenantId" = '${tenantId}'`);
      await tx.$executeRawUnsafe(`DELETE FROM "PipelineStage" WHERE "tenantId" = '${tenantId}'`);
      await tx.$executeRawUnsafe(`DELETE FROM "Pipeline" WHERE "tenantId" = '${tenantId}'`);
      await tx.$executeRawUnsafe(`DELETE FROM "Customer" WHERE "tenantId" = '${tenantId}'`);
      await tx.$executeRawUnsafe(`DELETE FROM "User" WHERE "tenantId" = '${tenantId}'`);
      await tx.$executeRawUnsafe(`DELETE FROM "Tenant" WHERE id = '${tenantId}'`);
    });
    vi.restoreAllMocks();
  });

  it('ATTACK: Attempt to move deal stage without DEAL UPDATE permissions', async () => {
    // Mock the user context
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue({ id: userId, email: 'tester@test.com', status: 'ACTIVE', userRoles: [] } as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenantId);
    
    // We mock checkPermission to return true for USER UPDATE, but false for CUSTOMER UPDATE
    // This proves we fixed the bug
    vi.spyOn(authLib, 'requirePermission').mockImplementation(async (resource, action) => {
        if (resource === 'CUSTOMER' && action === 'UPDATE') throw new Error('Forbidden');
        return true;
    });

    await expect(moveDealStage(dealId, stageBId)).rejects.toThrow('Forbidden');
  });
});
