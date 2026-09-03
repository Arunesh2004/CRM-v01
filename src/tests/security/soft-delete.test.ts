import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateCustomer } from '@/modules/crm/customer/customer.service';
import globalPrisma from '@db/utils/prisma';

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
    tenantA = await globalPrisma.tenant.create({ data: { name: 'Tenant A - SoftDel' } });
    userA = await globalPrisma.user.create({ data: { email: 'user@softdel.com', clerkId: 'c1', tenantId: tenantA.id, status: 'ACTIVE' } });
    mockAuth.user = userA; mockAuth.tenantId = tenantA.id;
    customerA = await globalPrisma.customer.create({ data: { tenantId: tenantA.id, name: 'Del Cust', normalizedName: 'del cust', deletedAt: new Date() } });
  });

  afterEach(async () => {
    await globalPrisma.customer.deleteMany({});
    await globalPrisma.user.deleteMany({});
    await globalPrisma.tenant.deleteMany({});
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
