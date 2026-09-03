import { SystemOperation } from '@db/utils/prisma-system';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateStreamToken } from '@/modules/cctv/stream.service';
import { POST as authWebhook } from '@/app/api/webhooks/mediamtx/auth/route';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { ENV } from '@/lib/config/env';
import * as auth from '@/lib/auth';
import globalPrisma from '@db/utils/prisma';
import crypto from 'crypto';

// Mocks
vi.mock('@/lib/auth');
vi.mock('@db/utils/prisma', () => ({
  default: {
    $transaction: vi.fn((cb) => cb({
      camera: {
        findFirst: vi.fn(),
      },
      auditLog: { create: vi.fn() }
    }))
  }
}));
vi.mock('@db/utils/prisma-tenant', () => ({
  withTenantTransaction: vi.fn((tx) => tx),
}));
vi.mock('@/lib/encryption', () => ({
  decrypt: vi.fn(() => 'decrypted-pass'),
  encrypt: vi.fn(() => 'encrypted-pass')
}));

vi.mock('@/lib/security/ssrf', () => ({
  validateAndResolveHostname: vi.fn().mockImplementation(async (ip) => ip)
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Phase C10.2.1 Streaming Security Integration', () => {
  const mockTenantId = 'tenant_123';
  const mockUserId = 'user_123';
  const mockCameraId = 'cam_123';
  const mockInternalSecret = 'super_secret';
  const mockJwtSecret = 'jwt_secret';
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(auth.requireAuth).mockResolvedValue({ id: mockUserId } as any);
    vi.mocked(auth.requireTenant).mockResolvedValue(mockTenantId);
    vi.mocked(auth.requirePermission).mockResolvedValue(undefined as any);

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [] })
    });
  });

  const setupPrismaMock = (cameraData: any) => {
    vi.mocked(globalPrisma.$transaction).mockImplementationOnce(async (cb: any) => {
      const mockTx = {
        camera: {
          findFirst: vi.fn().mockResolvedValue(cameraData)
        },
        auditLog: { create: vi.fn() }
      };
      return cb(mockTx);
    });
  };

  const createWebhookReq = (secret: string | null, payload: any, token: string | null) => {
    let url = 'http://localhost/webhook';
    if (secret) url += `?secret=${secret}`;
    
    // Add token to the MediaMTX payload query string as MediaMTX does
    if (token) {
      payload.query = `token=${token}`;
    }
    
    return new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  };

  it('1. Cross-Tenant Stream Access', async () => {
    // Camera not found (foreign tenant)
    setupPrismaMock(null);
    await expect(generateStreamToken('foreign_cam')).rejects.toThrow('Camera not found');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('2. JWT Signature Tampering', async () => {
    const token = jwt.sign({ action: 'read', path: 'p' }, 'wrong_secret', { algorithm: 'HS256' });
    const req = createWebhookReq(mockInternalSecret, { action: 'read', path: 'p' }, token);
    const res = await authWebhook(req);
    expect(res.status).toBe(401);
  });

  it('3. JWT Algorithm Confusion', async () => {
    // Generate a token with alg: none manually
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ action: 'read', path: 'p' })).toString('base64url');
    const token = `${header}.${payload}.`;
    
    const req = createWebhookReq(mockInternalSecret, { action: 'read', path: 'p' }, token);
    const res = await authWebhook(req);
    expect(res.status).toBe(401);
  });

  it('4. Expired JWT', async () => {
    const token = jwt.sign({ action: 'read', path: 'p' }, mockJwtSecret, { algorithm: 'HS256', expiresIn: '-1s' });
    const req = createWebhookReq(mockInternalSecret, { action: 'read', path: 'p' }, token);
    const res = await authWebhook(req);
    expect(res.status).toBe(401);
  });

  it('5. Action Escalation', async () => {
    const token = jwt.sign({ action: 'read', path: 'p' }, mockJwtSecret, { algorithm: 'HS256' });
    const req = createWebhookReq(mockInternalSecret, { action: 'publish', path: 'p' }, token);
    const res = await authWebhook(req);
    expect(res.status).toBe(401);
  });

  it('6. Path Forgery', async () => {
    const token = jwt.sign({ action: 'read', path: 'pathA' }, mockJwtSecret, { algorithm: 'HS256' });
    const req = createWebhookReq(mockInternalSecret, { action: 'read', path: 'pathB' }, token);
    const res = await authWebhook(req);
    expect(res.status).toBe(401);
  });

  it('7. Webhook Secret Bypass', async () => {
    const token = jwt.sign({ action: 'read', path: 'p' }, mockJwtSecret, { algorithm: 'HS256' });
    
    // Missing
    let req = createWebhookReq(null, { action: 'read', path: 'p' }, token);
    expect((await authWebhook(req)).status).toBe(401);

    // Empty
    req = createWebhookReq('', { action: 'read', path: 'p' }, token);
    expect((await authWebhook(req)).status).toBe(401);

    // Incorrect
    req = createWebhookReq('wrong', { action: 'read', path: 'p' }, token);
    expect((await authWebhook(req)).status).toBe(401);

    // Different length
    req = createWebhookReq('super_secret_extra', { action: 'read', path: 'p' }, token);
    expect((await authWebhook(req)).status).toBe(401);
  });

  it('8. Credential Leakage', async () => {
    setupPrismaMock({
      id: mockCameraId,
      ipAddress: '192.168.1.100',
      protocol: 'RTSP',
      updatedAt: new Date(),
      credential: { id: 'cred1', updatedAt: new Date(), encryptedUsername: 'u', encryptedPassword: 'p' }
    });
    
    const result = await generateStreamToken(mockCameraId);
    expect(result.streamUrl).toBeDefined();
    expect(result.streamUrl).not.toContain('decrypted-pass');
    expect(Object.keys(result)).toEqual(['streamUrl']);
  });

  it('9. MediaMTX Unavailable', async () => {
    setupPrismaMock({
      id: mockCameraId,
      ipAddress: '192.168.1.100',
      protocol: 'RTSP',
      updatedAt: new Date(),
      credential: { id: 'cred1', updatedAt: new Date(), encryptedUsername: 'u', encryptedPassword: 'p' }
    });
    mockFetch.mockRejectedValue(new Error('Connection refused'));
    
    await expect(generateStreamToken(mockCameraId)).rejects.toThrow('Internal stream provisioning error');
  });

  it('10. Path Already Exists Race', async () => {
    setupPrismaMock({
      id: mockCameraId,
      ipAddress: '192.168.1.100',
      protocol: 'RTSP',
      updatedAt: new Date(),
      credential: { id: 'cred1', updatedAt: new Date(), encryptedUsername: 'u', encryptedPassword: 'p' }
    });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'path already exists' }) }); // Provision fails with 400
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }); // Cleanup mock
    
    const result = await generateStreamToken(mockCameraId);
    expect(result.streamUrl).toBeDefined(); // Suppressed successfully
  });

  it('10b. Invalid Source 400 (Fails Closed)', async () => {
    setupPrismaMock({
      id: mockCameraId,
      ipAddress: '192.168.1.100',
      protocol: 'RTSP',
      updatedAt: new Date(),
      credential: { id: 'cred1', updatedAt: new Date(), encryptedUsername: 'u', encryptedPassword: 'p' }
    });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'invalid source' }) }); 
    
    await expect(generateStreamToken(mockCameraId)).rejects.toThrow('MediaMTX Config Error: invalid source');
  });

  it('11. Credential Rotation - Active Viewer', async () => {
    setupPrismaMock({
      id: mockCameraId,
      ipAddress: '192.168.1.100',
      protocol: 'RTSP',
      updatedAt: new Date(),
      credential: { id: 'cred1', updatedAt: new Date(), encryptedUsername: 'u', encryptedPassword: 'p' }
    });

    // Mock config paths returning an old path
    const oldPathName = `c_${mockTenantId}_${mockCameraId}_old`;
    mockFetch.mockImplementation(async (url) => {
      if (url.toString().includes('/config/paths/list')) {
        return { ok: true, json: async () => ({ items: [{ name: oldPathName }] }) };
      }
      if (url.toString().includes('/paths/list')) {
        return { ok: true, json: async () => ({ items: [{ name: oldPathName, readers: [{ id: 1 }], ready: true }] }) };
      }
      return { ok: true, json: async () => ({ items: [] }) };
    });

    await generateStreamToken(mockCameraId);
    await new Promise(r => setTimeout(r, 10)); // wait for background cleanup
    
    // Check that delete was NOT called because readers > 0
    const deleteCalls = mockFetch.mock.calls.filter(c => c[1]?.method === 'DELETE');
    expect(deleteCalls.length).toBe(0);
  });

  it('12. Credential Rotation - Inactive Viewer', async () => {
    setupPrismaMock({
      id: mockCameraId,
      ipAddress: '192.168.1.100',
      protocol: 'RTSP',
      updatedAt: new Date(),
      credential: { id: 'cred1', updatedAt: new Date(), encryptedUsername: 'u', encryptedPassword: 'p' }
    });

    const oldPathName = `c_${mockTenantId}_${mockCameraId}_old`;
    mockFetch.mockImplementation(async (url) => {
      if (url.toString().includes('/config/paths/list')) {
        return { ok: true, json: async () => ({ items: [{ name: oldPathName }] }) };
      }
      if (url.toString().includes('/paths/list')) {
        return { ok: true, json: async () => ({ items: [{ name: oldPathName, readers: [], ready: false }] }) };
      }
      return { ok: true, json: async () => ({ items: [] }) };
    });

    await generateStreamToken(mockCameraId);
    await new Promise(r => setTimeout(r, 10)); // wait for background cleanup
    
    // Check that delete WAS called because readers == 0 and ready == false
    const deleteCalls = mockFetch.mock.calls.filter(c => c[1]?.method === 'DELETE');
    expect(deleteCalls.length).toBe(1);
    expect(deleteCalls[0][0]).toContain(oldPathName);
  });

  it('13. Current Path Protection', async () => {
    setupPrismaMock({
      id: mockCameraId,
      ipAddress: '192.168.1.100',
      protocol: 'RTSP',
      updatedAt: new Date(),
      credential: { id: 'cred1', updatedAt: new Date(), encryptedUsername: 'u', encryptedPassword: 'p' }
    });

    // Derive what the current path will be
    const configFingerprint = `192.168.1.100|RTSP|cred1|${new Date().getTime()}`;
    // We won't strictly compute the hmac here, we'll just mock the config returning some path,
    // and verify delete is not called on the provisioned path.
    let provisionedPath = '';
    mockFetch.mockImplementation(async (url) => {
      if (url.toString().includes('/config/paths/add/')) {
        provisionedPath = url.toString().split('/').pop()!;
        return { ok: true };
      }
      if (url.toString().includes('/config/paths/list')) {
        return { ok: true, json: async () => ({ items: [{ name: provisionedPath }] }) };
      }
      if (url.toString().includes('/paths/list')) {
        return { ok: true, json: async () => ({ items: [{ name: provisionedPath, readers: [], ready: false }] }) };
      }
      return { ok: true, json: async () => ({ items: [] }) };
    });

    await generateStreamToken(mockCameraId);
    await new Promise(r => setTimeout(r, 10)); // wait for background cleanup
    
    // Delete should not be called on the provisioned path even if inactive
    const deleteCalls = mockFetch.mock.calls.filter(c => c[1]?.method === 'DELETE');
    expect(deleteCalls.length).toBe(0);
  });

  it('14. Cleanup Namespace Isolation', async () => {
    setupPrismaMock({
      id: mockCameraId,
      ipAddress: '192.168.1.100',
      protocol: 'RTSP',
      updatedAt: new Date(),
      credential: { id: 'cred1', updatedAt: new Date(), encryptedUsername: 'u', encryptedPassword: 'p' }
    });

    const foreignPath = `c_otherTenant_otherCam_hash`;
    mockFetch.mockImplementation(async (url) => {
      if (url.toString().includes('/config/paths/list')) {
        return { ok: true, json: async () => ({ items: [{ name: foreignPath }] }) }; // Mediamtx accidentally returned it
      }
      if (url.toString().includes('/paths/list')) {
        return { ok: true, json: async () => ({ items: [{ name: foreignPath, readers: [], ready: false }] }) };
      }
      return { ok: true, json: async () => ({ items: [] }) };
    });

    await generateStreamToken(mockCameraId);
    await new Promise(r => setTimeout(r, 10)); // wait for background cleanup
    
    // Delete should NOT be called because it doesn't match the prefix c_${tenantId}_${cameraId}_
    const deleteCalls = mockFetch.mock.calls.filter(c => c[1]?.method === 'DELETE');
    expect(deleteCalls.length).toBe(0);
  });
});
