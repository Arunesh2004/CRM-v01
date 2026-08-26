import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { createDeal } from '../../modules/crm/deal/deal.service';
import * as authLib from '../../lib/auth';
import { withTenant, withTenantTransaction } from '../../../database/utils/prisma-tenant';
import * as crypto from 'crypto';

describe('Adversarial RLS / Multi-Tenant Attacks', () => {
  const tenantAId = crypto.randomUUID();
  const tenantBId = crypto.randomUUID();
  const customerAId = crypto.randomUUID();
  const customerBId = crypto.randomUUID();
  const userAId = crypto.randomUUID();
  const userBId = crypto.randomUUID();
  const pipelineAId = crypto.randomUUID();
  const stageAId = crypto.randomUUID();

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // Create Tenants
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantAId}', 'Tenant A', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantBId}', 'Tenant B', now(), now())`);
      
      // Create Users
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, email, "tenantId", status, "onboardingStatus", "createdAt", "updatedAt") VALUES ('${userAId}', 'a@example.com', '${tenantAId}', 'ACTIVE', 'COMPLETED', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, email, "tenantId", status, "onboardingStatus", "createdAt", "updatedAt") VALUES ('${userBId}', 'b@example.com', '${tenantBId}', 'ACTIVE', 'COMPLETED', now(), now())`);
        
      // Create Customers
      await tx.$executeRawUnsafe(`INSERT INTO "Customer" (id, "tenantId", name, "normalizedName", "createdAt", "updatedAt") VALUES ('${customerAId}', '${tenantAId}', 'Cust A', 'cust a', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Customer" (id, "tenantId", name, "normalizedName", "createdAt", "updatedAt") VALUES ('${customerBId}', '${tenantBId}', 'Customer B', 'customer b', now(), now())`);

      // Create Pipeline/Stage
      await tx.$executeRawUnsafe(`INSERT INTO "Pipeline" (id, "tenantId", name, "createdAt", "updatedAt") VALUES ('${pipelineAId}', '${tenantAId}', 'Pipe A', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "PipelineStage" (id, "pipelineId", "tenantId", name, "order", "createdAt", "updatedAt") VALUES ('${stageAId}', '${pipelineAId}', '${tenantAId}', 'Stage A', 1, now(), now())`);
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`DELETE FROM "PipelineStage" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "Pipeline" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "Customer" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "User" WHERE "tenantId" IN ('${tenantAId}', '${tenantBId}')`);
      await tx.$executeRawUnsafe(`DELETE FROM "Tenant" WHERE id IN ('${tenantAId}', '${tenantBId}')`);
    });
  });

  it('ATTACK: Tenant A attempts to update Customer B via cross-tenant ID injection', async () => {
    const tenantAPrisma = withTenant(tenantAId);
    
    // Attempt to update Customer B using Tenant A's client
    await expect(
      tenantAPrisma.customer.update({
        where: { id: customerBId },
        data: { name: 'HACKED BY A' }
      })
    ).rejects.toThrow(); // Should fail due to RLS

    // Verify it was not updated
    const checkPrisma = withTenant(tenantBId);
    const customer = await checkPrisma.customer.findUnique({
      where: { id: customerBId }
    });
    expect(customer?.name).not.toBe('HACKED BY A');
    expect(customer?.name).toBe('Customer B');
  });

  it('ATTACK: Tenant A attempts to delete Customer B', async () => {
    const tenantAPrisma = withTenant(tenantAId);
    
    await expect(
      tenantAPrisma.customer.delete({
        where: { id: customerBId }
      })
    ).rejects.toThrow();

    // Verify still exists
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      const res = await tx.customer.findUnique({ where: { id: customerBId }});
      expect(res).not.toBeNull();
    });
  });

  it('ATTACK: Tenant A attempts to create a record bound to Tenant B', async () => {
    const tenantAPrisma = withTenant(tenantAId);
    
    // In our implementation, Prisma extension NORMALIZES the payload and ignores foreign tenantIds instead of throwing
    const created = await tenantAPrisma.customer.create({
      data: {
        id: crypto.randomUUID(),
        tenantId: tenantBId, // Injecting foreign tenant ID
        name: 'MALICIOUS CUSTOMER',
        normalizedName: 'malicious customer'
      }
    });
    
    // It should have overwritten tenantId with tenantAId
    expect(created.tenantId).toBe(tenantAId);
    expect(created.tenantId).not.toBe(tenantBId);
  });

  it('ATTACK: Tenant A attempts nested relation BOLA via createDeal', async () => {
     // We attack the service layer directly
     vi.spyOn(authLib, 'requireAuth').mockResolvedValue({ id: userAId, email: 'tester@test.com', status: 'ACTIVE', userRoles: [] } as any);
     vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenantAId);
     vi.spyOn(authLib, 'requirePermission').mockResolvedValue(true);

     // Tenant A attempts to create a Deal pointing to Tenant B's customer
     await expect(
       createDeal({
         title: 'Malicious Deal',
         value: 100,
         pipelineId: pipelineAId,
         stageId: stageAId,
         assignedUserId: userAId,
         customerId: customerBId // BOLA
       })
     ).rejects.toThrow();
  });
  
  it('ATTACK: Concurrent connection pool tenant contamination', async () => {
     const tenantAPrisma = withTenant(tenantAId);
     const tenantBPrisma = withTenant(tenantBId);
     
     // Blast both concurrently
     const promises = [];
     for(let i=0; i<50; i++) {
        promises.push(
            tenantAPrisma.customer.findMany().then(res => ({ tenant: 'A', res })),
            tenantBPrisma.customer.findMany().then(res => ({ tenant: 'B', res }))
        );
     }
     
     const results = await Promise.all(promises);
     
     // Verify NO cross-contamination
     for (const r of results) {
         if (r.tenant === 'A') {
             // Should only see Customer A
             expect(r.res.every(c => c.tenantId === tenantAId)).toBe(true);
             expect(r.res.some(c => c.tenantId === tenantBId)).toBe(false);
         } else {
             // Should only see Customer B
             expect(r.res.every(c => c.tenantId === tenantBId)).toBe(true);
             expect(r.res.some(c => c.tenantId === tenantAId)).toBe(false);
         }
     }
  });
});
