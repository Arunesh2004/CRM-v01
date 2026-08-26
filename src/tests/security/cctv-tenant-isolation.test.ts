import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import globalPrisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import * as authLib from '@/lib/auth';
import { createCamera, getCameraById, updateCamera, deleteCamera, simulateAIEvent } from '@/modules/cctv/camera.service';
import { getCameraRecordings, generateRecordingDownloadUrl } from '@/modules/cctv/recording.service';
import { generateStreamToken } from '@/modules/cctv/stream.service';

describe('CCTV Adversarial Security Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tA_AdminId: string;
  let tB_AdminId: string;
  let tA_MemberId: string;
  
  let tA_LocationId: string;
  let tB_LocationId: string;
  
  let tA_CameraId: string;
  let tB_CameraId: string;
  
  let tA_RecordingId: string;

  beforeAll(async () => {
    // Bootstrap test data
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const tA = await tx.tenant.create({ data: { name: 'Tenant A CCTV', status: 'ACTIVE' } });
      const tB = await tx.tenant.create({ data: { name: 'Tenant B CCTV', status: 'ACTIVE' } });
      tenantAId = tA.id;
      tenantBId = tB.id;

      // Seed roles
      const adminRoleA = await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId: tA.id } });
      const memberRoleA = await tx.role.create({ data: { name: 'MEMBER', tenantId: tA.id } });
      const adminRoleB = await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId: tB.id } });

      // Permissions for testing
      const permCustomerUpdate = await tx.permission.upsert({
        where: { resource_action: { resource: 'CUSTOMER', action: 'UPDATE' } },
        update: {}, create: { resource: 'CUSTOMER', action: 'UPDATE' }
      });
      const permCustomerRead = await tx.permission.upsert({
        where: { resource_action: { resource: 'CUSTOMER', action: 'READ' } },
        update: {}, create: { resource: 'CUSTOMER', action: 'READ' }
      });

      await tx.rolePermission.create({ data: { roleId: adminRoleA.id, permissionId: permCustomerUpdate.id, tenantId: tA.id } });
      await tx.rolePermission.create({ data: { roleId: adminRoleA.id, permissionId: permCustomerRead.id, tenantId: tA.id } });
      await tx.rolePermission.create({ data: { roleId: memberRoleA.id, permissionId: permCustomerRead.id, tenantId: tA.id } });
      
      await tx.rolePermission.create({ data: { roleId: adminRoleB.id, permissionId: permCustomerUpdate.id, tenantId: tB.id } });
      await tx.rolePermission.create({ data: { roleId: adminRoleB.id, permissionId: permCustomerRead.id, tenantId: tB.id } });

      // Users
      const uA_Admin = await tx.user.create({
        data: { email: 'admin@ta.com', tenantId: tA.id, userRoles: { create: { roleId: adminRoleA.id, tenantId: tA.id } } }
      });
      tA_AdminId = uA_Admin.id;

      const uA_Member = await tx.user.create({
        data: { email: 'member@ta.com', tenantId: tA.id, userRoles: { create: { roleId: memberRoleA.id, tenantId: tA.id } } }
      });
      tA_MemberId = uA_Member.id;

      const uB_Admin = await tx.user.create({
        data: { email: 'admin@tb.com', tenantId: tB.id, userRoles: { create: { roleId: adminRoleB.id, tenantId: tB.id } } }
      });
      tB_AdminId = uB_Admin.id;

      // Customers
      const custA = await tx.customer.create({ data: { name: 'Cust A', normalizedName: 'cust_a', tenantId: tA.id } });
      const custB = await tx.customer.create({ data: { name: 'Cust B', normalizedName: 'cust_b', tenantId: tB.id } });

      // Locations
      const locA = await tx.location.create({ data: { name: 'HQ A', tenantId: tA.id, customerId: custA.id } });
      tA_LocationId = locA.id;

      const locB = await tx.location.create({ data: { name: 'HQ B', tenantId: tB.id, customerId: custB.id } });
      tB_LocationId = locB.id;

      // Cameras
      const camA = await tx.camera.create({
        data: { name: 'Cam A1', tenantId: tA.id, locationId: tA_LocationId, ipAddress: '10.0.0.1', protocol: 'RTSP' }
      });
      tA_CameraId = camA.id;

      const camB = await tx.camera.create({
        data: { name: 'Cam B1', tenantId: tB.id, locationId: tB_LocationId, ipAddress: '10.0.0.2', protocol: 'RTSP' }
      });
      tB_CameraId = camB.id;

      // Recordings
      const recA = await tx.recording.create({
        data: { tenantId: tA.id, cameraId: tA_CameraId, storageKey: 'rec_A.mp4', startTime: new Date() }
      });
      tA_RecordingId = recA.id;
    });
  });

  afterAll(async () => {
    // Teardown skipped because AuditLog append-only Postgres trigger prevents Tenant deletion.
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Mock helpers
  async function mockAuthAs(userId: string, tenantId: string) {
    const user = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      return tx.user.findUnique({ where: { id: userId }, include: { userRoles: { include: { role: true } } } });
    });
    vi.spyOn(authLib, 'requireAuth').mockResolvedValue(user as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenantId);
    
    // Simplistic permission mock based on what we seeded
    vi.spyOn(authLib, 'requirePermission').mockImplementation(async (resource, action) => {
      const hasPerm = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        return tx.rolePermission.findFirst({
          where: {
            tenantId,
            role: { userRoles: { some: { userId } } },
            permission: { resource, action }
          }
        });
      });
      if (!hasPerm) throw new Error(`Forbidden: Missing ${action} on ${resource}`);
      return undefined as any;
    });
  }

  describe('A. CAMERA TENANT ISOLATION', () => {
    it('Tenant B cannot read Tenant A camera', async () => {
      await mockAuthAs(tB_AdminId, tenantBId);
      const cam = await getCameraById(tA_CameraId);
      expect(cam).toBeNull();
    });

    it('Tenant B cannot update Tenant A camera', async () => {
      await mockAuthAs(tB_AdminId, tenantBId);
      await expect(updateCamera({ id: tA_CameraId, name: 'Hacked Cam' })).rejects.toThrow('Camera not found');
    });

    it('Tenant B cannot delete Tenant A camera', async () => {
      await mockAuthAs(tB_AdminId, tenantBId);
      await expect(deleteCamera(tA_CameraId)).rejects.toThrow('Camera not found');
    });
  });

  describe('B. RECORDING ISOLATION', () => {
    it('Tenant B cannot retrieve Tenant A recording list', async () => {
      await mockAuthAs(tB_AdminId, tenantBId);
      const res = await getCameraRecordings(tA_CameraId);
      expect(res.data.length).toBe(0);
    });

    it('Tenant B cannot generate playback token for Tenant A recording', async () => {
      await mockAuthAs(tB_AdminId, tenantBId);
      await expect(generateRecordingDownloadUrl(tA_RecordingId)).rejects.toThrow('Recording not found');
    });
  });

  describe('C & D. TOKEN SECURITY', () => {
    it('Tenant A Admin can generate valid stream token', async () => {
      await mockAuthAs(tA_AdminId, tenantAId);
      const res = await generateStreamToken(tA_CameraId);
      expect(res.streamUrl).toContain('token=');
    });

    it('Tenant B cannot generate stream token for Tenant A camera', async () => {
      await mockAuthAs(tB_AdminId, tenantBId);
      await expect(generateStreamToken(tA_CameraId)).rejects.toThrow('Camera not found');
    });

    it('Missing authentication throws on stream token generation', async () => {
      vi.spyOn(authLib, 'requireAuth').mockRejectedValue(new Error('Unauthorized'));
      await expect(generateStreamToken(tA_CameraId)).rejects.toThrow('Unauthorized');
    });
  });

  describe('E. CAMERA -> LOCATION OWNERSHIP', () => {
    it('Tenant A cannot attach camera to Tenant B location', async () => {
      await mockAuthAs(tA_AdminId, tenantAId);
      await expect(createCamera({
        name: 'Malicious Cam',
        locationId: tB_LocationId,
        ipAddress: '10.0.0.5',
        protocol: 'RTSP'
      })).rejects.toThrow(/Cross-tenant access denied/);
    });

    it('Tenant A cannot update existing camera to Tenant B location', async () => {
      await mockAuthAs(tA_AdminId, tenantAId);
      await expect(updateCamera({
        id: tA_CameraId,
        locationId: tB_LocationId
      })).rejects.toThrow(/Cross-tenant access denied/);
    });
  });

  describe('F. RBAC / PRIVILEGE ESCALATION', () => {
    it('Tenant A MEMBER cannot create a camera (lacks UPDATE permission)', async () => {
      await mockAuthAs(tA_MemberId, tenantAId);
      await expect(createCamera({
        name: 'Sneaky Cam',
        locationId: tA_LocationId,
        ipAddress: '10.0.0.6',
        protocol: 'RTSP'
      })).rejects.toThrow('Forbidden: Missing UPDATE on CUSTOMER');
    });

    it('Tenant A MEMBER cannot delete a camera', async () => {
      await mockAuthAs(tA_MemberId, tenantAId);
      await expect(deleteCamera(tA_CameraId)).rejects.toThrow('Forbidden: Missing UPDATE on CUSTOMER');
    });
  });

  describe('G. CROSS-TENANT AI EVENT MANIPULATION', () => {
    it('Tenant B cannot simulate AI event on Tenant A camera', async () => {
      await mockAuthAs(tB_AdminId, tenantBId);
      await expect(simulateAIEvent({
        cameraId: tA_CameraId,
        confidence: 0.99,
        detectedObject: 'Person'
      })).rejects.toThrow('Camera not found');
    });
    
    it('Tenant A can simulate AI event successfully', async () => {
      await mockAuthAs(tA_AdminId, tenantAId);
      const event = await simulateAIEvent({
        cameraId: tA_CameraId,
        confidence: 0.95,
        detectedObject: 'Vehicle'
      });
      expect(event).toBeDefined();
      expect(event.cameraId).toBe(tA_CameraId);
    });
  });

  describe('H. IDOR & CLIENT-PROVIDED TENANT ID', () => {
    it('Forged tenant ID from auth layer is explicitly simulated as rejected in actual auth layer', async () => {
      // In reality, requireTenant() reads from server-verified JWT.
      // So if a client sends { tenantId: 'B' } in JSON body, but requireTenant() returns A, A is used.
      // We will prove that if requireTenant returns A, but user provides Camera B, it fails.
      await mockAuthAs(tA_AdminId, tenantAId);
      const cam = await getCameraById(tB_CameraId);
      expect(cam).toBeNull();
    });
  });
});
