import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import globalPrisma from '@db/utils/prisma';
import { createDealAction } from '@/modules/crm/actions/deal.actions';
import { createIncidentAction } from '@/modules/incident/actions/incident.actions';
import * as auth from '@/lib/auth';
import { executeAsSystem, SystemOperation } from "@db/utils/prisma-system";

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual('@/lib/auth') as any;
  return {
    ...actual,
    requireAuth: vi.fn(),
    requireTenant: vi.fn(),
    requirePermission: vi.fn(),
    requireAuthIdentity: vi.fn(),
    requireTenantFromIdentity: vi.fn(),
    requirePermissionFast: vi.fn()
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn()
}));

describe('S14 Strict Boundary Validation Tests', () => {
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let pipelineA: any;
  let stageA: any;
  let customerA: any;
  let locationA: any;
  let cameraA: any;
  let aiEventA: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    tenantA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.tenant.create({ data: { name: 'Tenant A' } }));
    tenantB = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.tenant.create({ data: { name: 'Tenant B - Target' } }));
    userA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.user.create({ data: { tenantId: tenantA.id, email: 'usera@a.com', clerkId: 'user_a', firstName: 'A', lastName: 'A' } }));
    
    vi.mocked(auth.requireAuth).mockResolvedValue({ id: userA.id, role: 'USER' } as any);
    vi.mocked(auth.requireTenant).mockResolvedValue(tenantA.id);
    vi.mocked(auth.requirePermission).mockResolvedValue(true as any);
    vi.mocked(auth.requireAuthIdentity).mockResolvedValue({ id: userA.id, email: 'usera@a.com' } as any);
    vi.mocked(auth.requireTenantFromIdentity).mockResolvedValue(tenantA.id);
    vi.mocked(auth.requirePermissionFast).mockResolvedValue(true as any);

    pipelineA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.pipeline.create({ data: { tenantId: tenantA.id, name: 'P' } }));
    stageA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.pipelineStage.create({ data: { tenantId: tenantA.id, pipelineId: pipelineA.id, name: 'S', order: 1, probability: 10 } }));
    customerA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.customer.create({ data: { tenantId: tenantA.id, name: 'C', normalizedName: 'c' } }));
    locationA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.location.create({ data: { tenantId: tenantA.id, customerId: customerA.id, name: 'L' } }));
    cameraA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.camera.create({ data: { tenantId: tenantA.id, locationId: locationA.id, name: 'Cam', status: 'ONLINE', ipAddress: '192.168.1.1', protocol: 'RTSP' } }));
    aiEventA = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.aIEvent.create({ data: { tenantId: tenantA.id, cameraId: cameraA.id, confidence: 0.99, timestamp: new Date(), model: 'yolov8', detectedObject: 'person' } }));
  });

  afterEach(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.activityTimeline.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.document.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.mailMessage.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.mailThread.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.aIConversationMessage.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.aIConversation.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.userInvitation.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.aIConversation.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.aIEvent.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.camera.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.location.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.deal.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.pipelineStage.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.pipeline.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.customer.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.incident.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.ticket.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.user.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.role.deleteMany({})).catch(() => {});
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.lead.deleteMany({})).catch(() => {});
    await globalPrisma.$executeRawUnsafe(`TRUNCATE TABLE "Tenant" CASCADE;`);
  });

  it('STRONG: Malicious tenantId and createdById cannot override Deal context (S13.2 Regression + Zod)', async () => {
    const maliciousPayload = {
      title: 'Hacked Deal',
      value: 50000,
      pipelineId: pipelineA.id,
      stageId: stageA.id,
      customerId: customerA.id,
      assignedUserId: userA.id,
      tenantId: tenantB.id, // MALICIOUS
      createdById: 'some-other-user', // MALICIOUS
      deletedAt: new Date(), // MALICIOUS
      someUnknownField: 'hacker' // MALICIOUS
    };

    const res = await createDealAction(maliciousPayload);
    if (!res.success) require('fs').writeFileSync('deal_err_test1.json', JSON.stringify(res.error, null, 2));
    expect(res.success).toBe(true);

    const deal = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.deal.findFirst({ where: { id: res.data.id } }));
    expect(deal).toBeDefined();
    
    // Zod must have stripped the fields, and service explicitly mapped tenantId and createdById
    expect(deal?.tenantId).toBe(tenantA.id); // Context wins
    expect(deal?.tenantId).not.toBe(tenantB.id);
    expect(deal?.createdById).toBe(userA.id); // Context wins
    expect(deal?.deletedAt).toBeNull(); // Zod stripped it
  });

  it('STRONG: Unknown fields do not reach the incident mutation (Zod strip)', async () => {
    const maliciousPayload = {
      locationId: locationA.id,
      cameraId: cameraA.id,
      aiEventId: aiEventA.id,
      title: 'Test Incident',
      severity: 'HIGH',
      internalStatus: 'RESOLVED', // MALICIOUS
      tenantId: tenantB.id // MALICIOUS
    };

    const res = await createIncidentAction(maliciousPayload);
    if (!res.success) require('fs').writeFileSync('incident_err.json', JSON.stringify(res.error, null, 2));
    expect(res.success).toBe(true);

    const incident = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => await tx.incident.findFirst({ where: { id: res.data.id } }));
    expect(incident).toBeDefined();
    expect(incident?.tenantId).toBe(tenantA.id);
    expect(incident?.status).toBe('OPEN'); // Did not override default status
  });

  it('STRONG: Malformed input fails closed (Zod validation error)', async () => {
    const malformedPayload = {
      title: '', // Empty title should fail min(1)
      value: -100, // Negative value should fail nonnegative
      pipelineId: pipelineA.id,
      stageId: stageA.id,
      customerId: customerA.id
    };

    const res = await createDealAction(malformedPayload);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.error).toMatch(/Validation failed/i);
  });
});
