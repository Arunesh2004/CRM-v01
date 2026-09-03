import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import globalPrisma from '@db/utils/prisma';
import { withTenant } from '@db/utils/prisma-tenant';

describe('Soft Delete findUnique Vulnerability via withTenant', () => {
  let tenantA: any;
  let customerA: any;

  beforeEach(async () => {
    tenantA = await globalPrisma.tenant.create({ data: { name: 'Tenant A - SoftDelFindWT' } });
    customerA = await globalPrisma.customer.create({ data: { tenantId: tenantA.id, name: 'Del Cust WT', normalizedName: 'del cust wt', deletedAt: new Date() } });
  });

  afterEach(async () => {
    await globalPrisma.customer.deleteMany({});
    await globalPrisma.tenant.deleteMany({});
  });

  it('STRONG: findUnique via withTenant should exclude deleted records', async () => {
    const customer = await withTenant(tenantA.id).customer.findUnique({ where: { id: customerA.id } });
    expect(customer).toBeNull();
  });
});
