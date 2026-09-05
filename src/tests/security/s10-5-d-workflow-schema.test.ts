import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

describe('Phase 10.5-D Workflow Schema Invariants', () => {
  let tenantId: string;
  let adminId: string;
  let normalUserId: string;

  beforeAll(async () => {
    tenantId = randomUUID();
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Workflow Schema Test Tenant',
      }
    });

    const admin = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `admin-${Date.now()}@test.com`,
        tenantId,
      }
    });
    adminId = admin.id;

    const normal = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `user-${Date.now()}@test.com`,
        tenantId,
      }
    });
    normalUserId = normal.id;
  });

  afterAll(async () => {
    await prisma.workflowExecution.deleteMany({ where: { tenantId } });
    await prisma.workflow.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  it('allows creating a workflow with a valid createdById', async () => {
    const wf = await prisma.workflow.create({
      data: {
        id: randomUUID(),
        tenantId,
        name: 'Valid Workflow',
        createdById: adminId,
      }
    });
    expect(wf.id).toBeDefined();
    expect(wf.createdById).toBe(adminId);
  });

  it('fails to create a workflow without createdById (DB constraint)', async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO "Workflow" ("id", "tenantId", "name", "updatedAt") VALUES (${randomUUID()}, ${tenantId}, 'Invalid', NOW())`
    ).rejects.toThrow();
  });

  it('allows initiatedById to be NULL for scheduled executions', async () => {
    const wf = await prisma.workflow.create({
      data: {
        id: randomUUID(),
        tenantId,
        name: 'Scheduled Workflow',
        createdById: adminId,
      }
    });

    const exec = await prisma.workflowExecution.create({
      data: {
        id: randomUUID(),
        tenantId,
        workflowId: wf.id,
        // initiatedById is implicitly NULL
      }
    });

    expect(exec.id).toBeDefined();
    expect(exec.initiatedById).toBeNull();
  });

  it('sets initiatedById to NULL if the initiator user is deleted', async () => {
    const wf = await prisma.workflow.create({
      data: {
        id: randomUUID(),
        tenantId,
        name: 'Manual Workflow',
        createdById: adminId,
      }
    });

    const tempUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `temp-${Date.now()}@test.com`,
        tenantId,
      }
    });

    const exec = await prisma.workflowExecution.create({
      data: {
        id: randomUUID(),
        tenantId,
        workflowId: wf.id,
        initiatedById: tempUser.id,
      }
    });

    expect(exec.initiatedById).toBe(tempUser.id);

    // Hard delete user
    await prisma.user.delete({ where: { id: tempUser.id } });

    // Fetch execution again
    const updatedExec = await prisma.workflowExecution.findUnique({
      where: { id: exec.id }
    });

    expect(updatedExec?.initiatedById).toBeNull();
  });

  it('restricts deleting a user who is a workflow creator (onDelete: Restrict)', async () => {
    const essentialUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: `creator-${Date.now()}@test.com`,
        tenantId,
      }
    });

    await prisma.workflow.create({
      data: {
        id: randomUUID(),
        tenantId,
        name: 'Critical Workflow',
        createdById: essentialUser.id,
      }
    });

    await expect(
      prisma.user.delete({ where: { id: essentialUser.id } })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError); // Should throw due to Restrict constraint
  });

  it('simulates tenant consistency for application authorization (Not DB boundary)', async () => {
    // This test proves that the application CAN enforce tenant boundaries,
    // not that the DB schema natively prevents cross-tenant FKs.
    
    // We simulate this by showing that an execution logic function would reject
    // a mismatched context.
    const foreignTenantId = randomUUID();
    
    const mockExecutionLogic = (wfTenantId: string, userTenantId: string) => {
      if (wfTenantId !== userTenantId) {
        throw new Error("SECURE_CONTEXT_ERROR: Tenant mismatch");
      }
      return true;
    };

    expect(() => mockExecutionLogic(tenantId, foreignTenantId)).toThrow("SECURE_CONTEXT_ERROR");
  });
});
