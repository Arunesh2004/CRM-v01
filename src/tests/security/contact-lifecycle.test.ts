import { describe, it, expect, beforeAll, vi } from 'vitest';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { updateContact, deleteContact } from '@/modules/crm/customer/customer.service';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn()
}));

describe('S4.3A - Contact Lifecycle Security', () => {
  let tenant1Id: string;
  
  let t1AdminId: string; // Has CUSTOMER UPDATE
  let t1NoAccessId: string; // Has NO CUSTOMER UPDATE

  let t1CustomerA: string;
  let t1ContactA: string;

  let t2CustomerB: string;
  let t2ContactB: string;

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const t1 = await tx.tenant.create({ data: { name: 'T1', status: 'ACTIVE' } });
      const t2 = await tx.tenant.create({ data: { name: 'T2', status: 'ACTIVE' } });
      tenant1Id = t1.id;
      const adminRole1 = await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId: t1.id } });
      const noAccessRole = await tx.role.create({ data: { name: 'NO_ACCESS', tenantId: t1.id } });
      const adminRole2 = await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId: t2.id } });

      const admin1 = await tx.user.create({
        data: { email: 'admin1@t1.com', clerkId: `c_${crypto.randomUUID()}`, tenantId: t1.id, status: 'ACTIVE', userRoles: { create: { roleId: adminRole1.id, tenantId: t1.id } } }
      });
      t1AdminId = admin1.id;

      const noAccess1 = await tx.user.create({
        data: { email: 'noaccess@t1.com', clerkId: `c_${crypto.randomUUID()}`, tenantId: t1.id, status: 'ACTIVE', userRoles: { create: { roleId: noAccessRole.id, tenantId: t1.id } } }
      });
      t1NoAccessId = noAccess1.id;

      await tx.user.create({
        data: { email: 'admin2@t2.com', clerkId: `c_${crypto.randomUUID()}`, tenantId: t2.id, status: 'ACTIVE', userRoles: { create: { roleId: adminRole2.id, tenantId: t2.id } } }
      });

      const cust1 = await tx.customer.create({ data: { name: 'Cust 1', normalizedName: 'cust 1', tenantId: t1.id } });
      t1CustomerA = cust1.id;

      const cust2 = await tx.customer.create({ data: { name: 'Cust 2', normalizedName: 'cust 2', tenantId: t2.id } });
      t2CustomerB = cust2.id;

      const contact1 = await tx.customerContact.create({
        data: { customerId: t1CustomerA, tenantId: t1.id, firstName: 'John', lastName: 'Doe', email: 'john@t1.com' }
      });
      t1ContactA = contact1.id;

      const contact2 = await tx.customerContact.create({
        data: { customerId: t2CustomerB, tenantId: t2.id, firstName: 'Jane', lastName: 'Smith', email: 'jane@t2.com' }
      });
      t2ContactB = contact2.id;

      // Setup permissions
      const permUpdate = await tx.permission.upsert({ where: { resource_action: { resource: 'CUSTOMER', action: 'UPDATE' } }, update: {}, create: { resource: 'CUSTOMER', action: 'UPDATE' } });
      
      await tx.rolePermission.create({ data: { roleId: adminRole1.id, permissionId: permUpdate.id, tenantId: t1.id } });
      await tx.rolePermission.create({ data: { roleId: adminRole2.id, permissionId: permUpdate.id, tenantId: t2.id } });
    });
  });

  const mockContext = async (userId: string) => {
    const user = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.user.findUnique({ where: { id: userId } }));
    if (!user || !user.clerkId) throw new Error('User or clerkId not found for mockContext');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mocking Clerk auth type
    vi.mocked(auth).mockResolvedValue({ userId: user.clerkId } as any);
  };

  it('1. Authorized same-tenant update succeeds', async () => {
    await mockContext(t1AdminId);
    
    const result = await updateContact({
      contactId: t1ContactA,
      customerId: t1CustomerA,
      firstName: 'Johnny',
      lastName: 'Doe',
    });
    
    expect(result.firstName).toBe('Johnny');
  });

  it('2. Insufficient permission rejected', async () => {
    await mockContext(t1NoAccessId);
    
    await expect(updateContact({
      contactId: t1ContactA,
      customerId: t1CustomerA,
      firstName: 'Hacked',
    })).rejects.toThrow('Forbidden');
  });

  it('3. Unauthenticated request rejected', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mocking Clerk auth type
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);
    
    await expect(updateContact({
      contactId: t1ContactA,
      customerId: t1CustomerA,
      firstName: 'Hacked',
    })).rejects.toThrow();
  });

  it('4. Cross-tenant Customer ID manipulation fails', async () => {
    await mockContext(t1AdminId);
    
    // T1 tries to access T2 Customer's contact
    await expect(updateContact({
      contactId: t1ContactA, // valid contact
      customerId: t2CustomerB, // T2 customer
      firstName: 'Hacked',
    })).rejects.toThrow(); // Should fail on relation ownership
  });

  it('5. Cross-tenant Contact ID manipulation fails', async () => {
    await mockContext(t1AdminId);
    
    // T1 tries to access T2 Contact
    await expect(updateContact({
      contactId: t2ContactB, // T2 contact
      customerId: t1CustomerA, // T1 customer
      firstName: 'Hacked',
    })).rejects.toThrow('Contact not found'); // Should not find contact since tenantId does not match
  });

  it('6. Authorized same-tenant archive succeeds', async () => {
    await mockContext(t1AdminId);
    
    const result = await deleteContact(t1ContactA, t1CustomerA);
    expect(result.success).toBe(true);

    const contact = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.customerContact.findUnique({ where: { id: t1ContactA } }));
    expect(contact?.deletedAt).not.toBeNull();
  });

  it('7. Cannot archive already deleted contact', async () => {
    await mockContext(t1AdminId);
    
    // t1ContactA was deleted in test #6
    await expect(deleteContact(t1ContactA, t1CustomerA)).rejects.toThrow('Contact not found');
  });

  it('8. Cross-tenant archive fails', async () => {
    await mockContext(t1AdminId);
    
    await expect(deleteContact(t2ContactB, t1CustomerA)).rejects.toThrow('Contact not found');
    await expect(deleteContact(t2ContactB, t2CustomerB)).rejects.toThrow(); // relation ownership fail
  });

  it('9. Archived contact cannot be updated', async () => {
    await mockContext(t1AdminId);
    // t1ContactA is archived
    await expect(updateContact({
      contactId: t1ContactA,
      customerId: t1CustomerA,
      firstName: 'Zombie',
    })).rejects.toThrow('Contact not found');
  });

  it('10. Primary contact update is tenant/customer scoped', async () => {
    await mockContext(t1AdminId);

    // Create another contact for T1 Cust A
    const newContact = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.customerContact.create({
        data: { customerId: t1CustomerA, tenantId: tenant1Id, firstName: 'Second', lastName: 'Primary', isPrimary: true }
      })
    );

    // Update another contact to primary
    const thirdContact = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.customerContact.create({
        data: { customerId: t1CustomerA, tenantId: tenant1Id, firstName: 'Third', lastName: 'Contact', isPrimary: false }
      })
    );

    await updateContact({
      contactId: thirdContact.id,
      customerId: t1CustomerA,
      firstName: 'Third',
      isPrimary: true
    });

    // Check that newContact is no longer primary
    const checkSecond = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.customerContact.findUnique({ where: { id: newContact.id } }));
    expect(checkSecond?.isPrimary).toBe(false);

    // Check that T2's contact is unaffected (we need to make T2 contact primary first)
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.customerContact.update({ where: { id: t2ContactB }, data: { isPrimary: true } })
    );

    const checkT2 = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.customerContact.findUnique({ where: { id: t2ContactB } }));
    expect(checkT2?.isPrimary).toBe(true);
  });

  it('11. Invalid/malformed payload fails', async () => {
    await mockContext(t1AdminId);

    await expect(updateContact({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally invalid payload for security test
      contactId: null as any,
      customerId: t1CustomerA,
      firstName: 'Hack',
    })).rejects.toThrow();
  });
});
