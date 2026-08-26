import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../../database/utils/prisma';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { withTenantTransaction } from '../../../database/utils/prisma-tenant';
import { TicketService } from '../../../src/modules/support/ticket.service';

describe('Application Layer - IDOR / BOLA Adversarial Tests', () => {
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;
  let customerA: any;
  let customerB: any;
  let docA: any;
  let docB: any;

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      tenantA = await tx.tenant.create({ data: { name: 'IDOR Tenant A' } });
      tenantB = await tx.tenant.create({ data: { name: 'IDOR Tenant B' } });

      userA = await tx.user.create({ data: { email: 'userA@idora.com', firstName: 'User', lastName: 'A', clerkId: 'clerk_idora', tenantId: tenantA.id, status: 'ACTIVE' } });
      userB = await tx.user.create({ data: { email: 'userB@idorb.com', firstName: 'User', lastName: 'B', clerkId: 'clerk_idorb', tenantId: tenantB.id, status: 'ACTIVE' } });

      customerA = await tx.customer.create({ data: { name: 'Customer A', normalizedName: 'customer a', tenantId: tenantA.id } });
      customerB = await tx.customer.create({ data: { name: 'Customer B', normalizedName: 'customer b', tenantId: tenantB.id } });

      docA = await tx.document.create({ data: { fileName: 'doc_a.pdf', mimeType: 'application/pdf', sizeBytes: 1024, storageKey: '/doc_a', uploadedById: userA.id, tenantId: tenantA.id } });
      docB = await tx.document.create({ data: { fileName: 'doc_b.pdf', mimeType: 'application/pdf', sizeBytes: 1024, storageKey: '/doc_b', uploadedById: userB.id, tenantId: tenantB.id } });

      // Add TICKET:CREATE permission for userA
      const roleA = await tx.role.create({ data: { tenantId: tenantA.id, name: 'TICKET_CREATOR' } });
      await tx.userRole.create({ data: { userId: userA.id, roleId: roleA.id, tenantId: tenantA.id } });
      const perm = await tx.permission.findFirst({ where: { resource: 'TICKET', action: 'CREATE' } }) 
        || await tx.permission.create({ data: { resource: 'TICKET', action: 'CREATE' } });
      await tx.rolePermission.create({ data: { roleId: roleA.id, permissionId: perm.id, tenantId: tenantA.id } });
    });
  });

  afterAll(async () => {
    if (tenantA || tenantB) {
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        if (tenantA && tenantA.id) {
          await tx.document.deleteMany({ where: { tenantId: tenantA.id } });
          await tx.customer.deleteMany({ where: { tenantId: tenantA.id } });
          await tx.user.deleteMany({ where: { tenantId: tenantA.id } });
        }
        if (tenantB && tenantB.id) {
          await tx.document.deleteMany({ where: { tenantId: tenantB.id } });
          await tx.customer.deleteMany({ where: { tenantId: tenantB.id } });
          await tx.user.deleteMany({ where: { tenantId: tenantB.id } });
          await tx.tenant.deleteMany({ where: { id: tenantB.id } });
        }
      });
    }
  });

  it('BOLA 1: Tenant A attempts to READ Tenant B resource via direct ID', async () => {
    await prisma.$transaction(async (baseTx) => {
      const txA = await withTenantTransaction(baseTx, tenantA.id);
      
      const foundCustomer = await txA.customer.findUnique({ where: { id: customerB.id } });
      expect(foundCustomer).toBeNull();
      
      const foundDoc = await txA.document.findUnique({ where: { id: docB.id } });
      expect(foundDoc).toBeNull();
    });
  });

  it('BOLA 2: Tenant A attempts to UPDATE Tenant B resource', async () => {
    await prisma.$transaction(async (baseTx) => {
      const txA = await withTenantTransaction(baseTx, tenantA.id);
      
      // Update attempts must fail
      await expect(txA.customer.update({
        where: { id: customerB.id },
        data: { name: 'Hacked by A' }
      })).rejects.toThrow();
    });
  });

  it('BOLA 3: Tenant A attempts to DELETE Tenant B resource', async () => {
    await prisma.$transaction(async (baseTx) => {
      const txA = await withTenantTransaction(baseTx, tenantA.id);
      
      await expect(txA.customer.delete({ where: { id: customerB.id } })).rejects.toThrow();
    });
  });

  // TODO: Fix BOLA vulnerability where parent-child tenant consistency is not enforced
  it('BOLA 4: Cross-Tenant Parent-Child Relation Attack', async () => {
    // Attack: Tenant A uses application service boundary to create a ticket linked to Tenant B's customer
    await expect(
      TicketService.createTicket(
        tenantA.id, 
        userA.id, 
        customerB.id, // VULNERABILITY PAYLOAD: Cross-tenant Customer ID
        'Hacked Ticket', 
        'Malicious', 
        'HIGH'
      )
    ).rejects.toThrow(); // Must be rejected by BOLA prevention
  });

  it('BOLA 5: Tenant Transfer / Mass Assignment Simulation', async () => {
    await prisma.$transaction(async (baseTx) => {
      const txA = await withTenantTransaction(baseTx, tenantA.id);
      
      // A user in Tenant A tries to change their own customer's tenantId to Tenant B
      await expect(txA.customer.update({
        where: { id: customerA.id },
        data: { tenantId: tenantB.id }
      })).rejects.toThrow();
    });
  });
});
