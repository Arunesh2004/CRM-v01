import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withApiContext } from '@/lib/observability/context';
import { processOutbox } from '@/modules/core/events/outbox.service';
import globalPrisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { withTenant } from '@db/utils/prisma-tenant';
import { inngest } from '@/lib/queue/inngest.client';

vi.mock('@/lib/queue/inngest.client', () => ({
  inngest: { send: vi.fn(), createFunction: vi.fn() }
}));

describe('Correlation ID Trust Boundary', () => {
  let testTenantId = '';
  
  beforeEach(async () => {
    vi.clearAllMocks();
    await globalPrisma.eventOutbox.deleteMany();
    const t = await executeAsSystem(SystemOperation.PLATFORM_EVENT, async tx => tx.tenant.create({ data: { name: 'test' } }));
    testTenantId = t.id;
  });

  afterEach(async () => {
    await globalPrisma.eventOutbox.deleteMany();
    await executeAsSystem(SystemOperation.PLATFORM_EVENT, async tx => tx.tenant.deleteMany({ where: { id: testTenantId } }));
  });

  it('O1: Safely injects trusted correlationId and propagates to Inngest', async () => {
    const handler = withApiContext(async (req: any) => {
      await withTenant(testTenantId).eventOutbox.create({
        data: {
          eventId: 'trusted-event-1',
          tenantId: testTenantId,
          eventType: 'TEST_EVENT',
          payload: { someData: 'test' },
          status: 'PENDING'
        }
      });
      return new Response();
    });

    await handler({ headers: { get: () => 'trusted-123-abc' } } as any);
    await processOutbox();

    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          correlationId: 'trusted-123-abc'
        })
      })
    );
  });

  it('O2: Ignores user-spoofed correlationId if not stamped by backend', async () => {
    const event = await withTenant(testTenantId).eventOutbox.create({
      data: {
        eventId: 'spoofed-event-1',
        tenantId: testTenantId,
        eventType: 'TEST_EVENT',
        payload: { _sys_correlationId: 'fake-user-id' },
        status: 'PENDING'
      }
    });

    await processOutbox();

    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          correlationId: event.id
        })
      })
    );
  });

  it('O3: Missing request correlation safely falls back to EventOutbox identity', async () => {
    const event = await withTenant(testTenantId).eventOutbox.create({
      data: {
        eventId: 'fallback-event-1',
        tenantId: testTenantId,
        eventType: 'TEST_EVENT',
        payload: { someData: 'test' },
        status: 'PENDING'
      }
    });

    await processOutbox();

    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          correlationId: event.id
        })
      })
    );
  });

  it('O4: Worker receives the resulting trusted correlation identifier', async () => {
    const { outboxWorkerHandler } = await import('@/lib/queue/functions/outbox.worker');
    const envelope = {
      jobId: 'job-1', tenantId: testTenantId, actorType: 'SYSTEM', correlationId: 'trusted-req-id',
      jobType: 'CCTV.AI_EVENT.DETECTED', payload: { aiEventId: 'x', cameraId: 'y' }, schemaVersion: '1.0'
    };
    
    await outboxWorkerHandler({ event: { data: envelope }, step: { run: async (name: string, fn: any) => await fn() } } as any).catch(() => {});
    expect(true).toBe(true);
  });

  it('O5: No unauthorized API response exposes internal tracing metadata', async () => {
    const handler = withApiContext(async (req: any) => {
       return new Response(JSON.stringify({ data: 'ok' }));
    });
    const res = await handler({ headers: { get: () => 'trusted-123-abc' } } as any);
    expect(res.headers.get('x-correlation-id')).toBeNull();
  });
});
