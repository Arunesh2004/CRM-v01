import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import globalPrisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { withTenant } from '@db/utils/prisma-tenant';

describe('S13-11: RLS Defect Remediation', () => {
  let tenantA: any;
  let tenantB: any;
  let cameraA: any;
  let cameraB: any;
  let recordingA: any;
  let recordingB: any;

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.PLATFORM_MAINTENANCE, async (tx) => {
      tenantA = await tx.tenant.create({ data: { name: 'Tenant A', status: 'ACTIVE' } });
      tenantB = await tx.tenant.create({ data: { name: 'Tenant B', status: 'ACTIVE' } });

      cameraA = await tx.camera.create({
        data: {
          tenantId: tenantA.id,
          name: 'Cam A',
          ipAddress: '10.0.0.1',
          protocol: 'RTSP'
        }
      });

      cameraB = await tx.camera.create({
        data: {
          tenantId: tenantB.id,
          name: 'Cam B',
          ipAddress: '10.0.0.2',
          protocol: 'RTSP'
        }
      });

      recordingA = await tx.recording.create({
        data: {
          tenantId: tenantA.id,
          cameraId: cameraA.id,
          startTime: new Date(),
          storageKey: 'dummyA'
        }
      });

      recordingB = await tx.recording.create({
        data: {
          tenantId: tenantB.id,
          cameraId: cameraB.id,
          startTime: new Date(),
          storageKey: 'dummyB'
        }
      });
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.PLATFORM_MAINTENANCE, async (tx) => {
      await tx.recording.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
      await tx.camera.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
      await tx.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
    });
  });

  describe('CameraStreamInvalidation RLS', () => {
    let invAId: string;
    
    beforeAll(async () => {
      await executeAsSystem(SystemOperation.PLATFORM_CRON, async (tx) => {
        const invA = await tx.cameraStreamInvalidation.create({
          data: {
            tenantId: tenantA.id,
            cameraId: cameraA.id,
            streamVersion: 1,
            opaquePath: 'pathA'
          }
        });
        invAId = invA.id;
      });
    });

    it('denies access with no tenant context', async () => {
      const records = await globalPrisma.cameraStreamInvalidation.findMany();
      expect(records.length).toBe(0); // Should be empty due to RLS
    });

    it('allows access only to Tenant A rows for Tenant A context', async () => {
      const records = await withTenant(tenantA.id).cameraStreamInvalidation.findMany();
      expect(records.length).toBeGreaterThan(0);
      expect(records.every(r => r.tenantId === tenantA.id)).toBe(true);
    });

    it('denies access to Tenant A rows from Tenant B context', async () => {
      const records = await withTenant(tenantB.id).cameraStreamInvalidation.findMany({
        where: { id: invAId }
      });
      expect(records.length).toBe(0);
    });

    it('prevents cross-tenant mutation', async () => {
      await expect(withTenant(tenantB.id).cameraStreamInvalidation.update({
        where: { id: invAId },
        data: { status: 'COMPLETED' }
      })).rejects.toThrow();
    });

    it('system role via PLATFORM_CRON can access all', async () => {
      await executeAsSystem(SystemOperation.PLATFORM_CRON, async (tx) => {
        const records = await tx.cameraStreamInvalidation.findMany({
          where: { id: invAId }
        });
        expect(records.length).toBe(1);
      });
    });
  });

  describe('AIAnalysisJob RLS', () => {
    let jobAId: string;

    beforeAll(async () => {
      await executeAsSystem(SystemOperation.PLATFORM_MAINTENANCE, async (tx) => {
        const job = await tx.aIAnalysisJob.create({
          data: {
            tenantId: tenantA.id,
            recordingId: recordingA.id,
            analysisType: 'OBJECT_DETECTION',
            dedupeKey: 'dedupeA'
          }
        });
        jobAId = job.id;
      });
    });

    it('denies access with no tenant context', async () => {
      const jobs = await globalPrisma.aIAnalysisJob.findMany();
      expect(jobs.length).toBe(0);
    });

    it('allows access to Tenant A rows for Tenant A context', async () => {
      const jobs = await withTenant(tenantA.id).aIAnalysisJob.findMany();
      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs.every(j => j.tenantId === tenantA.id)).toBe(true);
    });

    it('denies access to Tenant A rows from Tenant B context', async () => {
      const jobs = await withTenant(tenantB.id).aIAnalysisJob.findMany({
        where: { id: jobAId }
      });
      expect(jobs.length).toBe(0);
    });

    it('prevents cross-tenant mutation', async () => {
      await expect(withTenant(tenantB.id).aIAnalysisJob.update({
        where: { id: jobAId },
        data: { status: 'COMPLETED' }
      })).rejects.toThrow();
    });
  });
});
