import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { POST as recordWebhook } from '@/app/api/webhooks/mediamtx/record/route';
import { NextRequest } from 'next/server';
import { deriveOpaquePath } from '@/modules/cctv/opaque-path.helper';
import { ENV } from '@/lib/config/env';
import path from 'path';
import fs from 'fs/promises';

describe('R07: Record Webhook Security & Nonce Replay', () => {
  let tenantId: string;
  let cameraId: string;
  let healthyNodeId: string;
  let decommissionedNodeId: string;
  let opaquePath: string;
  const secret = 'test-secret';
  let webhookKeyHealthy: string;
  let webhookKeyDecomm: string;
  let localFilePath: string;

  beforeAll(async () => {
    tenantId = crypto.randomUUID();
    cameraId = crypto.randomUUID();
    webhookKeyHealthy = `wk-h-${Date.now()}`;
    webhookKeyDecomm = `wk-d-${Date.now()}`;
    process.env['TEST_WEBHOOK_SECRET'] = secret;
    
    opaquePath = deriveOpaquePath(tenantId, cameraId, 1);
    
    // Create actual file to pass assertPathInRoot
    const rawTarget = path.join(ENV.cctvRecordingsRoot, opaquePath, 'test.mp4');
    await fs.mkdir(path.dirname(rawTarget), { recursive: true });
    await fs.writeFile(rawTarget, 'dummy');
    localFilePath = rawTarget;

    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.tenant.createMany({ data: [{ id: tenantId, name: 'Tenant', status: 'ACTIVE' }], skipDuplicates: true });
      
      const healthyId = crypto.randomUUID();
      healthyNodeId = healthyId;
      await tx.cCTVNode.createMany({ data: [{ id: healthyId, name: 'Healthy Node', status: 'HEALTHY', webhookKeyId: webhookKeyHealthy, webhookSecretRef: 'TEST_WEBHOOK_SECRET' }], skipDuplicates: true });
      
      const decommId = crypto.randomUUID();
      decommissionedNodeId = decommId;
      await tx.cCTVNode.createMany({ data: [{ id: decommId, name: 'Decomm Node', status: 'DECOMMISSIONED', webhookKeyId: webhookKeyDecomm, webhookSecretRef: 'TEST_WEBHOOK_SECRET' }], skipDuplicates: true });
    });
  });

  afterAll(async () => {
    try { await fs.unlink(localFilePath); } catch {}
    delete process.env['TEST_WEBHOOK_SECRET'];
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.idempotencyKey.deleteMany({ where: { tenantId: tenantId } });
      await tx.recordingIngestionJob.deleteMany({ where: { recordingNodeId: { in: [healthyNodeId, decommissionedNodeId] } } });
      await tx.cCTVNode.deleteMany({ where: { id: { in: [healthyNodeId, decommissionedNodeId] } } });
      await tx.tenant.deleteMany({ where: { id: tenantId } });
    });
  });

  const createWebhookReq = (keyId: string, timestamp: number, nonce: string, payload: Record<string, unknown>, hmacSecret?: string) => {
    const rawBody = JSON.stringify(payload);
    const useSecret = hmacSecret ?? secret;
    const expectedHmac = crypto.createHmac("sha256", useSecret)
      .update(`${timestamp}.${nonce}.${rawBody}`)
      .digest("hex");

    return new NextRequest('http://localhost/webhook', {
      method: 'POST',
      body: rawBody,
      headers: {
        'x-node-key-id': keyId,
        'x-timestamp': timestamp.toString(),
        'x-nonce': nonce,
        'x-hmac-signature': expectedHmac
      }
    });
  };

  const getPayload = () => ({
    path: opaquePath,
    file: localFilePath,
    recordingEventTimestamp: Date.now() - 1000
  });

  // ── Finding 1 Regression Tests ──────────────────────────────────────────────

  it('1. Valid authenticated webhook succeeds (RLS context fix)', async () => {
    const nonce = crypto.randomBytes(8).toString('hex');
    const req = createWebhookReq(webhookKeyHealthy, Date.now(), nonce, getPayload());
    const res = await recordWebhook(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('2. IdempotencyKey is persisted after valid webhook', async () => {
    const nonce = crypto.randomBytes(8).toString('hex');
    const req = createWebhookReq(webhookKeyHealthy, Date.now(), nonce, getPayload());
    const res = await recordWebhook(req);
    expect(res.status).toBe(200);

    // Verify the IdempotencyKey was actually persisted under the correct tenant
    const keys = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.idempotencyKey.findMany({ where: { tenantId, key: { contains: `mediamtx_`, endsWith: `_${nonce}` } }, select: { id: true } })
    );
    expect(keys.length).toBe(1);
  });

  it('3. Replay of same nonce/request is rejected (idempotent no-op — 200, not crash)', async () => {
    const nonce = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const payload = getPayload();

    // First request
    const req1 = createWebhookReq(webhookKeyHealthy, timestamp, nonce, payload);
    const res1 = await recordWebhook(req1);
    expect(res1.status).toBe(200);

    // Second request with same nonce — should be idempotent no-op (200), not crash
    const req2 = createWebhookReq(webhookKeyHealthy, timestamp, nonce, payload);
    const res2 = await recordWebhook(req2);
    expect(res2.status).toBe(200);

    // Verify IdempotencyKey exists only once (no duplicate)
    const keys = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.idempotencyKey.findMany({ where: { tenantId, key: { contains: `mediamtx_`, endsWith: `_${nonce}` } }, select: { id: true } })
    );
    expect(keys.length).toBe(1);
  });

  it('4. Different tenant cannot reuse another tenant idempotency nonce (tenant isolation)', async () => {
    const tenantBId = crypto.randomUUID();
    const cameraB = crypto.randomUUID();
    const opaqueB = deriveOpaquePath(tenantBId, cameraB, 1);
    const fileB = path.join(ENV.cctvRecordingsRoot, opaqueB, 'test-b.mp4');
    await fs.mkdir(path.dirname(fileB), { recursive: true });
    await fs.writeFile(fileB, 'dummy-b');

    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.tenant.createMany({ data: [{ id: tenantBId, name: 'Tenant B', status: 'ACTIVE' }], skipDuplicates: true });
    });

    const nonce = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();

    // Tenant A request
    const reqA = createWebhookReq(webhookKeyHealthy, timestamp, nonce, getPayload());
    const resA = await recordWebhook(reqA);
    expect(resA.status).toBe(200);

    // Tenant B uses a different opaque path → different derived tenantId → different idempotency key space
    const payloadB = { path: opaqueB, file: fileB, recordingEventTimestamp: Date.now() - 1000 };
    const reqB = createWebhookReq(webhookKeyHealthy, timestamp, nonce, payloadB);
    const resB = await recordWebhook(reqB);
    // Should also succeed independently — Tenant B has its own IdempotencyKey namespace
    expect(resB.status).toBe(200);

    // Cleanup
    try { await fs.unlink(fileB); } catch {}
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.idempotencyKey.deleteMany({ where: { tenantId: tenantBId } });
      await tx.tenant.deleteMany({ where: { id: tenantBId } });
    });
  });

  it('5. Invalid HMAC signature -> rejected', async () => {
    const nonce = crypto.randomBytes(8).toString('hex');
    const req = createWebhookReq(webhookKeyHealthy, Date.now(), nonce, getPayload(), 'wrong-secret');
    const res = await recordWebhook(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Invalid HMAC signature');
  });

  it('6. Stale timestamp -> rejected', async () => {
    const nonce = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now() - (6 * 60 * 1000); // 6 mins ago
    const payload = getPayload();
    const req = createWebhookReq(webhookKeyHealthy, timestamp, nonce, payload);
    const res = await recordWebhook(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Request timestamp out of window');
  });

  it('7. Missing/unknown node key -> rejected', async () => {
    const nonce = crypto.randomBytes(8).toString('hex');
    const req = createWebhookReq('unknown_key', Date.now(), nonce, getPayload());
    const res = await recordWebhook(req);
    expect(res.status).toBe(401);
  });

  it('8. Decommissioned node -> rejected', async () => {
    const nonce = crypto.randomBytes(8).toString('hex');
    const req = createWebhookReq(webhookKeyDecomm, Date.now(), nonce, getPayload());
    const res = await recordWebhook(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Node is decommissioned');
  });

  it('9. Modified body with same nonce -> rejected by HMAC (replay tamper)', async () => {
    const nonce = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const payload = getPayload();
    
    const rawBody = JSON.stringify(payload);
    const expectedHmac = crypto.createHmac("sha256", secret)
      .update(`${timestamp}.${nonce}.${rawBody}`)
      .digest("hex");

    const modifiedPayload = { ...payload, file: '/evil' };
    const req = new NextRequest('http://localhost/webhook', {
      method: 'POST',
      body: JSON.stringify(modifiedPayload),
      headers: {
        'x-node-key-id': webhookKeyHealthy,
        'x-timestamp': timestamp.toString(),
        'x-nonce': nonce,
        'x-hmac-signature': expectedHmac
      }
    });

    const res = await recordWebhook(req);
    expect(res.status).toBe(401); // HMAC failure
  });

  it('10. Tenant identity cannot be forged through payload opaque path (HMAC validates path)', async () => {
    // Construct a forged opaque path that encodes a different tenant
    // It won't be HMAC-valid, so parseOpaquePath will reject it
    const nonce = crypto.randomBytes(8).toString('hex');
    const forgedTenant = crypto.randomUUID();
    const forgedPath = `${forgedTenant}:${cameraId}:1`; // not HMAC-derived
    const payload = { path: forgedPath, file: localFilePath, recordingEventTimestamp: Date.now() - 1000 };
    const req = createWebhookReq(webhookKeyHealthy, Date.now(), nonce, payload);
    const res = await recordWebhook(req);
    // Should fail: either HMAC on path is invalid (parseOpaquePath throws) or 400/500
    expect(res.status).not.toBe(200);
  });
});
