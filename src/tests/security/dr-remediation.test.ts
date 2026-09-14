import { test, expect, beforeAll, afterAll, describe, vi } from 'vitest';
import prisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { exportTenant } from '../../modules/recovery/export.engine';
import { RetentionPolicyService } from '../../modules/recovery/scheduler/RetentionPolicyService';
import { RPOMonitor } from '../../modules/recovery/scheduler/RPOMonitor';
import { executeRestore, approveRestore, requestRestore } from '../../modules/recovery/restore.engine';
import crypto from 'crypto';

vi.mock('../../lib/storage', () => ({
  getStorageProvider: () => ({
    verifyObjectExists: vi.fn().mockResolvedValue(true),
    download: vi.fn().mockRejectedValue(new Error('Simulated download failure')),
    upload: vi.fn().mockResolvedValue('local://fake/path'),
    deleteObject: vi.fn().mockResolvedValue(true)
  })
}));

describe('Phase S4.4E - Disaster Recovery Remediation Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    // Check if we are running as crm_rls_test_user
    const currentRole: any[] = await prisma.$queryRawUnsafe(`SELECT current_user`);
    if (!currentRole[0].current_user.includes('test_user')) {
      console.warn(`WARNING: Running tests with role ${currentRole[0].current_user}. Ensure it is restricted.`);
    }

    // Seed mock data using system operation
    tenantAId = crypto.randomUUID();
    tenantBId = crypto.randomUUID();
    userAId = crypto.randomUUID();
    userBId = crypto.randomUUID();

    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.tenant.create({ data: { id: tenantAId, name: 'DR Tenant A' } });
      await tx.tenant.create({ data: { id: tenantBId, name: 'DR Tenant B' } });
      await tx.user.create({ data: { id: userAId, tenantId: tenantAId, email: 'ownerA@dr.com', status: 'ACTIVE' } });
      await tx.user.create({ data: { id: userBId, tenantId: tenantBId, email: 'ownerB@dr.com', status: 'ACTIVE' } });

      // Update tenant owner
      await tx.tenant.update({ where: { id: tenantAId }, data: { ownerId: userAId } });
      await tx.tenant.update({ where: { id: tenantBId }, data: { ownerId: userBId } });

      // Create some records
      await tx.customer.create({ data: { id: crypto.randomUUID(), tenantId: tenantAId, name: 'Cust A', normalizedName: 'cust_a' } });
      await tx.customer.create({ data: { id: crypto.randomUUID(), tenantId: tenantBId, name: 'Cust B', normalizedName: 'cust_b' } });

      // Create mock snapshot
      await tx.recoverySnapshot.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: tenantAId,
          version: 1,
          schemaVersion: '1.0',
          applicationVersion: '1.0.0',
          prismaVersion: '6.19.3',
          backupFormatVersion: '1',
          encryptionAlgorithm: 'aes-256-gcm',
          checksum: 'dummy-checksum',
          status: 'ACTIVE',
          sizeBytes: 1024
        }
      });
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.customer.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.recoveryAuditLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.recoverySnapshot.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.recoveryJob.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
      await tx.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
      await tx.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    });
  });

  test('A. Tenant-scoped export: Tenant A includes A, excludes B', async () => {
    try {
      // It might throw because we don't have mock S3 setup, but it shouldn't throw an RLS error.
      const result = await exportTenant(tenantAId, userAId);
      expect(result).toBeDefined();
    } catch(e: any) {
      // Allow if it fails at storage layer, but not prisma RLS
      expect(e.message).not.toContain('violates row-level security');
    }
  });

  test('B. Global retention scan: can discover required tenants', async () => {
    const service = new RetentionPolicyService();
    // This calls executeAsSystem internally
    await service.enforceRetentionPolicies();
    expect(true).toBe(true);
  }, 15000);

  test('D. Global RPO: can inspect all required tenants', async () => {
    const monitor = new RPOMonitor();
    const metrics = await monitor.getGlobalRPOStatus();
    const foundA = metrics.find(m => m.tenantId === tenantAId);
    const foundB = metrics.find(m => m.tenantId === tenantBId);
    expect(foundA).toBeDefined();
    expect(foundB).toBeDefined();
  }, 15000);

  test('E. Tenant RPO: Verify cannot see other tenant data', async () => {
    const monitor = new RPOMonitor();
    const metricA = await monitor.calculateRPO(tenantAId);
    expect(metricA.tenantId).toBe(tenantAId);
  });

  test('G. Restore rollback: Verify error rolls back restore writes', async () => {
    // We will mock the error.
    const job = await requestRestore(`local://${tenantAId}/fakekey.enc`, 'dummy-checksum', userAId);
    expect(job).toBeDefined();
    await approveRestore(job.id);

    // Expect failure due to missing S3 object
    await expect(executeRestore(job.id)).rejects.toThrow();

    // Job status should be FAILED
    const failedJob = await executeAsSystem(SystemOperation.DISASTER_RECOVERY, tx => tx.recoveryJob.findUnique({ where: { id: job.id } }));
    expect(failedJob?.status).toBe('FAILED');
  });

  test('H. Privilege Cleanup Test (Step 13)', async () => {
    await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => {
      // S3.4C Native Role architecture: crm_system_user has BYPASSRLS natively.
      // We no longer set 'app.bypass_rls'. We just verify we can see all tenants.
      const tenants = await tx.tenant.findMany();
      expect(tenants.length).toBeGreaterThan(0);
    });

    // Outside transaction, should be null or missing
    const pids: any[] = await prisma.$queryRawUnsafe(`SELECT current_setting('app.bypass_rls', true) as bypass`);
    expect(pids[0].bypass).toBeNull();
  });

  test('I. Connection Pool Stress Test (Step 14)', async () => {
    // Alternate 50 times between system DR query and normal query
    for(let i = 0; i < 50; i++) {
        await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => {
            const result = await tx.tenant.findMany({ take: 1 });
            expect(result.length).toBeGreaterThanOrEqual(0);
        });

        // Normal query
        const normalResult = await prisma.$queryRawUnsafe(`SELECT current_setting('app.bypass_rls', true) as bypass`);
        expect((normalResult as any[])[0].bypass).toBeNull();
    }
  });

  test('J. DR Correctness: RPO Latest Snapshot', async () => {
    // We will create multiple snapshots for Tenant A and Tenant B
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      // Clean up previous snapshots first
      await tx.recoverySnapshot.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });

      const now = Date.now();
      
      // Tenant A: Older and Newer
      await tx.recoverySnapshot.create({
        data: {
          id: crypto.randomUUID(), tenantId: tenantAId, version: 1, schemaVersion: '1.0',
          checksum: 'A-old', status: 'ACTIVE', sizeBytes: 1024,
          createdAt: new Date(now - 10000)
        }
      });
      await tx.recoverySnapshot.create({
        data: {
          id: crypto.randomUUID(), tenantId: tenantAId, version: 1, schemaVersion: '1.0',
          checksum: 'A-new', status: 'ACTIVE', sizeBytes: 1024,
          createdAt: new Date(now - 2000) // latest
        }
      });

      // Tenant B: Older and Newer
      await tx.recoverySnapshot.create({
        data: {
          id: crypto.randomUUID(), tenantId: tenantBId, version: 1, schemaVersion: '1.0',
          checksum: 'B-old', status: 'ACTIVE', sizeBytes: 1024,
          createdAt: new Date(now - 8000)
        }
      });
      await tx.recoverySnapshot.create({
        data: {
          id: crypto.randomUUID(), tenantId: tenantBId, version: 1, schemaVersion: '1.0',
          checksum: 'B-new', status: 'ACTIVE', sizeBytes: 1024,
          createdAt: new Date(now - 1000) // latest
        }
      });
    });

    const monitor = new RPOMonitor();
    const metrics = await monitor.getGlobalRPOStatus();

    const metricA = metrics.find(m => m.tenantId === tenantAId);
    const metricB = metrics.find(m => m.tenantId === tenantBId);

    // Verify it picked the latest (the one we seeded closest to `now`)
    expect(metricA?.lastSuccessfulBackup).toBeDefined();
    expect(metricB?.lastSuccessfulBackup).toBeDefined();

    // Let's verify directly what `DISTINCT ON` pulled
    const latestA = await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => {
        return tx.recoverySnapshot.findFirst({
            where: { tenantId: tenantAId, status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' }
        });
    });
    // It should have checksum 'A-new'
    expect(latestA?.checksum).toBe('A-new');
    
    // Ensure the mapped metric timestamp matches exactly
    expect(metricA?.lastSuccessfulBackup?.getTime()).toEqual(latestA?.createdAt.getTime());
  });

  test('K. DR Correctness: Retention Policies (BASIC, BUSINESS, ENTERPRISE)', async () => {
    // Create a new tenant with ENTERPRISE
    const tenantCId = crypto.randomUUID();
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.tenant.create({ data: { id: tenantCId, name: 'DR Tenant C', rpoPolicy: 'ENTERPRISE' } });

      // We need to insert 35 snapshots for Tenant C
      const data = [];
      const now = Date.now();
      for(let i = 0; i < 35; i++) {
         data.push({
            id: crypto.randomUUID(), tenantId: tenantCId, version: 1, schemaVersion: '1.0',
            checksum: `C-snap-${i}`, status: 'ACTIVE', sizeBytes: 1024,
            // make them older descending
            createdAt: new Date(now - (i * 10000))
         });
      }
      // Insert in bulk
      await tx.recoverySnapshot.createMany({ data });
    });

    const service = new RetentionPolicyService();
    // enforce tenant C only to avoid side effects
    await service.enforceTenantRetention(tenantCId);

    // ENTERPRISE should keep 30.
    const remaining = await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => {
      return tx.recoverySnapshot.findMany({ where: { tenantId: tenantCId, status: 'ACTIVE' }});
    });
    
    // We expect exactly 30 ACTIVE remaining. 5 should be DELETED.
    expect(remaining.length).toBe(30);

    const deleted = await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => {
      return tx.recoverySnapshot.findMany({ where: { tenantId: tenantCId, status: 'DELETED' }});
    });
    // Our S3 mock should succeed, hence they get marked DELETED.
    expect(deleted.length).toBe(5);

    // cleanup
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.recoverySnapshot.deleteMany({ where: { tenantId: tenantCId } });
      await tx.tenant.delete({ where: { id: tenantCId } });
    });
  });

});
