import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import globalPrisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { outboxWorker } from '@/lib/queue/functions/outbox.worker';
import { simulateAIEvent } from '@/modules/cctv/camera.service';
import { SecureJobEnvelope } from '@/lib/queue/types';

// Mock auth globally for this test
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(() => Promise.resolve({ id: 'mocked-admin-id' })),
  requireTenant: vi.fn(() => Promise.resolve('mocked-tenant-id')),
  requirePermission: vi.fn(() => Promise.resolve(true))
}));

import { requireAuth, requireTenant } from '@/lib/auth';

describe('CCTV AI Event Decoupling', () => {
  let tenantId: string;
  let adminId: string;
  let locationId: string;
  let cameraId: string;

  beforeAll(async () => {
    // Bootstrap test data
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const t = await tx.tenant.create({ data: { name: 'Tenant Async CCTV', status: 'ACTIVE' } });
      tenantId = t.id;

      const adminRole = await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId: t.id } });
      const adminRolePermission = await tx.rolePermission.create({
         data: {
            tenantId: t.id,
            roleId: adminRole.id,
            permissionId: (await tx.permission.findFirst({ where: { resource: 'CUSTOMER', action: 'UPDATE' } }))!.id
         }
      });

      const uAdmin = await tx.user.create({
        data: { email: 'admin-cctv-async@t.com', tenantId: t.id, userRoles: { create: { roleId: adminRole.id, tenantId: t.id } } }
      });
      adminId = uAdmin.id;

      const cust = await tx.customer.create({ data: { name: 'Cust', normalizedName: 'cust', tenantId: t.id } });
      const loc = await tx.location.create({ data: { name: 'HQ', tenantId: t.id, customerId: cust.id } });
      locationId = loc.id;

      const cam = await tx.camera.create({
        data: { name: 'Cam', tenantId: t.id, locationId: locationId, ipAddress: '10.0.0.1', protocol: 'RTSP' }
      });
      cameraId = cam.id;
      
      // Update mock implementations with actual dynamic IDs
      (requireAuth as any).mockImplementation(() => Promise.resolve({ id: adminId }));
      (requireTenant as any).mockImplementation(() => Promise.resolve(tenantId));
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.idempotencyKey.deleteMany({ where: { tenantId } });
      await tx.eventOutbox.deleteMany({ where: { tenantId } });
      await tx.notification.deleteMany({ where: { tenantId } });
      await tx.activityTimeline.deleteMany({ where: { tenantId } });
      await tx.incident.deleteMany({ where: { tenantId } });
      await tx.aIEvent.deleteMany({ where: { tenantId } });
      await tx.camera.deleteMany({ where: { tenantId } });
      await tx.location.deleteMany({ where: { tenantId } });
      await tx.customer.deleteMany({ where: { tenantId } });
      await tx.user.deleteMany({ where: { tenantId } });
      await tx.rolePermission.deleteMany({ where: { tenantId } });
      await tx.role.deleteMany({ where: { tenantId } });
      await tx.tenant.deleteMany({ where: { id: tenantId } });
    });
  });

  it('1. Request behavior: simulateAIEvent creates AIEvent and EventOutbox but NOT Incident', async () => {
    const result = await simulateAIEvent({
      cameraId,
      detectedObject: 'Intrusion (Person)',
      confidence: 0.95
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();

    // Verify AIEvent was created
    const aiEvent = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.aIEvent.findUnique({ where: { id: result.id } })
    );
    expect(aiEvent).toBeDefined();

    // Verify EventOutbox was created
    const outbox = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.eventOutbox.findFirst({ where: { eventId: result.id } })
    );
    expect(outbox).toBeDefined();
    expect(outbox!.eventType).toBe('CCTV.AI_EVENT.DETECTED');

    // Verify Incident was NOT created yet
    const incident = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.incident.findFirst({ where: { aiEventId: result.id } })
    );
    expect(incident).toBeNull();
  });

  it('2. Worker behavior: processing the outbox event creates Incident, Timeline, and Notification', async () => {
    const aiEvent = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.aIEvent.findFirst({ where: { tenantId } })
    );
    const outbox = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.eventOutbox.findFirst({ where: { eventId: aiEvent!.id } })
    );
    
    expect(outbox).toBeDefined();

    // Simulate inngest triggering the worker
    const stepMock = {
      run: async (name: string, fn: () => Promise<any>) => fn()
    };

    const envelope: SecureJobEnvelope<any> = {
      jobId: outbox!.id,
      tenantId: outbox!.tenantId,
      actorType: 'SYSTEM',
      correlationId: outbox!.eventId,
      jobType: outbox!.eventType,
      payload: outbox!.payload,
      schemaVersion: '1.0'
    };

    const workerFn = (outboxWorker as any).fn;
    await workerFn({ event: { data: envelope }, step: stepMock });

    // Verify Incident WAS created
    const incident = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.incident.findFirst({ where: { aiEventId: aiEvent!.id } })
    );
    expect(incident).toBeDefined();
    expect(incident!.severity).toBe('HIGH');

    // Verify ActivityTimeline WAS created
    const timeline = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.activityTimeline.findFirst({ where: { content: { contains: 'Intrusion (Person)' } } })
    );
    expect(timeline).toBeDefined();

    // Verify Notification WAS created
    const notification = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.notification.findFirst({ where: { userId: adminId } })
    );
    expect(notification).toBeDefined();
    expect(notification!.type).toBe('ALERT');
  });

});
