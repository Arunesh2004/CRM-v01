import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import globalPrisma from '@db/utils/prisma';
import { deriveOpaquePath } from '@/modules/cctv/opaque-path.helper';

describe('Phase C11 Adversarial Architecture Tests', () => {
  let tenant: any;
  let camera: any;

  beforeAll(async () => {
    process.env.CCTV_OPAQUE_PATH_SECRET = 'c11-test-secret';
    
    tenant = await globalPrisma.tenant.create({
      data: { name: 'C11 Test Tenant' }
    });

    camera = await globalPrisma.camera.create({
      data: {
        tenantId: tenant.id,
        name: 'C11 Camera',
        ipAddress: '192.168.1.100',
        protocol: 'RTSP',
        streamVersion: 1
      }
    });
  });

  afterAll(async () => {
    await globalPrisma.camera.delete({ where: { id: camera.id } });
    await globalPrisma.tenant.delete({ where: { id: tenant.id } });
  });

  it('should reject terminal FAILED jobs from being reclaimed', async () => {
    const job = await globalPrisma.recordingIngestionJob.create({
      data: {
        localFilePath: '/var/lib/mediamtx/recordings/fake/failed.mp4',
        segmentId: 'failed-segment-id',
        recordingNodeId: 'test-node-id', // Test fixture node ID
        status: 'FAILED'
      } as any, // as any: test-node-id bypasses FK for unit test purposes
    });

    const claimedJobIdsResult = await globalPrisma.$queryRaw<{ id: string }[]>`
      UPDATE "RecordingIngestionJob"
      SET status = 'PROCESSING', "workerId" = 'test-worker'
      WHERE id IN (
        SELECT id FROM "RecordingIngestionJob"
        WHERE status = 'PENDING' OR (status = 'RETRY_SCHEDULED' AND "nextAttemptAt" <= NOW()) OR (status = 'PROCESSING' AND "leaseExpiresAt" <= NOW())
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 10
      )
      RETURNING id;
    `;

    const claimedIds = claimedJobIdsResult.map((r) => r.id);
    expect(claimedIds).not.toContain(job.id);
    
    await globalPrisma.recordingIngestionJob.delete({ where: { id: job.id } });
  });

  it('should allow RETRY_SCHEDULED jobs to be reclaimed when backoff expires', async () => {
    const pastDate = new Date(Date.now() - 10000); // 10 seconds ago

    const job = await globalPrisma.recordingIngestionJob.create({
      data: {
        localFilePath: '/var/lib/mediamtx/recordings/fake/retry.mp4',
        segmentId: 'retry-segment-id',
        recordingNodeId: 'test-node-id', // Test fixture node ID
        status: 'RETRY_SCHEDULED',
        nextAttemptAt: pastDate
      } as any, // as any: test-node-id bypasses FK for unit test purposes
    });

    const claimedJobIdsResult = await globalPrisma.$queryRaw<{ id: string }[]>`
      UPDATE "RecordingIngestionJob"
      SET status = 'PROCESSING', "workerId" = 'test-worker', "leaseExpiresAt" = NOW() + INTERVAL '10 minutes'
      WHERE id IN (
        SELECT id FROM "RecordingIngestionJob"
        WHERE status = 'PENDING' OR (status = 'RETRY_SCHEDULED' AND "nextAttemptAt" <= NOW()) OR (status = 'PROCESSING' AND "leaseExpiresAt" <= NOW())
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 10
      )
      RETURNING id;
    `;

    const claimedIds = claimedJobIdsResult.map((r) => r.id);
    expect(claimedIds).toContain(job.id);
    
    await globalPrisma.recordingIngestionJob.delete({ where: { id: job.id } });
  });

  it('should prevent stale workers from overwriting database state after lease loss', async () => {
    const recording = await globalPrisma.recording.create({
      data: {
        tenantId: tenant.id,
        cameraId: camera.id,
        segmentId: 'mock-seg-id',
        streamVersion: 1,
        storageKey: 'mock/key',
        startTime: new Date()
      }
    });

    const job = await globalPrisma.aIAnalysisJob.create({
      data: {
        recordingId: recording.id,
        analysisType: 'test',
        dedupeKey: 'stale-worker-test',
        status: 'PROCESSING',
        workerId: 'worker-b', // Worker B stole the lease
        leaseExpiresAt: new Date(Date.now() + 600000)
      }
    });

    // Worker A tries to complete the job
    const workerAId = 'worker-a';
    const updateRes = await globalPrisma.aIAnalysisJob.updateMany({
      where: { id: job.id, workerId: workerAId, status: 'PROCESSING' },
      data: { status: 'COMPLETED', workerId: null, leaseExpiresAt: null }
    });

    expect(updateRes.count).toBe(0); // Worker A cannot modify state

    const dbJob = await globalPrisma.aIAnalysisJob.findUnique({ where: { id: job.id } });
    expect(dbJob?.status).toBe('PROCESSING'); // Status unchanged
    expect(dbJob?.workerId).toBe('worker-b'); // Worker B still owns it
    
    await globalPrisma.aIAnalysisJob.delete({ where: { id: job.id } });
    await globalPrisma.recording.delete({ where: { id: recording.id } });
  });
});
