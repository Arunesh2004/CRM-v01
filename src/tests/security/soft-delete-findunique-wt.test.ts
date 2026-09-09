import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { withTenant } from '@db/utils/prisma-tenant';
import { executeAsSystem, SystemOperation } from "@db/utils/prisma-system";

describe('Soft Delete findUnique Vulnerability via withTenant', () => {
  let tenantA: any;
  let customerA: any;

  beforeEach(async () => {
    tenantA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.tenant.create({ data: { name: 'Tenant A - SoftDelFindWT' } }));
    customerA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.customer.create({ data: { tenantId: tenantA.id, name: 'Del Cust WT', normalizedName: 'del cust wt', deletedAt: new Date() } }));
  });

  afterEach(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.customer.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.tenant.deleteMany({})).catch(() => {});
  });

  it('STRONG: findUnique via withTenant should exclude deleted records', async () => {
    const customer = await withTenant(tenantA.id).customer.findUnique({ where: { id: customerA.id } });
    expect(customer).toBeNull();
  });
});
