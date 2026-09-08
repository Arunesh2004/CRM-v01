import { describe, it, expect, beforeAll, vi } from 'vitest';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { reassignDepartment } from '@/modules/users/user.service';
import { RevenueService } from '@/modules/revenue/revenue.service';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn()
}));

describe('Wave 3D Security Remediation (Phase 28)', () => {
  let tenant1Id: string;
  let tenant2Id: string;
  
  let t1AdminId: string;
  let t1DeptHeadId: string;
  let t1EmployeeId: string;
  let t2EmployeeId: string;

  let t1Dept1Id: string;
  let t1Dept2Id: string;
  let t2DeptId: string;
  
  let t1DealId: string;
  let t2DealId: string;
  let t1PriceBookId: string;
  let t2PriceBookId: string;
  
  let t1Quote1Id: string;
  let t2Quote1Id: string;

  beforeAll(async () => {
    // Bootstrap test data
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const t1 = await tx.tenant.create({ data: { name: 'Wave3D Tenant 1', status: 'ACTIVE' } });
      const t2 = await tx.tenant.create({ data: { name: 'Wave3D Tenant 2', status: 'ACTIVE' } });
      tenant1Id = t1.id;
      tenant2Id = t2.id;
      
      const adminRole1 = await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId: t1.id } });
      const deptHeadRole1 = await tx.role.create({ data: { name: 'DEPARTMENT_HEAD', tenantId: t1.id } });
      const memberRole1 = await tx.role.create({ data: { name: 'MEMBER', tenantId: t1.id } });
      const adminRole2 = await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId: t2.id } });

      const dept1 = await tx.department.create({ data: { name: 'Engineering T1', tenantId: t1.id } });
      const dept2 = await tx.department.create({ data: { name: 'Sales T1', tenantId: t1.id } });
      const dept3 = await tx.department.create({ data: { name: 'Engineering T2', tenantId: t2.id } });
      t1Dept1Id = dept1.id;
      t1Dept2Id = dept2.id;
      t2DeptId = dept3.id;

      // Users
      const admin1 = await tx.user.create({
        data: { email: 'admin1@w3d.com', clerkId: `c_${crypto.randomUUID()}`, tenantId: t1.id, status: 'ACTIVE', departmentId: dept1.id, userRoles: { create: { roleId: adminRole1.id, tenantId: t1.id } } }
      });
      t1AdminId = admin1.id;

      const head1 = await tx.user.create({
        data: { email: 'head1@w3d.com', clerkId: `c_${crypto.randomUUID()}`, tenantId: t1.id, status: 'ACTIVE', departmentId: dept1.id, userRoles: { create: { roleId: deptHeadRole1.id, tenantId: t1.id } } }
      });
      t1DeptHeadId = head1.id;

      const emp1 = await tx.user.create({
        data: { email: 'emp1@w3d.com', clerkId: `c_${crypto.randomUUID()}`, tenantId: t1.id, status: 'ACTIVE', departmentId: dept1.id, userRoles: { create: { roleId: memberRole1.id, tenantId: t1.id } } }
      });
      t1EmployeeId = emp1.id;

      const emp2 = await tx.user.create({
        data: { email: 'emp2@w3d.com', clerkId: `c_${crypto.randomUUID()}`, tenantId: t2.id, status: 'ACTIVE', departmentId: dept3.id, userRoles: { create: { roleId: adminRole2.id, tenantId: t2.id } } }
      });
      t2EmployeeId = emp2.id;

      // Revenue Setup
      const customer1 = await tx.customer.create({ data: { name: 'Cust 1', normalizedName: 'CUST 1', tenantId: t1.id } });
      const customer2 = await tx.customer.create({ data: { name: 'Cust 2', normalizedName: 'CUST 2', tenantId: t2.id } });

      const pipe1 = await tx.pipeline.create({ data: { name: 'Pipe 1', tenant: { connect: { id: t1.id } } } });
      const pipe2 = await tx.pipeline.create({ data: { name: 'Pipe 2', tenant: { connect: { id: t2.id } } } });
      const stage1 = await tx.pipelineStage.create({ data: { name: 'PROSPECTING', order: 1, pipeline: { connect: { id: pipe1.id } }, tenant: { connect: { id: t1.id } } } });
      const stage2 = await tx.pipelineStage.create({ data: { name: 'PROSPECTING', order: 1, pipeline: { connect: { id: pipe2.id } }, tenant: { connect: { id: t2.id } } } });

      const deal1 = await tx.deal.create({ data: { title: 'Deal 1', tenant: { connect: { id: t1.id } }, customer: { connect: { id: customer1.id } }, stage: { connect: { id: stage1.id } }, assignedUser: { connect: { id: t1AdminId } }, createdUser: { connect: { id: t1AdminId } }, pipeline: { connect: { id: pipe1.id } } } });
      t1DealId = deal1.id;
      const deal2 = await tx.deal.create({ data: { title: 'Deal 2', tenant: { connect: { id: t2.id } }, customer: { connect: { id: customer2.id } }, stage: { connect: { id: stage2.id } }, assignedUser: { connect: { id: t2EmployeeId } }, createdUser: { connect: { id: t2EmployeeId } }, pipeline: { connect: { id: pipe2.id } } } });
      t2DealId = deal2.id;

      const pb1 = await tx.priceBook.create({ data: { name: 'Standard PB', tenantId: t1.id } });
      t1PriceBookId = pb1.id;
      const pb2 = await tx.priceBook.create({ data: { name: 'Standard PB', tenantId: t2.id } });
      t2PriceBookId = pb2.id;

      const q1 = await tx.quote.create({
        data: { tenantId: t1.id, dealId: deal1.id, customerId: customer1.id, ownerId: t1AdminId, priceBookId: pb1.id, status: 'DRAFT', grandTotal: 100 }
      });
      t1Quote1Id = q1.id;

      const q2 = await tx.quote.create({
        data: { tenantId: t2.id, dealId: deal2.id, customerId: customer2.id, ownerId: t2EmployeeId, priceBookId: pb2.id, status: 'DRAFT', grandTotal: 200 }
      });
      t2Quote1Id = q2.id;

      // Permissions Mock
      const permUpdate = await tx.permission.upsert({ where: { resource_action: { resource: 'USER', action: 'UPDATE' } }, update: {}, create: { resource: 'USER', action: 'UPDATE' } });
      const permRevUpdate = await tx.permission.upsert({ where: { resource_action: { resource: 'REVENUE', action: 'UPDATE' } }, update: {}, create: { resource: 'REVENUE', action: 'UPDATE' } });
      const permRevApprove = await tx.permission.upsert({ where: { resource_action: { resource: 'REVENUE', action: 'APPROVE' } }, update: {}, create: { resource: 'REVENUE', action: 'APPROVE' } });

      await tx.rolePermission.create({ data: { roleId: adminRole1.id, permissionId: permUpdate.id, tenantId: t1.id } });
      await tx.rolePermission.create({ data: { roleId: adminRole1.id, permissionId: permRevUpdate.id, tenantId: t1.id } });
      await tx.rolePermission.create({ data: { roleId: adminRole1.id, permissionId: permRevApprove.id, tenantId: t1.id } });

      await tx.rolePermission.create({ data: { roleId: deptHeadRole1.id, permissionId: permUpdate.id, tenantId: t1.id } });
      
      await tx.rolePermission.create({ data: { roleId: memberRole1.id, permissionId: permRevUpdate.id, tenantId: t1.id } });
      await tx.rolePermission.create({ data: { roleId: adminRole2.id, permissionId: permRevUpdate.id, tenantId: t2.id } });
    });
  });

  const mockContext = async (userId: string, tenantId: string) => {
    const user = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.user.findUnique({ where: { id: userId }, include: { userRoles: { include: { role: true } } } }));
    if (!user || !user.clerkId) throw new Error('User or clerkId not found for mockContext');
    
    // Mock the external Clerk auth identity. The REAL getCurrentUser, requireAuth, 
    // and requirePermission will run, utilizing the real database!
    vi.mocked(auth).mockResolvedValue({ userId: user.clerkId } as any);
  };

  // GATE 1
  it('G1-01: Tenant A admin reassigns Tenant A employee to Tenant A department -> PASS', async () => {
    await mockContext(t1AdminId, tenant1Id);
    await expect(reassignDepartment(t1EmployeeId, t1Dept2Id)).resolves.toEqual({ success: true });
  });

  it('G1-02: Tenant A admin attempts to assign Tenant A employee to Tenant B department -> DENIED', async () => {
    await mockContext(t1AdminId, tenant1Id);
    await expect(reassignDepartment(t1EmployeeId, t2DeptId))
      .rejects.toThrow('Invalid department target or cross-tenant assignment denied.');
      
    // Verify DB remains unchanged
    const emp = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.user.findUnique({ where: { id: t1EmployeeId } }));
    expect(emp?.departmentId).not.toBe(t2DeptId);
  });

  it('G1-03: Tenant A department head attempts unauthorized department reassignment -> DENIED', async () => {
    await mockContext(t1DeptHeadId, tenant1Id);
    await expect(reassignDepartment(t1EmployeeId, t1Dept2Id))
      .rejects.toThrow('Forbidden: You cannot manage employees outside your department.');
  });

  it('G1-04: Tenant B employee/department IDs cannot be used to bypass tenant boundary -> DENIED', async () => {
    await mockContext(t1AdminId, tenant1Id);
    // Try to reassign a Tenant B employee
    await expect(reassignDepartment(t2EmployeeId, t1Dept1Id))
      .rejects.toThrow('User not found in this tenant.');
      
    // Verify DB remains unchanged
    const emp = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.user.findUnique({ where: { id: t2EmployeeId } }));
    expect(emp?.departmentId).not.toBe(t1Dept1Id);
  });

  // GATE 3
  it('G3-01: Authorized actor submits own/authorized DRAFT quote -> PASS', async () => {
    await mockContext(t1AdminId, tenant1Id); // Using admin who owns it
    await expect(RevenueService.submitForApproval(tenant1Id, t1AdminId, t1Quote1Id)).resolves.toBeDefined();
    
    // Verify state actually changed
    const quote = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.quote.findUnique({ where: { id: t1Quote1Id } }));
    expect(quote?.status).not.toBe('DRAFT'); // Depending on discount rules, could be PENDING_APPROVAL or APPROVED
  });

  it('G3-02: Unauthorized Tenant A user attempts to submit another users quote -> DENIED', async () => {
    // Note: t1Quote1Id is owned by t1AdminId
    // t1EmployeeId has REVENUE:UPDATE but is not owner
    await mockContext(t1EmployeeId, tenant1Id);
    await expect(RevenueService.submitForApproval(tenant1Id, t1EmployeeId, t1Quote1Id))
      .rejects.toThrow('Unauthorized: Only the quote owner with REVENUE UPDATE permission can submit it.');
  });

  it('G3-03: Tenant A user attempts to submit Tenant B quote -> DENIED', async () => {
    await mockContext(t1AdminId, tenant1Id);
    await expect(RevenueService.submitForApproval(tenant1Id, t1AdminId, t2Quote1Id))
      .rejects.toThrow('Quote not found');
      
    const quote = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.quote.findUnique({ where: { id: t2Quote1Id } }));
    expect(quote?.status).toBe('DRAFT');
  });

  it('G3-04: Authorized approver approves according to existing REVENUE:APPROVE semantics -> PASS', async () => {
    await mockContext(t1AdminId, tenant1Id); // Admin has APPROVE perm
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.quote.update({ where: { id: t1Quote1Id }, data: { status: 'PENDING_APPROVAL' } }));
    await expect(RevenueService.approveQuote(tenant1Id, t1AdminId, t1Quote1Id)).resolves.toBeDefined();
    
    const quote = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.quote.findUnique({ where: { id: t1Quote1Id } }));
    expect(quote?.status).toBe('APPROVED');
  });

  it('G3-05: Unauthorized actor attempts approval -> DENIED', async () => {
    await mockContext(t1EmployeeId, tenant1Id); // Standard user lacks APPROVE perm
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.quote.update({ where: { id: t1Quote1Id }, data: { status: 'PENDING_APPROVAL' } }));
    await expect(RevenueService.approveQuote(tenant1Id, t1EmployeeId, t1Quote1Id))
      .rejects.toThrow('Unauthorized');
  });

  it('G3-06: Authorized actor performs valid quote acceptance according to established domain rule -> PASS', async () => {
    await mockContext(t1AdminId, tenant1Id);
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.quote.update({ where: { id: t1Quote1Id }, data: { status: 'SENT' } }));
    await expect(RevenueService.acceptQuote(tenant1Id, t1AdminId, t1Quote1Id)).resolves.toBeDefined();
    
    const quote = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.quote.findUnique({ where: { id: t1Quote1Id } }));
    expect(quote?.status).toBe('ACCEPTED');
  });

  it('G3-07: Unauthorized Tenant A user attempts to accept another users quote -> DENIED', async () => {
    await mockContext(t1EmployeeId, tenant1Id);
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.quote.update({ where: { id: t1Quote1Id }, data: { status: 'SENT' } }));
    await expect(RevenueService.acceptQuote(tenant1Id, t1EmployeeId, t1Quote1Id))
      .rejects.toThrow('Unauthorized: Only the quote owner with REVENUE UPDATE permission can accept it.');
      
    // Verify DB unchanged
    const quote = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.quote.findUnique({ where: { id: t1Quote1Id } }));
    expect(quote?.status).toBe('SENT');
  });

  it('G3-08: Tenant A user attempts to accept Tenant B quote -> DENIED', async () => {
    await mockContext(t1AdminId, tenant1Id);
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.quote.update({ where: { id: t2Quote1Id }, data: { status: 'SENT' } }));
    await expect(RevenueService.acceptQuote(tenant1Id, t1AdminId, t2Quote1Id))
      .rejects.toThrow('Quote not found');
  });

  it('G3-09: Invalid quote state -> DENIED', async () => {
    await mockContext(t1AdminId, tenant1Id);
    // t1Quote1Id is already ACCEPTED from G3-06, submitting it should fail
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.quote.update({ where: { id: t1Quote1Id }, data: { status: 'ACCEPTED' } }));
    await expect(RevenueService.submitForApproval(tenant1Id, t1AdminId, t1Quote1Id))
      .rejects.toThrow('Can only submit DRAFT quotes');
  });
});
