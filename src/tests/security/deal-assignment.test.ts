import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDeal } from '@/modules/crm/deal/deal.service';
import { createPipeline, createPipelineStage } from '@/modules/crm/deal/pipeline.service';
import { TicketService } from '@/modules/support/ticket.service';
import globalPrisma from '@db/utils/prisma';

const mockAuth = {
  user: { id: 'test_user_id' },
  tenantId: 'test_tenant_id',
  permission: true
};

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(async () => mockAuth.user),
  requireTenant: vi.fn(async () => mockAuth.tenantId),
  requirePermission: vi.fn(async () => true),
  requireAuthIdentity: vi.fn(async () => mockAuth.user),
  requireTenantFromIdentity: vi.fn(async () => mockAuth.tenantId),
  requirePermissionFast: vi.fn(async () => true),
  checkPermissionFast: vi.fn(async () => true),
}));

describe('Deal and Ticket Assignment Security', () => {
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;
  let customerA: any;
  let pipelineA: any;
  let stageA: any;

  beforeEach(async () => {
    tenantA = await globalPrisma.tenant.create({ data: { name: 'Tenant A' } });
    tenantB = await globalPrisma.tenant.create({ data: { name: 'Tenant B' } });

    userA = await globalPrisma.user.create({
      data: { email: 'usera_deal@test.com', clerkId: 'clerk_a_deal', tenantId: tenantA.id, status: 'ACTIVE' }
    });
    userB = await globalPrisma.user.create({
      data: { email: 'userb_deal@test.com', clerkId: 'clerk_b_deal', tenantId: tenantB.id, status: 'ACTIVE' }
    });

    customerA = await globalPrisma.customer.create({
      data: { tenantId: tenantA.id, name: 'Cust A', normalizedName: 'cust a', status: 'ACTIVE' }
    });

    mockAuth.user = userA;
    mockAuth.tenantId = tenantA.id;

    pipelineA = await createPipeline({ name: 'Pipeline A' });
    stageA = await createPipelineStage(pipelineA.id, { name: 'Stage 1', probability: 50 });
  });

  afterEach(async () => {
    await globalPrisma.ticketMessage.deleteMany({});
    await globalPrisma.ticket.deleteMany({});
    await globalPrisma.activityTimeline.deleteMany({});
    await globalPrisma.dealStageHistory.deleteMany({});
    await globalPrisma.deal.deleteMany({});
    await globalPrisma.pipelineStage.deleteMany({});
    await globalPrisma.pipeline.deleteMany({});
    await globalPrisma.customer.deleteMany({});
    vi.resetAllMocks();
  });

  it('1. Deal creation with valid tenant-local assignedUserId succeeds', async () => {
    const deal = await createDeal({
      title: 'Valid Deal',
      value: 100,
      pipelineId: pipelineA.id,
      stageId: stageA.id,
      assignedUserId: userA.id
    });
    expect(deal.id).toBeDefined();
    expect(deal.assignedUserId).toBe(userA.id);
  });

  it('2. Deal creation with missing assignedUserId fails validation at TS level', async () => {
    await expect(
      createDeal({
        title: 'Missing Assignee Deal',
        value: 100,
        pipelineId: pipelineA.id,
        stageId: stageA.id
      } as any)
    ).rejects.toThrow();
  });

  it('3. Deal creation with malformed assignedUserId fails', async () => {
    await expect(
      createDeal({
        title: 'Malformed ID',
        value: 100,
        pipelineId: pipelineA.id,
        stageId: stageA.id,
        assignedUserId: 'not-a-uuid'
      })
    ).rejects.toThrow(); 
  });

  it('4. Deal creation with cross-tenant assignedUserId fails authorization', async () => {
    await expect(
      createDeal({
        title: 'Cross Tenant Deal',
        value: 100,
        pipelineId: pipelineA.id,
        stageId: stageA.id,
        assignedUserId: userB.id
      })
    ).rejects.toThrow('Assigned user not found in current tenant');
  });

  it('5. Authenticated user is NOT silently substituted', async () => {
    await expect(
      createDeal({
        title: 'No Fallback Deal',
        value: 100,
        pipelineId: pipelineA.id,
        stageId: stageA.id,
        assignedUserId: undefined as any
      })
    ).rejects.toThrow();
  });

  it('6. Ticket creation without assignedUserId still succeeds', async () => {
    const ticket = await TicketService.createTicket(
      tenantA.id,
      userA.id,
      customerA.id,
      'Test Subject',
      'Test Desc',
      'MEDIUM'
    );
    expect(ticket.id).toBeDefined();
    expect(ticket.assignedUserId).toBeNull();
  });

  it('7. Ticket explicit assignment works', async () => {
    const ticket = await TicketService.createTicket(
      tenantA.id,
      userA.id,
      customerA.id,
      'Test Subject',
      'Test Desc',
      'MEDIUM'
    );
    
    // Attempt assignment
    const updated = await globalPrisma.ticket.update({
      where: { id: ticket.id },
      data: { assignedUserId: userA.id }
    });
    expect(updated.assignedUserId).toBe(userA.id);
  });
});
