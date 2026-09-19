import { describe, it, expect, beforeAll, vi } from 'vitest';
import prisma from '../../../database/utils/prisma';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { PriceBookService, priceBookCreateSchema, priceBookUpdateSchema } from '../../modules/revenue/price-book.service';
import * as auth from '../../lib/auth';
import { ZodError } from 'zod';

vi.spyOn(auth, 'requirePermissionFast').mockResolvedValue(true);

describe('T007-7: PriceBook Validation and Tenant Isolation', () => {
  let tenantA = '';
  let tenantB = '';
  let adminUserId = '';
  let userBId = '';

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const ta = await tx.tenant.create({ data: { name: 'Tenant A - PB Test' } });
      const tb = await tx.tenant.create({ data: { name: 'Tenant B - PB Test' } });
      tenantA = ta.id;
      tenantB = tb.id;

      const userA = await tx.user.create({ data: { tenantId: tenantA, email: 'adminA_pb@test.com', firstName: 'Admin', lastName: 'A' } });
      adminUserId = userA.id;

      const userB = await tx.user.create({ data: { tenantId: tenantB, email: 'userB_pb@test.com', firstName: 'User', lastName: 'B' } });
      userBId = userB.id;
    });
  });

  it('1. Valid PriceBook creation input passes validation', () => {
    const data = {
      name: 'Standard Price Book',
      currencyCode: 'USD',
      description: 'Default catalog'
    };
    const result = priceBookCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('2. Empty/invalid name fails validation', () => {
    const result1 = priceBookCreateSchema.safeParse({ name: '' });
    expect(result1.success).toBe(false);

    const result2 = priceBookCreateSchema.safeParse({ currencyCode: 'US' }); // missing name and invalid currency
    expect(result2.success).toBe(false);
  });

  it('3. Can create and read PriceBooks scoped to tenant', async () => {
    const pb = await PriceBookService.createPriceBook(tenantA, adminUserId, { name: 'Tenant A PB' });
    expect(pb).toBeDefined();
    expect(pb.tenantId).toBe(tenantA);
    expect(pb.name).toBe('Tenant A PB');
    expect(pb.currencyCode).toBe('USD'); // Default

    const pbsA = await PriceBookService.getPriceBooks(tenantA, adminUserId);
    expect(pbsA.length).toBeGreaterThanOrEqual(1);
    expect(pbsA.map(p => p.id)).toContain(pb.id);

    // Tenant B should not see it
    const pbsB = await PriceBookService.getPriceBooks(tenantB, userBId);
    expect(pbsB.map(p => p.id)).not.toContain(pb.id);
  });

  it('4. Cannot read cross-tenant PriceBook', async () => {
    const pb = await PriceBookService.createPriceBook(tenantA, adminUserId, { name: 'Secret PB' });
    
    // Simulating Tenant B user trying to fetch Tenant A's pricebook ID, but with Tenant B context
    await expect(
      PriceBookService.getPriceBook(tenantB, userBId, pb.id)
    ).rejects.toThrow('PriceBook not found');
  });
});
