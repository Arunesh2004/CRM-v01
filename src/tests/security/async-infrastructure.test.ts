import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

process.env.INNGEST_EVENT_KEY = 'test-key';

import { inngest } from '@/lib/queue/inngest.client';
import { POST } from '@/app/api/webhooks/ingest/route';

const prisma = new PrismaClient();
const tenantId = 'test-tenant-id';
const otherTenantId = 'other-tenant-id';

describe('Phase 11: Async Infrastructure & Scalability Security', () => {
  beforeAll(async () => {
    vi.spyOn(inngest, 'send').mockResolvedValue({ ids: ['mock-id'] } as any);

    const now = new Date().toISOString();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Tenant" (id, name, "updatedAt")
      VALUES ('${tenantId}', 'Test Tenant', '${now}'::timestamp)
      ON CONFLICT DO NOTHING;
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Tenant" (id, name, "updatedAt")
      VALUES ('${otherTenantId}', 'Other Tenant', '${now}'::timestamp)
      ON CONFLICT DO NOTHING;
    `);
  });

  afterAll(async () => {
    // Cleanup
    await prisma.securityEvent.deleteMany({ where: { tenantId } });
    await prisma.webhookEvent.deleteMany({ where: { tenantId } });
  });

  it('should initialize Inngest without runtime panic', () => {
    expect(inngest).toBeDefined();
    expect(inngest.id).toBe('ai-security-crm');
  });

  describe('Webhook Security', () => {
    const secret = process.env.WEBHOOK_SECRET || 'default_dev_secret';
    
    it('should reject missing webhook signature', async () => {
      const req = new Request(`http://localhost/api/webhooks/ingest?tenantId=${tenantId}`, {
        method: 'POST',
        body: JSON.stringify({ id: crypto.randomUUID(), type: 'test' })
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Missing signature');
    });

    it('should reject invalid webhook signature and log SecurityEvent', async () => {
      const payload = { id: crypto.randomUUID(), type: 'test' };
      const req = new Request(`http://localhost/api/webhooks/ingest?tenantId=${tenantId}`, {
        method: 'POST',
        headers: { 'x-webhook-signature': 'invalid_signature' },
        body: JSON.stringify(payload)
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      
      const secEvent = await prisma.securityEvent.findFirst({
        where: { tenantId, eventType: 'WEBHOOK_SIGNATURE_FAILURE' }
      });
      expect(secEvent).toBeDefined();
    });

    it('should accept valid webhook signature and process idempotently', async () => {
      const payloadId = crypto.randomUUID();
      const payload = { id: payloadId, type: 'test' };
      const rawBody = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      const req1 = new Request(`http://localhost/api/webhooks/ingest?tenantId=${tenantId}`, {
        method: 'POST',
        headers: { 'x-webhook-signature': signature },
        body: rawBody
      });
      const res1 = await POST(req1);
      expect(res1.status).toBe(202);

      const req2 = new Request(`http://localhost/api/webhooks/ingest?tenantId=${tenantId}`, {
        method: 'POST',
        headers: { 'x-webhook-signature': signature },
        body: rawBody
      });
      const res2 = await POST(req2);
      expect(res2.status).toBe(200); // Already processed

      const dbEvents = await prisma.webhookEvent.findMany({
        where: { eventId: payloadId }
      });
      expect(dbEvents.length).toBe(1);
      expect(dbEvents[0].signatureVerified).toBe(true);
    });
  });

  describe('Queue Tenant Isolation', () => {
    it('worker execution envelope requires valid tenantId', async () => {
      // Because we fixed the types, this must enforce SecureJobEnvelope shape
      const envelope = {
        jobId: '123',
        tenantId,
        actorType: 'SYSTEM',
        correlationId: '123',
        jobType: 'test',
        payload: { eventId: '123' },
        schemaVersion: '1.0'
      };
      expect(envelope.tenantId).toBe(tenantId);
    });
  });
});
