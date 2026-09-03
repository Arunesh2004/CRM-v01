import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createContact, createCustomer, updateCustomer, deleteCustomer } from '@/modules/crm/customer/customer.service';
import globalPrisma from '@db/utils/prisma';

// Mock auth to allow dynamic tenant/user swapping
const mockAuth = {
  user: { id: 'test_user_id' },
  tenantId: 'test_tenant_id',
  permission: true
};

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(async () => mockAuth.user),
  requireTenant: vi.fn(async () => mockAuth.tenantId),
  requirePermission: vi.fn(async () => {
    if (!mockAuth.permission) throw new Error('Forbidden');
    return true;
  }),
  requireAuthIdentity: vi.fn(async () => mockAuth.user),
  requireTenantFromIdentity: vi.fn(async () => mockAuth.tenantId),
  requirePermissionFast: vi.fn(async () => {
    if (!mockAuth.permission) throw new Error('Forbidden');
    return true;
  }),
}));

describe('Phase S13 - Critical Path Authorization Audit', () => {
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;
  let customerB: any;

  beforeEach(async () => {
    // Setup Data
    tenantA = await globalPrisma.tenant.create({ data: { name: 'Tenant A - S13' } });
    tenantB = await globalPrisma.tenant.create({ data: { name: 'Tenant B - S13' } });

    userA = await globalPrisma.user.create({
      data: { email: 'usera_s13@test.com', clerkId: 'clerk_a', tenantId: tenantA.id, status: 'ACTIVE' }
    });
    userB = await globalPrisma.user.create({
      data: { email: 'userb_s13@test.com', clerkId: 'clerk_b', tenantId: tenantB.id, status: 'ACTIVE' }
    });

    customerB = await globalPrisma.customer.create({
      data: {
        tenantId: tenantB.id,
        name: 'Target Customer B',
        normalizedName: 'target customer b',
        assignedUserId: userB.id
      }
    });

    // Reset mocks for each test
    mockAuth.user = userA;
    mockAuth.tenantId = tenantA.id;
    mockAuth.permission = true;
  });

  afterEach(async () => {
    await globalPrisma.customerContact.deleteMany({});
    await globalPrisma.customer.deleteMany({});
    await globalPrisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await globalPrisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
    vi.resetAllMocks();
  });

  describe('A. Cross-Tenant IDOR \u0026 Nested Writes', () => {
    it('1. STRONG: Tenant A cannot update Tenant B Customer directly', async () => {
      // Act
      await expect(
        updateCustomer({
          id: customerB.id,
          name: 'Hacked Name'
        })
      ).rejects.toThrow('Customer not found');

      // Assert it didn't change
      const check = await globalPrisma.customer.findUnique({ where: { id: customerB.id } });
      expect(check?.name).toBe('Target Customer B');
    });

    it('2. STRONG: Tenant A cannot delete Tenant B Customer directly', async () => {
      // Act
      await expect(
        deleteCustomer(customerB.id)
      ).rejects.toThrow('Customer not found');
    });

    it('3. STRONG: Tenant A cannot create a Contact attached to Tenant B Customer', async () => {
      // The issue is whether Prisma blocks inserting `customerId = B` when `tenantId = A`.
      // Since there is no composite foreign key, Prisma might let it through unless RLS catches it.
      
      // Let's execute and see if it fails (it *should* fail if secure).
      let errorOccurred = false;
      try {
        await createContact({
          customerId: customerB.id,
          firstName: 'Hacked',
          lastName: 'Contact',
          email: 'hacked@test.com'
        });
      } catch (e: any) {
        errorOccurred = true;
      }
      
      // We expect the operation to throw an error (either RLS or application logic).
      // If it passes, it's a vulnerability.
      
      // To strictly verify, let's check if the contact was created.
      const contacts = await globalPrisma.customerContact.findMany({
        where: { email: 'hacked@test.com' }
      });
      
      if (!errorOccurred) {
         // If we get here and the contact was created, we have an IDOR!
         expect(contacts.length).toBe(0); 
      } else {
         expect(errorOccurred).toBe(true);
      }
    });
  });

  describe('B. RBAC Escalation', () => {
    it('4. STRONG: User without UPDATE permission cannot update Customer', async () => {
      mockAuth.permission = false;
      
      await expect(
        updateCustomer({
          id: customerB.id, // ID doesn't matter, it should fail early on permission
          name: 'Hacked Name'
        })
      ).rejects.toThrow('Forbidden');
    });
  });
});
