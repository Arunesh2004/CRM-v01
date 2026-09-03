import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import prisma from '../../../database/utils/prisma';
import { withTenant } from '../../../database/utils/prisma-tenant';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { encrypt, decrypt } from '../../lib/encryption';
import { requireAuth, requireTenant, requirePermission } from '../../lib/auth';
import { createCamera, updateCamera, getCameraById, getCameras, setCameraCredentials } from '../../modules/cctv/camera.service';
import { CameraProtocol, CameraStatus } from '@prisma/client';

vi.mock('../../lib/auth', () => ({
  requireAuth: vi.fn(),
  requireTenant: vi.fn(),
  requirePermission: vi.fn()
}));

describe('CCTV Secret Management Tests (Phase C9.1)', () => {
  const tenantAId = crypto.randomUUID();
  const tenantBId = crypto.randomUUID();
  const userAId = crypto.randomUUID();
  const userBId = crypto.randomUUID();
  const locationAId = crypto.randomUUID();
  const locationBId = crypto.randomUUID();

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx: any) => {
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantAId}', 'Tenant A', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantBId}', 'Tenant B', now(), now())`);

      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") VALUES ('${userAId}', '${tenantAId}', 'usera@test.com', 'ACTIVE', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") VALUES ('${userBId}', '${tenantBId}', 'userb@test.com', 'ACTIVE', now(), now())`);

      // Mock Customer and Location
      const custA = crypto.randomUUID();
      const custB = crypto.randomUUID();
      await tx.$executeRawUnsafe(`INSERT INTO "Customer" (id, "tenantId", name, "normalizedName", "createdAt", "updatedAt") VALUES ('${custA}', '${tenantAId}', 'Cust A', 'custa', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Customer" (id, "tenantId", name, "normalizedName", "createdAt", "updatedAt") VALUES ('${custB}', '${tenantBId}', 'Cust B', 'custb', now(), now())`);

      await tx.$executeRawUnsafe(`INSERT INTO "Location" (id, "customerId", "tenantId", name, "createdAt", "updatedAt") VALUES ('${locationAId}', '${custA}', '${tenantAId}', 'Loc A', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "Location" (id, "customerId", "tenantId", name, "createdAt", "updatedAt") VALUES ('${locationBId}', '${custB}', '${tenantBId}', 'Loc B', now(), now())`);
    });
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('1. Encryption at Rest: Plaintext is never stored in DB', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: userAId, tenantId: tenantAId } as any);
    vi.mocked(requireTenant).mockResolvedValue(tenantAId);
    vi.mocked(requirePermission).mockResolvedValue(true as any);

    const camera = await createCamera({
      name: 'Test Cam 1',
      locationId: locationAId,
      ipAddress: '192.168.1.100',
      protocol: CameraProtocol.RTSP,
      authMode: 'PASSWORD',
      rtspUsername: 'admin_plaintext',
      rtspPassword: 'super_secret_password'
    });

    // Query database with tenant context to satisfy RLS
    const dbCreds = await withTenant(tenantAId).cameraCredential.findUnique({
      where: { cameraId: camera.id }
    });

    expect(dbCreds).not.toBeNull();
    expect(dbCreds?.encryptedUsername).not.toContain('admin_plaintext');
    expect(dbCreds?.encryptedPassword).not.toContain('super_secret_password');
    expect(dbCreds?.encryptedUsername).toMatch(/^([0-9a-f]{32}):([0-9a-f]{32}):([0-9a-f]+)$/); // iv:authTag:ciphertext
  });

  it('2. Randomized Encryption: Same plaintext yields different ciphertexts', () => {
    const p1 = encrypt('my-password');
    const p2 = encrypt('my-password');
    expect(p1).not.toBe(p2);
    expect(decrypt(p1)).toBe('my-password');
    expect(decrypt(p2)).toBe('my-password');
  });

  it('3. API Output Safety: Plaintext/ciphertext never leaks through service', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: userAId, tenantId: tenantAId } as any);
    vi.mocked(requireTenant).mockResolvedValue(tenantAId);
    vi.mocked(requirePermission).mockResolvedValue(true as any);

    const camera = await createCamera({
      name: 'Test Cam 2',
      locationId: locationAId,
      ipAddress: '192.168.1.101',
      protocol: CameraProtocol.RTSP,
      authMode: 'PASSWORD',
      rtspUsername: 'admin2',
      rtspPassword: 'pw2'
    });

    const retrieved = await getCameraById(camera.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.hasCredentials).toBe(true);
    
    // Explicitly verify sensitive fields are undefined in output DTO
    expect((retrieved as any).rtspPassword).toBeUndefined();
    expect((retrieved as any).encryptedPassword).toBeUndefined();
    expect((retrieved as any).credential).toBeUndefined();
  });

  it('4. Credential Update Safety: Atomic Upsert', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: userAId, tenantId: tenantAId } as any);
    vi.mocked(requireTenant).mockResolvedValue(tenantAId);
    vi.mocked(requirePermission).mockResolvedValue(true as any);

    const camera = await createCamera({
      name: 'Test Cam 3',
      locationId: locationAId,
      ipAddress: '192.168.1.102',
      protocol: CameraProtocol.RTSP,
      authMode: 'PASSWORD',
      rtspUsername: 'admin3',
      rtspPassword: 'pw3'
    });

    let dbCreds = await withTenant(tenantAId).cameraCredential.findUnique({ where: { cameraId: camera.id } });
    const originalEncPassword = dbCreds?.encryptedPassword;

    await setCameraCredentials(
      camera.id,
      'admin3_updated',
      'pw3_updated'
    );

    dbCreds = await withTenant(tenantAId).cameraCredential.findUnique({ where: { cameraId: camera.id } });
    expect(dbCreds?.encryptedPassword).not.toBe(originalEncPassword);

    const decrypted = decrypt(dbCreds!.encryptedPassword);
    expect(decrypted).toBe('pw3_updated');
  });

  it('5. Cross-Tenant Isolation: Tenant B cannot access Tenant A credentials', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: userAId, tenantId: tenantAId } as any);
    vi.mocked(requireTenant).mockResolvedValue(tenantAId);
    vi.mocked(requirePermission).mockResolvedValue(true as any);

    const camera = await createCamera({
      name: 'Tenant A Cam',
      locationId: locationAId,
      ipAddress: '1.1.1.1',
      protocol: CameraProtocol.RTSP,
      authMode: 'PASSWORD',
      rtspUsername: 'user',
      rtspPassword: 'pwd'
    });

    // Simulate Tenant B trying to fetch the camera
    vi.mocked(requireAuth).mockResolvedValue({ id: userBId, tenantId: tenantBId } as any);
    vi.mocked(requireTenant).mockResolvedValue(tenantBId);
    vi.mocked(requirePermission).mockResolvedValue(true as any);

    const retrieved = await getCameraById(camera.id);
    expect(retrieved).toBeNull(); // Prisma withTenant intercepts and blocks it safely
  });

  it('6. RBAC Enforcement: Unauthorized users are rejected', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: userAId, tenantId: tenantAId } as any);
    vi.mocked(requireTenant).mockResolvedValue(tenantAId);
    // Simulate user lacking CUSTOMER:UPDATE
    vi.mocked(requirePermission).mockRejectedValue(new Error('Permission denied'));

    await expect(createCamera({
      name: 'Unauthorized Cam',
      locationId: locationAId,
      ipAddress: '192.168.1.1',
      protocol: CameraProtocol.RTSP,
      authMode: 'PASSWORD',
      rtspUsername: 'u',
      rtspPassword: 'p'
    })).rejects.toThrow('Permission denied');
  });

  it('7. Tamper Detection: AES-GCM fails safely if ciphertext is modified', async () => {
    const encrypted = encrypt('sensitive');
    // Format: iv:authTag:ciphertext
    const parts = encrypted.split(':');
    
    // Tamper with ciphertext by flipping last char
    const tamperedCiphertext = parts[2].substring(0, parts[2].length - 1) + (parts[2].endsWith('0') ? '1' : '0');
    const tampered = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;

    expect(() => decrypt(tampered)).toThrowError(/Unsupported state or unable to authenticate data/);
  });

  it('8. Audit Log Safety: Logs contain no secrets', async () => {
    vi.mocked(requireAuth).mockResolvedValue({ id: userAId, tenantId: tenantAId } as any);
    vi.mocked(requireTenant).mockResolvedValue(tenantAId);
    vi.mocked(requirePermission).mockResolvedValue(true as any);

    const camera = await createCamera({
      name: 'Audit Cam',
      locationId: locationAId,
      ipAddress: '192.168.1.100',
      protocol: CameraProtocol.RTSP,
      authMode: 'PASSWORD',
      rtspUsername: 'admin_audit',
      rtspPassword: 'audit_password'
    });

    const logs = await withTenant(tenantAId).auditLog.findMany({
      where: { tenantId: tenantAId, action: 'CAMERA_CREATED' },
      orderBy: { timestamp: 'desc' },
      take: 1
    });

    const metadata = logs[0].metadata as any;
    expect(metadata.cameraId).toBe(camera.id);
    expect(metadata.name).toBe('Audit Cam');
    expect(metadata.rtspPassword).toBeUndefined();
    expect(metadata.encryptedPassword).toBeUndefined();
  });
});
