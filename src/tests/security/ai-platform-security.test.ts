import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { ContextBuilderService } from '../../modules/ai/context/context-builder.service';
import * as crypto from 'crypto';

describe('AI Platform Security Tests (Context Builder)', () => {
  const tenantAId = crypto.randomUUID();
  const tenantBId = crypto.randomUUID();
  const userAId = crypto.randomUUID();

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.tenant.create({ data: { id: tenantAId, name: 'Tenant A' } });
      await tx.tenant.create({ data: { id: tenantBId, name: 'Tenant B' } });
      const created = await tx.user.create({ data: { id: userAId, tenantId: tenantAId, email: 'userA@test.com', firstName: 'A', lastName: 'A', clerkId: crypto.randomUUID(), status: 'ACTIVE' } });
      console.log('Created user:', created.id, created.tenantId);
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // Cleanup omitted due to FK constraints
    });
  });

  it('builds context securely for the correct tenant', async () => {
    const context = await ContextBuilderService.buildUserContext(tenantAId, userAId);
    expect(context.tenantId).toBe(tenantAId);
    expect(context.user.id).toBe(userAId);
  });

  it('denies context building if tenant ID is mismatched (IDOR attempt)', async () => {
    // Attack: User A attempts to build context pretending to be in Tenant B
    await expect(
      ContextBuilderService.buildUserContext(tenantBId, userAId)
    ).rejects.toThrow(/User not found/);
  });
});
