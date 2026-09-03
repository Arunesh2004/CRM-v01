import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import prisma from '../../../database/utils/prisma';
import { requireAuth, requireTenant, requirePermission } from '../../lib/auth';
import { createCamera, setCameraCredentials } from '../../modules/cctv/camera.service';
import { generateStreamToken, deriveOpaquePath } from '../../modules/cctv/stream.service';
import { POST as webhookAuth } from '../../app/api/webhooks/mediamtx/auth/route';
import { NextRequest } from 'next/server';
import { ENV } from '../../lib/config/env';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';

vi.mock('../../lib/auth', () => ({
  requireAuth: vi.fn(),
  requireTenant: vi.fn(),
  requirePermission: vi.fn()
}));

// Mock SSRF validation to bypass DNS lookup in tests
vi.mock('../../lib/security/ssrf', () => ({
  validateAndResolveHostname: vi.fn((hostname) => Promise.resolve(hostname))
}));

describe('CCTV Concurrency & Rotation Tests (Phase C10.5)', () => {
  const tenantId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const locationId = crypto.randomUUID();

  beforeEach(async () => {
    vi.resetAllMocks();
    
    // Seed tenant and user required by DB foreign keys
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx: any) => {
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantId}', 'Test Tenant', now(), now()) ON CONFLICT DO NOTHING`);
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") VALUES ('${userId}', '${tenantId}', 'test@test.com', 'ACTIVE', now(), now()) ON CONFLICT DO NOTHING`);
      
      const custId = crypto.randomUUID();
      await tx.$executeRawUnsafe(`INSERT INTO "Customer" (id, "tenantId", name, "normalizedName", "createdAt", "updatedAt") VALUES ('${custId}', '${tenantId}', 'Test Cust', 'testcust', now(), now()) ON CONFLICT DO NOTHING`);
      await tx.$executeRawUnsafe(`INSERT INTO "Location" (id, "customerId", "tenantId", name, "createdAt", "updatedAt") VALUES ('${locationId}', '${custId}', '${tenantId}', 'Test Loc', now(), now()) ON CONFLICT DO NOTHING`);
    });
  });

  it('Real Active-Session Rotation Test', async () => {
    // 1. Setup mock context
    vi.mocked(requireAuth).mockResolvedValue({ id: userId, tenantId } as any);
    vi.mocked(requireTenant).mockResolvedValue(tenantId);
    vi.mocked(requirePermission).mockResolvedValue(true as any);

    // Mock fetch for MediaMTX interactions
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({})
    }) as any;

    // Create a camera with initial credentials
    const camera = await createCamera({
      name: 'Rotation Test Cam',
      locationId: locationId,
      ipAddress: '192.168.1.100',
      protocol: 'RTSP',
      authMode: 'PASSWORD',
      rtspUsername: 'admin1',
      rtspPassword: 'password1'
    });

    const initialStreamVersion = camera.streamVersion ?? 0;
    expect(initialStreamVersion).toBe(0);

    // 2. Establish "actual" WebRTC viewer by generating stream token
    const streamData = await generateStreamToken(camera.id);
    expect(streamData.streamUrl).toBeDefined();

    // Extract the generated JWT token
    const tokenUrl = new URL(streamData.streamUrl);
    const initialToken = tokenUrl.searchParams.get('token');
    expect(initialToken).toBeDefined();

    const expectedInitialPath = deriveOpaquePath(tenantId, camera.id, initialStreamVersion);

    // Verify webhook accepts the initial token
    const req1 = new NextRequest(`http://localhost/api?secret=${ENV.mediamtxWebhookSecret}`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'read',
        protocol: 'webrtc',
        path: expectedInitialPath,
        ip: '127.0.0.1',
        query: `token=${initialToken}`
      })
    });
    
    const res1 = await webhookAuth(req1);
    expect(res1.status).toBe(200);

    // 3. Rotate credentials (simulating a concurrent mutation)
    const fetchSpy = vi.spyOn(global, 'fetch');
    const rotateResult = await setCameraCredentials(camera.id, 'admin2', 'new_password');
    expect(rotateResult.success).toBe(true);

    // 4. Verify old active session disconnects via DELETE MediaMTX path
    // The attemptImmediateInvalidation should have been called for expectedInitialPath
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining(`/v3/config/paths/delete/${expectedInitialPath}`),
      expect.objectContaining({ method: 'DELETE' })
    );

    // Verify database version was incremented
    const updatedCamera = await prisma.camera.findUnique({ where: { id: camera.id } });
    expect(updatedCamera!.streamVersion).toBe(1);

    // Verify durable invalidation outbox was created
    const outbox = await prisma.cameraStreamInvalidation.findFirst({
      where: { cameraId: camera.id, streamVersion: initialStreamVersion }
    });
    expect(outbox).not.toBeNull();
    expect(outbox!.opaquePath).toBe(expectedInitialPath);

    // 5. Attempt to reconnect using old JWT (Webhook rejection)
    const req2 = new NextRequest(`http://localhost/api?secret=${ENV.mediamtxWebhookSecret}`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'read',
        protocol: 'webrtc',
        path: expectedInitialPath,
        ip: '127.0.0.1',
        query: `token=${initialToken}`
      })
    });

    const res2 = await webhookAuth(req2);
    // Should be rejected because streamVersion in DB is now 1, but token has 0
    expect(res2.status).toBe(401);

    // 6. Verify new credentials/version can establish a new stream
    const newStreamData = await generateStreamToken(camera.id);
    const newTokenUrl = new URL(newStreamData.streamUrl);
    const newToken = newTokenUrl.searchParams.get('token');
    const newExpectedPath = deriveOpaquePath(tenantId, camera.id, 1);

    const req3 = new NextRequest(`http://localhost/api?secret=${ENV.mediamtxWebhookSecret}`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'read',
        protocol: 'webrtc',
        path: newExpectedPath,
        ip: '127.0.0.1',
        query: `token=${newToken}`
      })
    });
    
    const res3 = await webhookAuth(req3);
    // Should be accepted because version matches
    expect(res3.status).toBe(200);
  });

  it('Test B2: Active Viewer During MediaMTX Outage', async () => {
    // 1. Setup mock context
    vi.mocked(requireAuth).mockResolvedValue({ id: userId, tenantId } as any);
    vi.mocked(requireTenant).mockResolvedValue(tenantId);
    vi.mocked(requirePermission).mockResolvedValue(true as any);

    // Create a real camera stream
    const camera = await createCamera({
      name: 'Deletion Outage Cam',
      locationId: locationId,
      ipAddress: '192.168.1.101',
      protocol: 'RTSP',
      authMode: 'NONE'
    });

    const initialStreamVersion = camera.streamVersion ?? 0;
    const expectedInitialPath = deriveOpaquePath(tenantId, camera.id, initialStreamVersion);

    // 2. Establish an actual WebRTC viewer (mock MediaMTX success)
    let mediamtxAvailable = true;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
      if (!mediamtxAvailable) {
        throw new Error('fetch failed');
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    // Generate token simulates an active viewer establishment
    const streamData = await generateStreamToken(camera.id);
    expect(streamData.streamUrl).toBeDefined();

    // 3. Simulate MediaMTX management API outage
    mediamtxAvailable = false;

    // 4. Delete the camera
    const { deleteCamera } = await import('../../modules/cctv/camera.service');
    const deleteResult = await deleteCamera(camera.id);
    expect(deleteResult.success).toBe(true);

    // 5. Verify camera is deleted, outbox survives, new stream connections rejected
    const deletedCamera = await prisma.camera.findUnique({ where: { id: camera.id } });
    expect(deletedCamera).toBeNull();

    const outbox = await prisma.cameraStreamInvalidation.findFirst({
      where: { cameraId: camera.id, streamVersion: initialStreamVersion }
    });
    expect(outbox).not.toBeNull();
    expect(outbox!.status).toBe('PENDING');

    // New stream connections rejected (webhook returns 500 when DB finds null)
    const req = new NextRequest(`http://localhost/api?secret=${ENV.mediamtxWebhookSecret}`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'read',
        protocol: 'webrtc',
        path: expectedInitialPath,
        ip: '127.0.0.1',
        query: `token=dummy`
      })
    });
    
    // In our webhook, failing to find the camera falls back to returning 401 or throws 500 depending on exact findUnique return
    // Our implementation does: if (!camera) return 401 Unauthorized
    const res = await webhookAuth(req);
    expect(res.status).toBe(401);

    // 6. Restore MediaMTX
    mediamtxAvailable = true;

    // 7. Run retry worker
    const { GET: cronWorker } = await import('../../app/api/cron/process-cctv-invalidation/route');
    const cronReq = new NextRequest(`http://localhost/api/cron`, {
      headers: new Headers({ 'authorization': `Bearer ${process.env.CRON_SECRET}` })
    });

    const cronRes = await cronWorker(cronReq);
    expect(cronRes.status).toBe(200);
    const cronBody = await cronRes.json();
    expect(cronBody.succeeded).toBeGreaterThan(0);

    // 8. Verify stale path is deleted (worker calls fetch DELETE)
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining(`/v3/config/paths/delete/${expectedInitialPath}`),
      expect.objectContaining({ method: 'DELETE' })
    );

    // 10. Verify job becomes COMPLETED
    const updatedOutbox = await prisma.cameraStreamInvalidation.findUnique({
      where: { id: outbox!.id }
    });
    expect(updatedOutbox!.status).toBe('COMPLETED');
  });
});
