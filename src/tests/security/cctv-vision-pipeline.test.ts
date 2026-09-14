/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import prisma from '@db/utils/prisma';
import { withTenant } from '@db/utils/prisma-tenant';
import { randomUUID } from 'crypto';
import { cctvVisionWorker } from '@/lib/queue/functions/cctv.vision';
import { AIProviderFactory } from '@/lib/providers/ai/ai-provider.factory';

// Mock S3 provider to avoid real network calls
vi.mock('@/lib/providers/storage/s3.provider', () => ({
  generateSignedDownloadUrl: vi.fn().mockResolvedValue('https://mock-s3-url.com/video.mp4')
}));

// Mock Inngest context
const mockStep = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: async (name: string, fn: () => Promise<any>) => await fn()
};

describe('Phase C7.2 - CCTV Vision Pipeline Security', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tenantA: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tenantB: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cameraA: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recordingA: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    tenantA = await prisma.tenant.create({ data: { name: `Tenant A ${randomUUID()}` } });
    tenantB = await prisma.tenant.create({ data: { name: `Tenant B ${randomUUID()}` } });

    cameraA = await withTenant(tenantA.id).camera.create({
      data: {
        tenantId: tenantA.id,
        name: 'Front Door',
        status: 'ONLINE',
        streamVersion: 1,
        ipAddress: '192.168.1.100',
        protocol: 'RTSP'
      }
    });



    recordingA = await withTenant(tenantA.id).recording.create({
      data: {
        tenantId: tenantA.id,
        cameraId: cameraA.id,
        status: 'COMPLETED',
        startTime: new Date(),
        segmentId: randomUUID(),
        storageKey: `cctv_recordings/${tenantA.id}/${cameraA.id}/v1/test.mp4`,
        sizeBytes: 1024
      }
    });
  });

  describe('1. Tenant Isolation & Forgery', () => {
    it('rejects a forged tenantId in job payload', async () => {
      // The envelope claims tenantB but the recording belongs to tenantA
      const event = {
        id: randomUUID(),
        data: {
          jobId: randomUUID(),
          tenantId: tenantB.id, // Forged!
          actorType: 'SYSTEM',
          payload: { recordingId: recordingA.id }
        }
      };

      const result = await cctvVisionWorker.fn({ event, step: mockStep } as any);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('RECORDING_NOT_FOUND');
    });

    it('creates CameraEvent using the authoritative tenantId', async () => {
      // We will mock the vision provider to return a success
      const mockAnalyze = vi.fn().mockResolvedValue([{
        eventType: 'MOTION',
        confidence: 0.95,
        timestamp: new Date()
      }]);
      vi.spyOn(AIProviderFactory, 'getVisionProvider').mockReturnValue({
        getCapabilities: () => ({ supportsUrlInput: true, supportsBytesInput: true, supportsVideo: true, maxFrames: 15 }),
        analyze: mockAnalyze
      });

      const event = {
        id: randomUUID(),
        data: {
          jobId: randomUUID(),
          tenantId: tenantA.id,
          actorType: 'SYSTEM',
          payload: { recordingId: recordingA.id }
        }
      };

      const result = await cctvVisionWorker.fn({ event, step: mockStep } as any);
      expect(result.success).toBe(true);
      expect(result.eventsCreated).toBe(1);

      // Verify the event was created securely under tenant A
      const events = await withTenant(tenantA.id).cameraEvent.findMany({ where: { cameraId: cameraA.id } });
      expect(events).toHaveLength(1);
      expect(events[0].tenantId).toBe(tenantA.id);
    });
  });

  describe('2. Provider Degradation', () => {
    it('degrades safely when AI provider is not configured', async () => {
      vi.spyOn(AIProviderFactory, 'getVisionProvider').mockReturnValue({
        getCapabilities: () => ({ supportsUrlInput: true, supportsBytesInput: true, supportsVideo: true, maxFrames: 15 }),
        analyze: async () => { throw new Error('AI_PROVIDER_NOT_CONFIGURED'); }
      });

      const event = { id: randomUUID(), data: { jobId: randomUUID(), tenantId: tenantA.id, actorType: 'SYSTEM', payload: { recordingId: recordingA.id } } };

      const result = await cctvVisionWorker.fn({ event, step: mockStep } as any);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('AI_PROVIDER_NOT_CONFIGURED');
    });
  });

  describe('3. Idempotency & Duplicate Prevention', () => {
    it('does not create duplicate CameraEvents on retry', async () => {
      const mockAnalyze = vi.fn().mockResolvedValue([{
        eventType: 'MOTION',
        confidence: 0.85,
        timestamp: new Date()
      }]);
      vi.spyOn(AIProviderFactory, 'getVisionProvider').mockReturnValue({
        getCapabilities: () => ({ supportsUrlInput: true, supportsBytesInput: true, supportsVideo: true, maxFrames: 15 }),
        analyze: mockAnalyze
      });

      const event = { id: randomUUID(), data: { jobId: randomUUID(), tenantId: tenantA.id, actorType: 'SYSTEM', payload: { recordingId: recordingA.id } } };

      // First run
      const result1 = await cctvVisionWorker.fn({ event, step: mockStep } as any);
      expect(result1.success).toBe(true);

      // Second run (duplicate job delivery)
      const result2 = await cctvVisionWorker.fn({ event, step: mockStep } as any);
      expect(result2).toBeNull(); // withJobContext catches duplicate and returns null
      expect(mockAnalyze).toHaveBeenCalledTimes(1); // Provider only called once
      
      const events = await withTenant(tenantA.id).cameraEvent.findMany({ where: { cameraId: cameraA.id } });
      expect(events).toHaveLength(1);
    });
  });

  describe('4. Decommissioned Camera Protection', () => {
    it('skips AI inference if camera is decommissioned', async () => {
      await withTenant(tenantA.id).camera.update({
        where: { id: cameraA.id },
        data: { status: 'MAINTENANCE' }
      });

      const event = { id: randomUUID(), data: { jobId: randomUUID(), tenantId: tenantA.id, actorType: 'SYSTEM', payload: { recordingId: recordingA.id } } };
      
      const result = await cctvVisionWorker.fn({ event, step: mockStep } as any);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('CAMERA_INACTIVE');
    });
  });

  describe('5. Provider Output Validation', () => {
    it('rejects malformed provider JSON cleanly', async () => {
      const mockAnalyze = vi.fn().mockResolvedValue([{
        eventType: 'INVALID_EVENT', // Not MOTION
        confidence: 0.9,
        timestamp: new Date()
      }]);
      vi.spyOn(AIProviderFactory, 'getVisionProvider').mockReturnValue({
        getCapabilities: () => ({ supportsUrlInput: true, supportsBytesInput: true, supportsVideo: true, maxFrames: 15 }),
        analyze: mockAnalyze
      });

      const event = { id: randomUUID(), data: { jobId: randomUUID(), tenantId: tenantA.id, actorType: 'SYSTEM', payload: { recordingId: recordingA.id } } };

      await expect(cctvVisionWorker.fn({ event, step: mockStep } as any))
        .rejects.toThrow('MALFORMED_VISION_OUTPUT');
    });

    it('rejects out-of-range confidence scores', async () => {
      const mockAnalyze = vi.fn().mockResolvedValue([{
        eventType: 'MOTION',
        confidence: 1.5, // > 1.0
        timestamp: new Date()
      }]);
      vi.spyOn(AIProviderFactory, 'getVisionProvider').mockReturnValue({
        getCapabilities: () => ({ supportsUrlInput: true, supportsBytesInput: true, supportsVideo: true, maxFrames: 15 }),
        analyze: mockAnalyze
      });

      const event = { id: randomUUID(), data: { jobId: randomUUID(), tenantId: tenantA.id, actorType: 'SYSTEM', payload: { recordingId: recordingA.id } } };

      await expect(cctvVisionWorker.fn({ event, step: mockStep } as any))
        .rejects.toThrow('MALFORMED_VISION_OUTPUT');
    });
  });

  describe('6. Edge Cases & Timeout', () => {
    it('aborts safely if camera is soft-deleted', async () => {
      await withTenant(tenantA.id).camera.update({
        where: { id: cameraA.id },
        data: { deletedAt: new Date() } // Soft-deleted
      });

      const event = { id: randomUUID(), data: { jobId: randomUUID(), tenantId: tenantA.id, actorType: 'SYSTEM', payload: { recordingId: recordingA.id } } };
      
      const result = await cctvVisionWorker.fn({ event, step: mockStep } as any);
      expect(result.success).toBe(false);
      // Depending on Prisma setup, it might return RECORDING_NOT_FOUND if the include filtered it, 
      // or CAMERA_INACTIVE if handled explicitly. Either is safe.
      expect(['RECORDING_NOT_FOUND', 'CAMERA_INACTIVE']).toContain(result.reason);
    });

    it('aborts safely if recording is deleted', async () => {
      await withTenant(tenantA.id).recording.delete({ where: { id: recordingA.id } });

      const event = { id: randomUUID(), data: { jobId: randomUUID(), tenantId: tenantA.id, actorType: 'SYSTEM', payload: { recordingId: recordingA.id } } };
      
      const result = await cctvVisionWorker.fn({ event, step: mockStep } as any);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('RECORDING_NOT_FOUND');
    });

    it('rejects provider timeout via AbortError', async () => {
      vi.spyOn(AIProviderFactory, 'getVisionProvider').mockReturnValue({
        getCapabilities: () => ({ supportsUrlInput: true, supportsBytesInput: true, supportsVideo: true, maxFrames: 15 }),
        analyze: async () => {
          throw new Error('Provider timeout: Gemini API took longer than 15s');
        }
      });

      const event = { id: randomUUID(), data: { jobId: randomUUID(), tenantId: tenantA.id, actorType: 'SYSTEM', payload: { recordingId: recordingA.id } } };

      await expect(cctvVisionWorker.fn({ event, step: mockStep } as any))
        .rejects.toThrow('Provider timeout');
    });
  });

  describe('7. Negative Boundary: Incident/Alert', () => {
    it('does not implicitly create Incident or Alert records', async () => {
      const mockAnalyze = vi.fn().mockResolvedValue([{
        eventType: 'MOTION',
        confidence: 0.95,
        timestamp: new Date()
      }]);
      vi.spyOn(AIProviderFactory, 'getVisionProvider').mockReturnValue({
        getCapabilities: () => ({ supportsUrlInput: true, supportsBytesInput: true, supportsVideo: true, maxFrames: 15 }),
        analyze: mockAnalyze
      });

      const event = { id: randomUUID(), data: { jobId: randomUUID(), tenantId: tenantA.id, actorType: 'SYSTEM', payload: { recordingId: recordingA.id } } };

      await cctvVisionWorker.fn({ event, step: mockStep } as any);

      const incidents = await prisma.incident.findMany({ where: { tenantId: tenantA.id } });
      const alerts = await prisma.notification.findMany({ where: { tenantId: tenantA.id } });

      expect(incidents).toHaveLength(0);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('8. E2E Outbox Routing Relay', () => {
    it('outbox worker correctly relays cctv.recording.completed to Inngest', async () => {
      const { outboxWorkerHandler } = await import('@/lib/queue/functions/outbox.worker');
      const { inngest } = await import('@/lib/queue/inngest.client');
      
      const inngestSendSpy = vi.spyOn(inngest, 'send').mockResolvedValue(undefined as any);
      
      const eventId = randomUUID();
      const tenantId = tenantA.id;

      const event = {
        data: {
          jobId: eventId,
          tenantId,
          actorType: 'SYSTEM',
          correlationId: eventId,
          jobType: 'cctv.recording.completed',
          payload: { recordingId: 'rec-123' },
          schemaVersion: '1.0'
        }
      };

      await outboxWorkerHandler({ event, step: mockStep } as any);

      // Verify the EXACT event contract
      expect(inngestSendSpy).toHaveBeenCalledWith({
        name: 'cctv.recording.completed',
        data: expect.objectContaining({
          jobId: eventId,
          tenantId: tenantId,
          jobType: 'cctv.recording.completed',
          payload: { recordingId: 'rec-123' }
        })
      });
    });

    it('outbox worker falls back to EventBus for unrelated internal events', async () => {
      const { outboxWorkerHandler } = await import('@/lib/queue/functions/outbox.worker');
      const { inngest } = await import('@/lib/queue/inngest.client');
      const { EventBus } = await import('@/modules/core/events/event-bus');
      
      const inngestSendSpy = vi.spyOn(inngest, 'send').mockResolvedValue(undefined as any);
      const eventBusSpy = vi.spyOn(EventBus, 'emit').mockResolvedValue(undefined as any);

      const event = {
        data: {
          jobId: randomUUID(),
          tenantId: tenantA.id,
          actorType: 'SYSTEM',
          correlationId: randomUUID(),
          jobType: 'internal.legacy.something',
          payload: { foo: 'bar' },
          schemaVersion: '1.0'
        }
      };

      await outboxWorkerHandler({ event, step: mockStep } as any);

      expect(inngestSendSpy).not.toHaveBeenCalled();
      expect(eventBusSpy).toHaveBeenCalledWith('internal.legacy.something', expect.objectContaining({ tenantId: tenantA.id, foo: 'bar' }));
    });
  });
});
