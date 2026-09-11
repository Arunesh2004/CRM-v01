import { describe, it, expect, beforeAll, vi } from 'vitest';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { updateLead, deleteLead } from '@/modules/crm/lead/lead.service';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn()
}));

describe('S4.4 - Lead Lifecycle Security', () => {
  let _tenant1Id: string;
  let _tenant2Id: string;
  
  let t1AdminId: string;
  let t1NoAccessId: string;
  let t2AdminId: string;

  let t1LeadA: string;
  let t2LeadB: string;

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const t1 = await tx.tenant.create({ data: { name: 'T1', status: 'ACTIVE' } });
      const t2 = await tx.tenant.create({ data: { name: 'T2', status: 'ACTIVE' } });
      _tenant1Id = t1.id;
      _tenant2Id = t2.id;
      
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

      const admin2 = await tx.user.create({
        data: { email: 'admin2@t2.com', clerkId: `c_${crypto.randomUUID()}`, tenantId: t2.id, status: 'ACTIVE', userRoles: { create: { roleId: adminRole2.id, tenantId: t2.id } } }
      });
      t2AdminId = admin2.id;

      const lead1 = await tx.lead.create({
        data: { name: 'Lead 1', company: 'Comp 1', tenantId: t1.id }
      });
      t1LeadA = lead1.id;

      const lead2 = await tx.lead.create({
        data: { name: 'Lead 2', company: 'Comp 2', tenantId: t2.id }
      });
      t2LeadB = lead2.id;
      
      const permLeadCreate = await tx.permission.upsert({ where: { resource_action: { resource: 'LEAD', action: 'CREATE' } }, update: {}, create: { resource: 'LEAD', action: 'CREATE' } });
      const permLeadRead = await tx.permission.upsert({ where: { resource_action: { resource: 'LEAD', action: 'READ' } }, update: {}, create: { resource: 'LEAD', action: 'READ' } });
      const permLeadUpdate = await tx.permission.upsert({ where: { resource_action: { resource: 'LEAD', action: 'UPDATE' } }, update: {}, create: { resource: 'LEAD', action: 'UPDATE' } });
      const permLeadDelete = await tx.permission.upsert({ where: { resource_action: { resource: 'LEAD', action: 'DELETE' } }, update: {}, create: { resource: 'LEAD', action: 'DELETE' } });

      await tx.rolePermission.createMany({
        data: [
          { roleId: adminRole1.id, permissionId: permLeadCreate.id, tenantId: t1.id },
          { roleId: adminRole1.id, permissionId: permLeadRead.id, tenantId: t1.id },
          { roleId: adminRole1.id, permissionId: permLeadUpdate.id, tenantId: t1.id },
          { roleId: adminRole1.id, permissionId: permLeadDelete.id, tenantId: t1.id },
          { roleId: adminRole2.id, permissionId: permLeadUpdate.id, tenantId: t2.id },
          { roleId: adminRole2.id, permissionId: permLeadDelete.id, tenantId: t2.id }
        ]
      });
    });
  });

  const mockAuth = async (userId: string) => {
    const user = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.user.findUnique({ where: { id: userId } }));
    if (!user || !user.clerkId) throw new Error('User or clerkId not found for mockContext');
    vi.mocked(auth).mockReturnValue({
      userId: user.clerkId,
      orgId: user.tenantId,
      sessionClaims: { metadata: { dbUserId: userId } }
    } as unknown);
  };

  it('allows authorized same-tenant update', async () => {
    await mockAuth(t1AdminId);
    const result = await updateLead({ id: t1LeadA, name: 'Updated Lead 1' });
    expect(result.name).toBe('Updated Lead 1');
  });

  it('rejects insufficient permission', async () => {
    await mockAuth(t1NoAccessId);
    await expect(updateLead({ id: t1LeadA, name: 'Fail' }))
      .rejects.toThrow(/Forbidden/);
  });

  it('rejects unauthenticated request', async () => {
    vi.mocked(auth).mockReturnValue({ userId: null, orgId: null } as unknown);
    await expect(updateLead({ id: t1LeadA, name: 'Fail' }))
      .rejects.toThrow(/Unauthorized/);
  });

  it('rejects foreign Lead ID update (cross-tenant)', async () => {
    await mockAuth(t1AdminId);
    await expect(updateLead({ id: t2LeadB, name: 'Fail' }))
      .rejects.toThrow(/not found/);
  });

  it('rejects foreign assignee ID', async () => {
    await mockAuth(t1AdminId);
    await expect(updateLead({ id: t1LeadA, assignedUserId: t2AdminId }))
      .rejects.toThrow(/Assigned user does not belong to this tenant/);
  });

  it('allows same-tenant archive', async () => {
    await mockAuth(t1AdminId);
    const result = await deleteLead(t1LeadA);
    expect(result.success).toBe(true);
  });

  it('rejects cross-tenant archive', async () => {
    await mockAuth(t1AdminId);
    await expect(deleteLead(t2LeadB))
      .rejects.toThrow(/not found/);
  });

  it('blocks update on archived Lead', async () => {
    await mockAuth(t1AdminId);
    await expect(updateLead({ id: t1LeadA, name: 'Fail' }))
      .rejects.toThrow(/not found/);
  });

});
