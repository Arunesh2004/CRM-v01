import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import globalPrisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { withJobContext } from '@/lib/queue/worker';
import { SecureJobEnvelope } from '@/lib/queue/types';

describe('Async Infrastructure Security & Idempotency', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tA_AdminId: string;
  let tB_AdminId: string;
  let tA_LocationId: string;
  let tB_LocationId: string;
  let tA_CameraId: string;
  let tB_CameraId: string;

  beforeAll(async () => {
    // Bootstrap test data
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const tA = await tx.tenant.create({ data: { name: 'Tenant A Async', status: 'ACTIVE' } });
      const tB = await tx.tenant.create({ data: { name: 'Tenant B Async', status: 'ACTIVE' } });
      tenantAId = tA.id;
      tenantBId = tB.id;

      const adminRoleA = await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId: tA.id } });
      const adminRoleB = await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId: tB.id } });

      const uA_Admin = await tx.user.create({
        data: { email: 'admin-async@ta.com', tenantId: tA.id, userRoles: { create: { roleId: adminRoleA.id, tenantId: tA.id } } }
      });
      tA_AdminId = uA_Admin.id;

      const uB_Admin = await tx.user.create({
        data: { email: 'admin-async@tb.com', tenantId: tB.id, userRoles: { create: { roleId: adminRoleB.id, tenantId: tB.id } } }
      });
      tB_AdminId = uB_Admin.id;

      const custA = await tx.customer.create({ data: { name: 'Cust A', normalizedName: 'cust_a_async', tenantId: tA.id } });
      const custB = await tx.customer.create({ data: { name: 'Cust B', normalizedName: 'cust_b_async', tenantId: tB.id } });

      const locA = await tx.location.create({ data: { name: 'HQ A', tenantId: tA.id, customerId: custA.id } });
      tA_LocationId = locA.id;

      const locB = await tx.location.create({ data: { name: 'HQ B', tenantId: tB.id, customerId: custB.id } });
      tB_LocationId = locB.id;

      const camA = await tx.camera.create({
        data: { name: 'Cam A1', tenantId: tA.id, locationId: tA_LocationId, ipAddress: '10.0.0.1', protocol: 'RTSP' }
      });
      tA_CameraId = camA.id;

      const camB = await tx.camera.create({
        data: { name: 'Cam B1', tenantId: tB.id, locationId: tB_LocationId, ipAddress: '10.0.0.2', protocol: 'RTSP' }
      });
      tB_CameraId = camB.id;
    });
  });

  afterAll(async () => {
    // Cleanup
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.idempotencyKey.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.camera.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.location.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.customer.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.role.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    });
  });

  describe('1. Tenant Isolation', () => {
    it('Tenant A worker cannot process an event claiming Tenant A but targeting Tenant B resources', async () => {
      const jobId = 'test-job-isolation-1';
      const envelope: SecureJobEnvelope<any> = {
        jobId,
        tenantId: tenantAId, // Trusted worker context for A
        actorType: 'SYSTEM',
        correlationId: jobId,
        jobType: 'CCTV.AI_EVENT',
        payload: {
          cameraId: tB_CameraId, // Malicious payload aiming at B's camera
          detectedObject: 'person'
        },
        schemaVersion: '1.0'
      };

      const resultPromise = withJobContext(envelope, async (tx, payload) => {
        // The worker attempts to resolve the camera inside its bounded context
        const camera = await tx.camera.findFirst({ where: { id: payload.cameraId } });
        if (!camera) throw new Error('Camera not found within tenant boundary');
        return true;
      });

      await expect(resultPromise).rejects.toThrow('Camera not found within tenant boundary');
    });

    it('Rejects execution completely if tenant context is missing', async () => {
      const jobId = 'test-job-isolation-2';
      const envelope: any = {
        jobId,
        actorType: 'SYSTEM',
        correlationId: jobId,
        jobType: 'CCTV.AI_EVENT',
        payload: {},
        schemaVersion: '1.0'
      };

      await expect(withJobContext(envelope, async () => true)).rejects.toThrow(/SECURE_CONTEXT_ERROR/);
    });
  });

  describe('3. Duplicate Event / Idempotency & 4. Replay Attack', () => {
    it('Safely ignores duplicate jobs (exact same jobId) without re-executing', async () => {
      const jobId = 'test-job-idempotent-1';
      const envelope: SecureJobEnvelope<any> = {
        jobId,
        tenantId: tenantAId,
        actorType: 'SYSTEM',
        correlationId: jobId,
        jobType: 'CCTV.AI_EVENT',
        payload: { test: true },
        schemaVersion: '1.0'
      };

      let executionCount = 0;
      const handler = async () => {
        executionCount++;
        return 'PROCESSED';
      };

      // First run should execute
      const result1 = await withJobContext(envelope, handler);
      expect(result1).toBe('PROCESSED');
      expect(executionCount).toBe(1);

      // Replay identical job -> Should NOT throw, should silently return null, and not increment count
      const result2 = await withJobContext(envelope, handler);
      expect(result2).toBeNull();
      expect(executionCount).toBe(1);
    });
  });

  describe('5. Cross-Tenant Replay', () => {
    it('Idempotency keys are tenant-isolated (Tenant B can legitimately use the same abstract job ID if somehow generated, but cannot replay A\'s payload)', async () => {
      // If Tenant B submits the identical payload with identical Job ID, it executes for B because idempotency keys are tenant-scoped.
      // But they cannot access A's data inside it.
      const jobId = 'test-job-shared-id';
      
      const envelopeA: SecureJobEnvelope<any> = {
        jobId, tenantId: tenantAId, actorType: 'SYSTEM', correlationId: jobId, jobType: 'TEST', payload: {}, schemaVersion: '1.0'
      };
      
      const envelopeB: SecureJobEnvelope<any> = {
        jobId, tenantId: tenantBId, actorType: 'SYSTEM', correlationId: jobId, jobType: 'TEST', payload: {}, schemaVersion: '1.0'
      };

      let execA = 0;
      let execB = 0;

      await withJobContext(envelopeA, async () => { execA++; });
      await withJobContext(envelopeB, async () => { execB++; });

      expect(execA).toBe(1);
      expect(execB).toBe(1);

      // Replays fail for both
      await expect(withJobContext(envelopeA, async () => { execA++; })).resolves.toBeNull();
      await expect(withJobContext(envelopeB, async () => { execB++; })).resolves.toBeNull();
      
      expect(execA).toBe(1);
      expect(execB).toBe(1);
    });
  });

  describe('9. Failure / Retry Safety', () => {
    it('Allows retry if the previous attempt failed and aborted the transaction (idempotency key is rolled back)', async () => {
      const jobId = 'test-job-retryable';
      const envelope: SecureJobEnvelope<any> = {
        jobId, tenantId: tenantAId, actorType: 'SYSTEM', correlationId: jobId, jobType: 'TEST', payload: {}, schemaVersion: '1.0'
      };

      let execCount = 0;

      // First attempt fails
      await expect(
        withJobContext(envelope, async () => {
          execCount++;
          throw new Error('Transient DB Failure');
        })
      ).rejects.toThrow('Transient DB Failure');

      expect(execCount).toBe(1);

      // Because the transaction aborted, the idempotency key was never committed.
      // The worker (Inngest) will retry. This second attempt should succeed.
      const result = await withJobContext(envelope, async () => {
        execCount++;
        return 'SUCCESS';
      });

      expect(result).toBe('SUCCESS');
      expect(execCount).toBe(2);
      
      // Third attempt (replay of success) should be ignored
      const result3 = await withJobContext(envelope, async () => {
        execCount++;
        return 'SUCCESS';
      });

      expect(result3).toBeNull();
      expect(execCount).toBe(2);
    });
  });
});
