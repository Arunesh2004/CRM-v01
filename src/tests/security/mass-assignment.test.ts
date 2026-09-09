import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDeal } from '@/modules/crm/deal/deal.service';
import { createPipeline, createPipelineStage } from '@/modules/crm/deal/pipeline.service';
import { executeAsSystem, SystemOperation } from "@db/utils/prisma-system";

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
}));

describe('Mass Assignment Vulnerability', () => {
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;
  let pipelineA: any;
  let stageA: any;

  beforeEach(async () => {
    tenantA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.tenant.create({ data: { name: 'Tenant A - Mass' } }));
    tenantB = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.tenant.create({ data: { name: 'Tenant B - Mass' } }));

    userA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.user.create({
          data: { email: 'usera_mass@test.com', clerkId: 'clerk_a_mass', tenantId: tenantA.id, status: 'ACTIVE' }
        }));
    userB = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.user.create({
          data: { email: 'userb_mass@test.com', clerkId: 'clerk_b_mass', tenantId: tenantB.id, status: 'ACTIVE' }
        }));

    mockAuth.user = userA;
    mockAuth.tenantId = tenantA.id;

    pipelineA = await createPipeline({ name: 'Pipeline A' });
    stageA = await createPipelineStage(pipelineA.id, { name: 'Stage 1', probability: 50 });
  });

  afterEach(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.activityTimeline.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.dealStageHistory.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.deal.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.pipelineStage.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.pipeline.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } })).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } })).catch(() => {});
    vi.resetAllMocks();
  });

  it('STRONG: Tenant A user should not be able to mass-assign tenantId and createdById during createDeal', async () => {
    // Act
    const dealData: any = {
      title: 'Hacked Deal',
      value: 1000,
      pipelineId: pipelineA.id,
      stageId: stageA.id,
      assignedUserId: userA.id,
      // MALICIOUS INPUT
      tenantId: tenantB.id,
      createdById: userB.id
    };

    const deal = await createDeal(dealData);

    // Assert
    const check = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.deal.findUnique({ where: { id: deal.id } }));
    expect(check).toBeDefined();
    
    // The deal must belong to Tenant A and user A.
    // If mass assignment is possible, these expects will fail (actual will be Tenant B / user B).
    expect(check?.tenantId).toBe(tenantA.id);
    expect(check?.createdById).toBe(userA.id);
  });
});
