import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import globalPrisma from '@db/utils/prisma';
import { createDealAction } from '@/modules/crm/actions/deal.actions';
import { createTicketAction } from '@/modules/support/actions/ticket.actions';
import { createIncidentAction } from '@/modules/incident/actions/incident.actions';
import * as auth from '@/lib/auth';

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

    tenantA = await globalPrisma.tenant.create({ data: { name: 'Tenant A' } });
    tenantB = await globalPrisma.tenant.create({ data: { name: 'Tenant B - Target' } });
    userA = await globalPrisma.user.create({ data: { tenantId: tenantA.id, email: 'usera@a.com', clerkId: 'user_a', firstName: 'A', lastName: 'A' } });
    
    vi.mocked(auth.requireAuth).mockResolvedValue({ id: userA.id, role: 'USER' } as any);
    vi.mocked(auth.requireTenant).mockResolvedValue(tenantA.id);
    vi.mocked(auth.requirePermission).mockResolvedValue(true as any);
    vi.mocked(auth.requireAuthIdentity).mockResolvedValue({ id: userA.id, email: 'usera@a.com' } as any);
    vi.mocked(auth.requireTenantFromIdentity).mockResolvedValue(tenantA.id);
    vi.mocked(auth.requirePermissionFast).mockResolvedValue(true as any);

    pipelineA = await globalPrisma.pipeline.create({ data: { tenantId: tenantA.id, name: 'P' } });
    stageA = await globalPrisma.pipelineStage.create({ data: { tenantId: tenantA.id, pipelineId: pipelineA.id, name: 'S', order: 1, probability: 10 } });
    customerA = await globalPrisma.customer.create({ data: { tenantId: tenantA.id, name: 'C', normalizedName: 'c' } });
    locationA = await globalPrisma.location.create({ data: { tenantId: tenantA.id, customerId: customerA.id, name: 'L' } });
    cameraA = await globalPrisma.camera.create({ data: { tenantId: tenantA.id, locationId: locationA.id, name: 'Cam', status: 'ONLINE', ipAddress: '192.168.1.1', protocol: 'RTSP' } });
    aiEventA = await globalPrisma.aIEvent.create({ data: { tenantId: tenantA.id, cameraId: cameraA.id, confidence: 0.99, timestamp: new Date(), model: 'yolov8', detectedObject: 'person' } });
  });

  afterEach(async () => {
    await globalPrisma.activityTimeline.deleteMany({});
    await globalPrisma.document.deleteMany({});
    await globalPrisma.mailMessage.deleteMany({});
    await globalPrisma.mailThread.deleteMany({});
    await globalPrisma.aIConversationMessage.deleteMany({});
    await globalPrisma.aIConversation.deleteMany({});
    await globalPrisma.userInvitation.deleteMany({});
    await globalPrisma.aIConversation.deleteMany({});
    await globalPrisma.aIEvent.deleteMany({});
    await globalPrisma.camera.deleteMany({});
    await globalPrisma.location.deleteMany({});
    await globalPrisma.deal.deleteMany({});
    await globalPrisma.pipelineStage.deleteMany({});
    await globalPrisma.pipeline.deleteMany({});
    await globalPrisma.customer.deleteMany({});
    await globalPrisma.incident.deleteMany({});
    await globalPrisma.ticket.deleteMany({});
    await globalPrisma.user.deleteMany({});
    await globalPrisma.role.deleteMany({});
    await globalPrisma.lead.deleteMany({});
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

    const deal = await globalPrisma.deal.findFirst({ where: { id: res.data.id } });
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

    const incident = await globalPrisma.incident.findFirst({ where: { id: res.data.id } });
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
