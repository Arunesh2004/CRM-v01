import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import crypto from 'crypto';
import prisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { IdempotencyConflictError } from '@/infrastructure/errors';

// Mock auth before importing services
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    requireAuth: vi.fn().mockResolvedValue({ id: 'mock-user-id', email: 'test@test.com' }),
    requireTenant: vi.fn().mockResolvedValue('mock-tenant-id'),
    requirePermission: vi.fn().mockResolvedValue(true),
    checkPermissionFast: vi.fn().mockResolvedValue(true),
  }
});

import * as taskService from '@/modules/crm/task/task.service';
import { TicketService } from '@/modules/support/ticket.service';
import * as incidentService from '@/modules/incident/incident.service';

describe('Service Level Idempotency Integration Tests (PostgreSQL)', () => {
  let tenantId: string;
  let userId: string;
  let customerId: string;
  let locationId: string;
  let cameraId: string;

  beforeAll(async () => {
    tenantId = crypto.randomUUID();
    userId = crypto.randomUUID();
    customerId = crypto.randomUUID();
    locationId = crypto.randomUUID();
    cameraId = crypto.randomUUID();

    // Update mocks with actual IDs
    const authMock = await import('@/lib/auth');
    (authMock.requireAuth as any).mockResolvedValue({ id: userId, email: 'test@test.com' });
    (authMock.requireTenant as any).mockResolvedValue(tenantId);

    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.tenant.create({ data: { id: tenantId, name: 'Service Test Tenant' } });
      await tx.user.create({ data: { id: userId, email: 'test2@example.com', tenantId, firstName: 'Test', lastName: 'User' } });
      await tx.customer.create({ data: { id: customerId, tenantId, name: 'Test Customer', normalizedName: 'test customer' } });
      await tx.location.create({ data: { id: locationId, tenantId, customerId, name: 'Test Location' } });
      await tx.camera.create({ data: { id: cameraId, tenantId, locationId, name: 'Test Camera', status: 'ONLINE', ipAddress: '192.168.1.100', protocol: 'ONVIF' } });
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SYSTEM_MAINTENANCE, async (tx) => {
      await tx.idempotencyKey.deleteMany({ where: { tenantId } });
      await tx.activityTimeline.deleteMany({ where: { tenantId } });
      await tx.incident.deleteMany({ where: { tenantId } });
      await tx.ticket.deleteMany({ where: { tenantId } });
      await tx.task.deleteMany({ where: { tenantId } });
      await tx.aIEvent.deleteMany({ where: { tenantId } });
      await tx.camera.deleteMany({ where: { tenantId } });
      await tx.location.deleteMany({ where: { tenantId } });
      await tx.customer.deleteMany({ where: { tenantId } });
      await tx.user.deleteMany({ where: { tenantId } });
      // Skip Tenant/AuditLog deletion to avoid trigger issues
    });
  });

  describe('Task Idempotency', () => {
    it('should create exactly one task under concurrent identical requests', async () => {
      const idempotencyKey = crypto.randomUUID();
      const taskInput = {
        title: 'Concurrent Task Service',
        status: 'PENDING',
        priority: 'HIGH',
        customerId,
        idempotencyKey
      };

      const results = await Promise.allSettled([
        taskService.createTask(taskInput),
        taskService.createTask(taskInput),
        taskService.createTask(taskInput)
      ]);

      const fulfilled = results.filter(r => r.status === 'fulfilled');
      expect(fulfilled.length).toBeGreaterThan(0);

      const tasks = await prisma.task.findMany({ where: { tenantId, title: 'Concurrent Task Service' } });
      expect(tasks.length).toBe(1);

      const keys = await prisma.idempotencyKey.findMany({ where: { tenantId, key: idempotencyKey } });
      expect(keys.length).toBe(1);
    });

    it('should throw conflict if different payload is used with same key', async () => {
      const idempotencyKey = crypto.randomUUID();
      await taskService.createTask({ title: 'T1', status: 'PENDING', idempotencyKey } as any);
      
      await expect(
        taskService.createTask({ title: 'T2', status: 'PENDING', idempotencyKey } as any)
      ).rejects.toThrow(IdempotencyConflictError);
    });
  });

  describe('Ticket Idempotency', () => {
    it('should create exactly one ticket under concurrent identical requests', async () => {
      const idempotencyKey = crypto.randomUUID();

      const results = await Promise.allSettled([
        TicketService.createTicket(tenantId, userId, customerId, 'Concurrent Ticket Subj', 'Desc', 'HIGH', undefined, idempotencyKey),
        TicketService.createTicket(tenantId, userId, customerId, 'Concurrent Ticket Subj', 'Desc', 'HIGH', undefined, idempotencyKey),
      ]);

      const fulfilled = results.filter(r => r.status === 'fulfilled');
      expect(fulfilled.length).toBeGreaterThan(0);

      const tickets = await prisma.ticket.findMany({ where: { tenantId, subject: 'Concurrent Ticket Subj' } });
      expect(tickets.length).toBe(1);
    });
  });

  describe('Incident Idempotency', () => {
    it('should create exactly one incident under concurrent identical requests', async () => {
      const idempotencyKey = crypto.randomUUID();
      const aiEventId = crypto.randomUUID();

      await prisma.aIEvent.create({
        data: { id: aiEventId, tenantId, cameraId, confidence: 0.99, model: 'yolov8', detectedObject: 'person' }
      });

      const input = {
        locationId,
        cameraId,
        aiEventId,
        title: 'Concurrent Incident',
        severity: 'HIGH',
        idempotencyKey
      };

      const results = await Promise.allSettled([
        incidentService.createIncident(input as any),
        incidentService.createIncident(input as any),
      ]);

      const fulfilled = results.filter(r => r.status === 'fulfilled');
      expect(fulfilled.length).toBeGreaterThan(0);

      const incidents = await prisma.incident.findMany({ where: { tenantId, title: 'Concurrent Incident' } });
      expect(incidents.length).toBe(1);
    });

    it('should preserve business P2002 if aiEventId is duplicated across different idempotency keys', async () => {
      const aiEventId = crypto.randomUUID();
      await prisma.aIEvent.create({
        data: { id: aiEventId, tenantId, cameraId, confidence: 0.99, model: 'yolov8', detectedObject: 'person' }
      });

      const key1 = crypto.randomUUID();
      const key2 = crypto.randomUUID();

      await incidentService.createIncident({
        locationId, cameraId, aiEventId, title: 'Inc 1', severity: 'HIGH', idempotencyKey: key1
      } as any);

      await expect(
        incidentService.createIncident({
          locationId, cameraId, aiEventId, title: 'Inc 2', severity: 'HIGH', idempotencyKey: key2
        } as any)
      ).rejects.toThrow();
    });
  });
});
