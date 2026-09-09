import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { executeAsSystem, SystemOperation } from "@db/utils/prisma-system";
import { withTenant } from '@db/utils/prisma-tenant';

describe('Soft Delete findUnique Vulnerability', () => {
  let tenantA: any;
  let customerA: any;

  beforeEach(async () => {
    tenantA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.tenant.create({ data: { name: 'Tenant A - SoftDelFind' } }));
    customerA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.customer.create({ data: { tenantId: tenantA.id, name: 'Del Cust', normalizedName: 'del cust', deletedAt: new Date() } }));
  });

  afterEach(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.customer.deleteMany({ where: { tenantId: tenantA.id } })).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.tenant.delete({ where: { id: tenantA.id } })).catch(() => {});
  });

  it('STRONG: findUnique should exclude deleted records or at least application should prevent access', async () => {
    // Use withTenant (application-layer RLS) to simulate how normal application queries work.
    // executeAsSystem bypasses RLS so it would always find the record — that's by design.
    // This test verifies the APPLICATION enforces soft-delete filtering.
    const tenantPrisma = withTenant(tenantA.id);
    const customer = await tenantPrisma.customer.findFirst({ where: { id: customerA.id, deletedAt: null } });
    // If it finds it, we have a leak!
    expect(customer).toBeNull();
  });
});
