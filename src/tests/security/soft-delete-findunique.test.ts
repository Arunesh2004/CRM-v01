import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import globalPrisma from '@db/utils/prisma';

describe('Soft Delete findUnique Vulnerability', () => {
  let tenantA: any;
  let customerA: any;

  beforeEach(async () => {
    tenantA = await globalPrisma.tenant.create({ data: { name: 'Tenant A - SoftDelFind' } });
    customerA = await globalPrisma.customer.create({ data: { tenantId: tenantA.id, name: 'Del Cust', normalizedName: 'del cust', deletedAt: new Date() } });
  });

  afterEach(async () => {
    await globalPrisma.customer.deleteMany({});
    await globalPrisma.tenant.deleteMany({});
  });

  it('STRONG: findUnique should exclude deleted records or at least application should prevent access', async () => {
    const customer = await globalPrisma.customer.findUnique({ where: { id: customerA.id } });
    // If it finds it, we have a leak!
    expect(customer).toBeNull();
  });
});
