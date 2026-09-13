import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import crypto from 'crypto';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { generateRecordingDownloadUrl } from '@/modules/cctv/recording.service';
import { auth } from '@clerk/nextjs/server';
import { requireAuth } from '@/lib/auth';

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
describe('R07: Recording Download IDOR', () => {
  let tenantA: string;
  let tenantB: string;
  let recordingAId: string;
  let cameraAId: string;
  let userA: { id: string, tenantId: string };
  let userB: { id: string, tenantId: string };
  let unauthUser: { id: string, tenantId: string };
  
  beforeAll(async () => {
    tenantA = crypto.randomUUID();
    tenantB = crypto.randomUUID();
    const custA = crypto.randomUUID();
    const custB = crypto.randomUUID();
    const locA = crypto.randomUUID();
    cameraAId = crypto.randomUUID();
    recordingAId = crypto.randomUUID();
    
    userA = { id: crypto.randomUUID(), tenantId: tenantA };
    userB = { id: crypto.randomUUID(), tenantId: tenantB };
    unauthUser = { id: crypto.randomUUID(), tenantId: tenantA };

    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // Tenants
      await tx.tenant.createMany({
        data: [
          { id: tenantA, name: 'Tenant A', status: 'ACTIVE' },
          { id: tenantB, name: 'Tenant B', status: 'ACTIVE' }
        ],
        skipDuplicates: true
      });
      
      // Users
      await tx.user.createMany({
        data: [
          { id: userA.id, clerkId: `clerk_${userA.id}`, email: 'usera@example.com', tenantId: tenantA, firstName: 'User', lastName: 'A', status: 'ACTIVE' },
          { id: userB.id, clerkId: `clerk_${userB.id}`, email: 'userb@example.com', tenantId: tenantB, firstName: 'User', lastName: 'B', status: 'ACTIVE' },
          { id: unauthUser.id, clerkId: `clerk_${unauthUser.id}`, email: 'unauth@example.com', tenantId: tenantA, firstName: 'Unauth', lastName: 'User', status: 'ACTIVE' }
        ],
        skipDuplicates: true
      });
      
      // Customers & Locations
      await tx.customer.createMany({
        data: [
          { id: custA, tenantId: tenantA, name: 'Cust A', normalizedName: 'custa' },
          { id: custB, tenantId: tenantB, name: 'Cust B', normalizedName: 'custb' }
        ],
        skipDuplicates: true
      });
      
      await tx.location.createMany({
        data: [
          { id: locA, customerId: custA, tenantId: tenantA, name: 'Loc A' }
        ],
        skipDuplicates: true
      });
      
      // Camera A
      await tx.camera.createMany({
        data: [
          { id: cameraAId, tenantId: tenantA, locationId: locA, name: 'Cam A', ipAddress: '192.168.1.1', protocol: 'RTSP', authMode: 'NONE', streamVersion: 1 }
        ],
        skipDuplicates: true
      });
      
      // Recording A
      await tx.recording.createMany({
        data: [
          { id: recordingAId, segmentId: 'seg-1', tenantId: tenantA, cameraId: cameraAId, streamVersion: 1, storageKey: `cctv_recordings/${tenantA}/${cameraAId}/v1/seg-1.mp4`, status: 'COMPLETED', sizeBytes: 1024, startTime: new Date() }
        ],
        skipDuplicates: true
      });

      // Roles & Permissions
      const roleA = crypto.randomUUID();
      const roleB = crypto.randomUUID();
      const roleUnauth = crypto.randomUUID();
      
      await tx.role.createMany({
        data: [
          { id: roleA, tenantId: tenantA, name: 'Role A' },
          { id: roleB, tenantId: tenantB, name: 'Role B' },
          { id: roleUnauth, tenantId: tenantA, name: 'Role Unauth' }
        ],
        skipDuplicates: true
      });

      let p = await tx.permission.findFirst({ where: { resource: 'RECORDING', action: 'READ' } });
      if (!p) {
        p = await tx.permission.create({ data: { id: crypto.randomUUID(), resource: 'RECORDING', action: 'READ' } });
      }
      const pId = p.id;
      
      await tx.rolePermission.createMany({
        data: [
          { id: crypto.randomUUID(), roleId: roleA, permissionId: pId, tenantId: tenantA },
          { id: crypto.randomUUID(), roleId: roleB, permissionId: pId, tenantId: tenantB }
        ],
        skipDuplicates: true
      });
      
      await tx.userRole.createMany({
        data: [
          { id: crypto.randomUUID(), userId: userA.id, roleId: roleA, tenantId: tenantA },
          { id: crypto.randomUUID(), userId: userB.id, roleId: roleB, tenantId: tenantB },
          { id: crypto.randomUUID(), userId: unauthUser.id, roleId: roleUnauth, tenantId: tenantA }
        ],
        skipDuplicates: true
      });
    });
  });

  it('1. Same-tenant authorized recording -> allowed', async () => {
    setTestAuthContext(userA.id, tenantA);
    const dbCheck = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      return tx.recording.findFirst({ where: { id: recordingAId, tenantId: tenantA }, include: { camera: true } });
    });
    console.log('DB CHECK:', dbCheck);
    const userCheck = await requireAuth();
    console.log('USER CHECK:', userCheck?.id, userCheck?.tenantId);
    
    const result = await generateRecordingDownloadUrl(recordingAId);
    expect(result.downloadUrl).toContain(`cctv_recordings/${tenantA}/${cameraAId}/v1/seg-1.mp4`);
  });

  it('2. Foreign recordingId -> rejected without disclosing storage key', async () => {
    setTestAuthContext(userB.id, userB.tenantId);
    await expect(generateRecordingDownloadUrl(recordingAId)).rejects.toThrow('Recording not found');
  });

  it('3. Foreign tenant -> rejected (tested implicitly by #2)', async () => {
    setTestAuthContext(userB.id, userB.tenantId);
    await expect(generateRecordingDownloadUrl(recordingAId)).rejects.toThrow('Recording not found');
  });

  it('4. Unauthenticated request -> rejected', async () => {
    clearTestAuthContext();
    await expect(generateRecordingDownloadUrl(recordingAId)).rejects.toThrow();
  });

  it('5. Insufficient RECORDING:READ permission -> rejected', async () => {
    setTestAuthContext(unauthUser.id, unauthUser.tenantId);
    await expect(generateRecordingDownloadUrl(recordingAId)).rejects.toThrow(/Forbidden/i);
  });
});
