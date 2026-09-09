import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateCustomer } from '@/modules/crm/customer/customer.service';
import { executeAsSystem, SystemOperation } from "@db/utils/prisma-system";

const mockAuth = { user: { id: 'test_user_id' }, tenantId: 'test_tenant_id', permission: true };

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(async () => mockAuth.user),
  requireTenant: vi.fn(async () => mockAuth.tenantId),
  requirePermission: vi.fn(async () => true),
  requireAuthIdentity: vi.fn(async () => mockAuth.user),
  requireTenantFromIdentity: vi.fn(async () => mockAuth.tenantId),
  requirePermissionFast: vi.fn(async () => true),
}));

describe('Soft Delete Vulnerability', () => {
  let tenantA: any;
  let userA: any;
  let customerA: any;

  beforeEach(async () => {
    tenantA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.tenant.create({ data: { name: 'Tenant A - SoftDel' } }));
    userA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.user.create({ data: { email: 'user@softdel.com', clerkId: 'c1', tenantId: tenantA.id, status: 'ACTIVE' } }));
    mockAuth.user = userA; mockAuth.tenantId = tenantA.id;
    customerA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.customer.create({ data: { tenantId: tenantA.id, name: 'Del Cust', normalizedName: 'del cust', deletedAt: new Date() } }));
  });

  afterEach(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.customer.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.user.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.tenant.deleteMany({})).catch(() => {});
    vi.resetAllMocks();
  });

  it('MODERATE: Should not allow update of soft-deleted customer', async () => {
    let errorOccurred = false;
    try {
      await updateCustomer({ id: customerA.id, name: 'Hacked Name' });
    } catch (e: any) {
      errorOccurred = true;
      expect(e.message).toBe('Customer not found');
    }
    
    // If we can update a deleted customer, it's a vulnerability (or at least a bug).
    // The instructions say "deleted records cannot be modified normally".
    expect(errorOccurred).toBe(true);
  });
});
