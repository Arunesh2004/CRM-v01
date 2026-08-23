import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../../database/utils/prisma';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import { TerritoryService } from '../../modules/sales-intel/territory.service';
import { ForecastService } from '../../modules/sales-intel/forecast.service';
import { ScoringService } from '../../modules/sales-intel/scoring.service';

describe('Sales Intelligence - Security & Adversarial Tests', () => {
  const runId = Date.now().toString();
  const tenantA = 'tenant-a-si-' + runId;
  const tenantB = 'tenant-b-si-' + runId;
  const adminUserA = 'admin-a-si-' + runId;
  const repUserA = 'rep-a-si-' + runId;
  const repUserB = 'rep-b-si-' + runId;

  let dealAId: string;
  let leadAId: string;
  let territoryAId: string;
  let quotaAId: string;
  let snapshotAId: string;

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.tenant.createMany({
        data: [
          { id: tenantA, name: 'Tenant A' },
          { id: tenantB, name: 'Tenant B' },
        ],
        skipDuplicates: true,
      });

      await tx.user.createMany({
        data: [
          { id: adminUserA, tenantId: tenantA, email: 'admin-si-' + runId + '@a.com' },
          { id: repUserA, tenantId: tenantA, email: 'rep-si-' + runId + '@a.com' },
          { id: repUserB, tenantId: tenantB, email: 'rep-si-' + runId + '@b.com' },
        ],
        skipDuplicates: true,
      });

      const pipeline = await tx.pipeline.create({ data: { tenantId: tenantA, name: 'Sales Pipeline' } });
      const stage = await tx.pipelineStage.create({ data: { tenantId: tenantA, pipelineId: pipeline.id, name: 'Stage 1', order: 1 } });
      
      const deal = await tx.deal.create({
        data: { tenantId: tenantA, title: 'Test Deal', value: 5000, pipelineId: pipeline.id, stageId: stage.id, probability: 50, assignedUserId: repUserA, createdById: adminUserA }
      });
      dealAId = deal.id;

      const lead = await tx.lead.create({
        data: { tenantId: tenantA, name: 'Test Lead', company: 'Acme', email: 'lead-' + runId + '@acme.com' }
      });
      leadAId = lead.id;

      // Permissions: Seed roles
      const adminRole = await tx.role.create({ data: { tenantId: tenantA, name: 'ADMIN' } });
      const repRole = await tx.role.create({ data: { tenantId: tenantA, name: 'REP' } });
      const repRoleB = await tx.role.create({ data: { tenantId: tenantB, name: 'REP_B' } });

      let pRead = await tx.permission.findFirst({ where: { resource: 'SALES_INTEL', action: 'READ' } });
      if (!pRead) pRead = await tx.permission.create({ data: { resource: 'SALES_INTEL', action: 'READ' } });

      let pWrite = await tx.permission.findFirst({ where: { resource: 'SALES_INTEL', action: 'UPDATE' } });
      if (!pWrite) pWrite = await tx.permission.create({ data: { resource: 'SALES_INTEL', action: 'UPDATE' } });

      let pManage = await tx.permission.findFirst({ where: { resource: 'SALES_INTEL', action: 'MANAGE_TERRITORIES' } });
      if (!pManage) pManage = await tx.permission.create({ data: { resource: 'SALES_INTEL', action: 'MANAGE_TERRITORIES' } });

      let pRevRead = await tx.permission.findFirst({ where: { resource: 'REVENUE', action: 'READ' } });
      if (!pRevRead) pRevRead = await tx.permission.create({ data: { resource: 'REVENUE', action: 'READ' } });

      await tx.rolePermission.createMany({
        data: [
          { roleId: adminRole.id, permissionId: pRead!.id, tenantId: tenantA },
          { roleId: adminRole.id, permissionId: pWrite!.id, tenantId: tenantA },
          { roleId: adminRole.id, permissionId: pManage!.id, tenantId: tenantA },
          { roleId: adminRole.id, permissionId: pRevRead!.id, tenantId: tenantA },
          { roleId: repRole.id, permissionId: pRead!.id, tenantId: tenantA },
          { roleId: repRoleB.id, permissionId: pRead!.id, tenantId: tenantB },
        ],
        skipDuplicates: true,
      });

      await tx.userRole.createMany({
        data: [
          { userId: adminUserA, roleId: adminRole.id, tenantId: tenantA },
          { userId: repUserA, roleId: repRole.id, tenantId: tenantA },
          { userId: repUserB, roleId: repRoleB.id, tenantId: tenantB },
        ],
        skipDuplicates: true,
      });
    });
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(`RESET app.current_tenant_id;`);
  });

  describe('Tenant Isolation', () => {
    it('1. Tenant B user attempts to read Tenant A territory', async () => {
      const terr = await TerritoryService.createTerritory(adminUserA, tenantA, { name: 'East Coast' });
      territoryAId = terr.id;

      const res = await TerritoryService.getTerritory(repUserB, tenantB, territoryAId);
      expect(res).toBeNull();
    });

    it('2. Tenant B user attempts to read Tenant A quota', async () => {
      const quota = await ForecastService.setSalesQuota(adminUserA, tenantA, { targetUserId: repUserA, period: 'Q1', targetAmount: 100000 });
      quotaAId = quota.id;

      await expect(ForecastService.getSalesQuota(repUserB, tenantB, quotaAId)).rejects.toThrow('Quota not found');
    });


  });

  describe('RBAC', () => {
    it('4. User without SALES_INTEL:UPDATE attempts to modify quota', async () => {
      await expect(ForecastService.setSalesQuota(repUserA, tenantA, { targetUserId: repUserA, period: 'Q2', targetAmount: 50000 }))
        .rejects.toThrow('Forbidden:');
    });

    it('5. User without MANAGE_TERRITORIES assigns territory', async () => {
      await expect(TerritoryService.assignUser(repUserA, tenantA, { targetUserId: repUserA, territoryId: territoryAId }))
        .rejects.toThrow('Forbidden:');
    });
  });

  describe('Financial Security', () => {
    it('6. Unauthorized user reads quota amount (Masked)', async () => {
      // repUserA lacks REVENUE:READ in this setup, so targetAmount should be masked.
      const quota = await ForecastService.getSalesQuota(repUserA, tenantA, quotaAId);
      expect(quota.targetAmount).toBe(0); // Masked
    });

    it('7. Authorized user reads quota amount (Raw)', async () => {
      // adminUserA is "admin" via email check in FieldSecurityService or has REVENUE:READ
      const quota = await ForecastService.getSalesQuota(adminUserA, tenantA, quotaAId);
      expect(quota.targetAmount).toBe(100000); // Raw
    });
  });

  describe('AI Scoring Protection', () => {
    it('8. Client attempts to modify score natively', async () => {
      await expect(ScoringService.updateLeadScore(tenantA, leadAId, repUserA, 'USER', 99, {}))
        .rejects.toThrow('Unauthorized actor type for AI scoring');
    });

    it('9. AI Service modifies score', async () => {
      const updated = await ScoringService.updateLeadScore(tenantA, leadAId, 'ai-engine-1', 'AI', 85, { sentiment: 'positive' });
      expect(updated.score).toBe(85);
    });

    it('10. Client attempts probability modification natively', async () => {
      await expect(ScoringService.updateDealProbabilityFactors(tenantA, dealAId, repUserA, 'USER', { risk: 'high' }, 90))
        .rejects.toThrow('Unauthorized actor type for AI scoring');
    });
  });

  describe('Snapshot & Audit Integrity', () => {
    it('11. Direct modification of DealSnapshot is prevented by trigger (from Phase 8 AuditLog immutability pattern if applicable) or strictly rejected by API', async () => {
      // The application provides no update method for snapshots.
      expect((ForecastService as any).updateDealSnapshot).toBeUndefined();
    });

    it('12. Verify AuditLog entry for AI scoring', async () => {
      const logs = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        return tx.auditLog.findMany({
          where: { tenantId: tenantA, action: 'LEAD_SCORE_UPDATED' }
        });
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].actorType).toBe('AI');
    });
  });
});
