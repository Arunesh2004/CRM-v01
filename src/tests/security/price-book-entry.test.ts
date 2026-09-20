import { describe, it, expect, beforeAll, vi } from 'vitest';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { PriceBookEntryService, priceBookEntryCreateSchema } from '../../modules/revenue/price-book-entry.service';
import * as auth from '../../lib/auth';

vi.spyOn(auth, 'requirePermissionFast').mockResolvedValue(true);

describe('PriceBookEntry Validation and Tenant Isolation', () => {
  let tenantA = '';
  let tenantB = '';
  let adminUserId = '';
  let userBId = '';

  let priceBookA = '';
  let productA = '';
  let priceBookB = '';
  let productB = '';

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const ta = await tx.tenant.create({ data: { name: 'Tenant A - PBE Test' } });
      const tb = await tx.tenant.create({ data: { name: 'Tenant B - PBE Test' } });
      tenantA = ta.id;
      tenantB = tb.id;

      const userA = await tx.user.create({ data: { tenantId: tenantA, email: 'adminA_pbe@test.com', firstName: 'Admin', lastName: 'A' } });
      adminUserId = userA.id;

      const userB = await tx.user.create({ data: { tenantId: tenantB, email: 'userB_pbe@test.com', firstName: 'User', lastName: 'B' } });
      userBId = userB.id;

      // Seed core objects
      const pbA = await tx.priceBook.create({ data: { tenantId: tenantA, name: 'PB A' } });
      const prodA = await tx.product.create({ data: { tenantId: tenantA, name: 'Prod A', sku: 'A1' } });
      priceBookA = pbA.id;
      productA = prodA.id;

      const pbB = await tx.priceBook.create({ data: { tenantId: tenantB, name: 'PB B' } });
      const prodB = await tx.product.create({ data: { tenantId: tenantB, name: 'Prod B', sku: 'B1' } });
      priceBookB = pbB.id;
      productB = prodB.id;
    });
  });

  it('1. Valid PriceBookEntry creation input passes validation', () => {
    const data = {
      priceBookId: priceBookA,
      productId: productA,
      unitPrice: '100.50'
    };
    const result = priceBookEntryCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('2. Invalid Decimal input fails validation', () => {
    const result1 = priceBookEntryCreateSchema.safeParse({ priceBookId: priceBookA, productId: productA, unitPrice: 'abc' });
    expect(result1.success).toBe(false);

    const result2 = priceBookEntryCreateSchema.safeParse({ priceBookId: priceBookA, productId: productA, unitPrice: '-50.00' });
    expect(result2.success).toBe(false);
  });

  it('3. Can create and read PriceBookEntry scoped to tenant', async () => {
    const pbe = await PriceBookEntryService.createPriceBookEntry(tenantA, adminUserId, { 
      priceBookId: priceBookA,
      productId: productA,
      unitPrice: '199.99' 
    });
    expect(pbe).toBeDefined();
    expect(pbe.tenantId).toBe(tenantA);
    expect(pbe.unitPrice.toString()).toBe('199.99');

    const entries = await PriceBookEntryService.getPriceBookEntries(tenantA, adminUserId, priceBookA);
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries.map(e => e.id)).toContain(pbe.id);
  });

  it('4. Cannot create entry with cross-tenant PriceBook', async () => {
    await expect(
      PriceBookEntryService.createPriceBookEntry(tenantB, userBId, { 
        priceBookId: priceBookA, // Tenant A's pricebook
        productId: productB,
        unitPrice: '50' 
      })
    ).rejects.toThrow('PriceBook not found');
  });

  it('5. Cannot create entry with cross-tenant Product', async () => {
    await expect(
      PriceBookEntryService.createPriceBookEntry(tenantB, userBId, { 
        priceBookId: priceBookB,
        productId: productA, // Tenant A's product
        unitPrice: '50' 
      })
    ).rejects.toThrow('Product not found');
  });

  it('6. Duplicate entries are caught and sanitized', async () => {
    await expect(
      PriceBookEntryService.createPriceBookEntry(tenantA, adminUserId, { 
        priceBookId: priceBookA,
        productId: productA, // Already added in test #3
        unitPrice: '250' 
      })
    ).rejects.toThrow('This product is already in the PriceBook');
  });
});
