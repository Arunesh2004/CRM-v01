import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import crypto from 'crypto';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { createCamera, updateCamera, deleteCamera, setCameraCredentials, getCameras } from '@/modules/cctv/camera.service';
import { getCameraRecordings } from '@/modules/cctv/recording.service';
import { generateStreamToken } from '@/modules/cctv/stream.service';
import { auth } from '@clerk/nextjs/server';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: {}
}));

function setTestAuthContext(userId: string, tenantId: string) {
  vi.mocked(auth).mockReturnValue({ userId: `clerk_${userId}`, orgId: tenantId } as any);
}

function clearTestAuthContext() {
  vi.mocked(auth).mockReturnValue({ userId: null, orgId: null } as any);
}


describe('R07: CCTV Permission Boundary', () => {
  let tenantId: string;
  let userUpdate: { id: string, tenantId: string };
  let userRead: { id: string, tenantId: string };
  let userCctvAdmin: { id: string, tenantId: string };
  let locId: string;
  let cameraId: string;

  beforeAll(async () => {
    tenantId = crypto.randomUUID();
    userUpdate = { id: crypto.randomUUID(), tenantId };
    userRead = { id: crypto.randomUUID(), tenantId };
    userCctvAdmin = { id: crypto.randomUUID(), tenantId };
    locId = crypto.randomUUID();
    cameraId = crypto.randomUUID();

    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.tenant.createMany({ data: [{ id: tenantId, name: 'Tenant', status: 'ACTIVE' }], skipDuplicates: true });
      
      const custId = crypto.randomUUID();
      await tx.customer.createMany({ data: [{ id: custId, tenantId, name: 'Cust', normalizedName: `c${Date.now()}` }], skipDuplicates: true });
      await tx.location.createMany({ data: [{ id: locId, customerId: custId, tenantId, name: 'Loc' }], skipDuplicates: true });
      
      await tx.camera.createMany({ data: [{ id: cameraId, tenantId, locationId: locId, name: 'Cam', ipAddress: '10.0.0.1', protocol: 'RTSP', authMode: 'NONE', streamVersion: 1 }], skipDuplicates: true });
      
      // Users
      await tx.user.createMany({
        data: [
          { id: userUpdate.id, clerkId: `clerk_${userUpdate.id}`, email: 'u1@example.com', tenantId, firstName: 'User', lastName: '1', status: 'ACTIVE' },
          { id: userRead.id, clerkId: `clerk_${userRead.id}`, email: 'u2@example.com', tenantId, firstName: 'User', lastName: '2', status: 'ACTIVE' },
          { id: userCctvAdmin.id, clerkId: `clerk_${userCctvAdmin.id}`, email: 'u3@example.com', tenantId, firstName: 'User', lastName: '3', status: 'ACTIVE' }
        ],
        skipDuplicates: true
      });

      // Roles
      const roleUpdate = crypto.randomUUID();
      const roleRead = crypto.randomUUID();
      const roleCctv = crypto.randomUUID();

      await tx.role.createMany({
        data: [
          { id: roleUpdate, tenantId, name: 'Role Update' },
          { id: roleRead, tenantId, name: 'Role Read' },
          { id: roleCctv, tenantId, name: 'Role CCTV' }
        ],
        skipDuplicates: true
      });

      // Helper to grant permission
      async function grant(roleId: string, resource: string, action: string) {
        let p = await tx.permission.findFirst({ where: { resource, action } });
        if (!p) {
          p = await tx.permission.create({ data: { id: crypto.randomUUID(), resource, action } });
        }
        await tx.rolePermission.createMany({ data: [{ id: crypto.randomUUID(), roleId, permissionId: p.id, tenantId }], skipDuplicates: true });
      }

      await grant(roleCctv, 'CAMERA', 'CREATE');
      await grant(roleCctv, 'CAMERA', 'UPDATE');
      await grant(roleCctv, 'CAMERA', 'DELETE');
      await grant(roleCctv, 'CAMERA', 'READ');
      await grant(roleCctv, 'STREAM', 'READ');
      await grant(roleCctv, 'RECORDING', 'READ');
      await grant(roleCctv, 'SYSTEM', 'UPDATE');

      await grant(roleUpdate, 'CUSTOMER', 'UPDATE');
      await grant(roleRead, 'CUSTOMER', 'READ');

      // Assign roles
      await tx.userRole.createMany({
        data: [
          { id: crypto.randomUUID(), userId: userUpdate.id, roleId: roleUpdate, tenantId },
          { id: crypto.randomUUID(), userId: userRead.id, roleId: roleRead, tenantId },
          { id: crypto.randomUUID(), userId: userCctvAdmin.id, roleId: roleCctv, tenantId }
        ],
        skipDuplicates: true
      });
    });
  });

  // CUSTOMER:UPDATE
  it('1. CUSTOMER:UPDATE cannot createCamera', async () => {
    setTestAuthContext(userUpdate.id, userUpdate.tenantId);
    await expect(createCamera({ name: 'C', locationId: locId, ipAddress: '10.0.0.1', protocol: 'RTSP', authMode: 'NONE' })).rejects.toThrow(/Forbidden/i);
  });

  it('2. CUSTOMER:UPDATE cannot updateCamera', async () => {
    setTestAuthContext(userUpdate.id, userUpdate.tenantId);
    await expect(updateCamera(cameraId, { name: 'C2' })).rejects.toThrow(/Forbidden/i);
  });

  it('3. CUSTOMER:UPDATE cannot deleteCamera', async () => {
    setTestAuthContext(userUpdate.id, userUpdate.tenantId);
    await expect(deleteCamera(cameraId)).rejects.toThrow(/Forbidden/i);
  });

  it('4. CUSTOMER:UPDATE cannot setCameraCredentials', async () => {
    setTestAuthContext(userUpdate.id, userUpdate.tenantId);
    await expect(setCameraCredentials(cameraId, 'user', 'pass')).rejects.toThrow(/Forbidden/i);
  });

  // CUSTOMER:READ
  it('5. CUSTOMER:READ cannot getCameras (requires CAMERA:READ)', async () => {
    setTestAuthContext(userRead.id, userRead.tenantId);
    await expect(getCameras()).rejects.toThrow(/Forbidden/i);
  });

  it('6. CUSTOMER:READ cannot generateStreamToken (requires STREAM:READ)', async () => {
    setTestAuthContext(userRead.id, userRead.tenantId);
    await expect(generateStreamToken(cameraId)).rejects.toThrow(/Forbidden/i);
  });

  it('7. CUSTOMER:READ cannot getCameraRecordings (requires RECORDING:READ)', async () => {
    setTestAuthContext(userRead.id, userRead.tenantId);
    await expect(getCameraRecordings(cameraId)).rejects.toThrow(/Forbidden/i);
  });

  // CCTV ADMIN
  it('8. CCTV Admin can access proper camera operations', async () => {
    setTestAuthContext(userCctvAdmin.id, userCctvAdmin.tenantId);
    const cameras = await getCameras();
    expect(cameras).toBeDefined();
    expect(Array.isArray(cameras)).toBe(true);
  });
});
