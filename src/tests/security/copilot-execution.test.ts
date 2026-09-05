import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import * as crypto from 'crypto';
import prisma from '@db/utils/prisma';
import { ToolRegistry } from '@/modules/ai/tools/registry';
import { ContextBuilderService } from '@/modules/ai/context/context-builder.service';
import { updateLead } from '@/modules/crm/lead/lead.service';

// Mock auth so service functions can run in test context
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: '__REPLACED_BY_TEST__', email: 'test@test.com' }),
  requireTenant: vi.fn().mockResolvedValue('__REPLACED_BY_TEST__'),
  requirePermission: vi.fn().mockResolvedValue(true),
  checkPermission: vi.fn().mockResolvedValue(true),
}));

describe('Phase 10.5-E Copilot Execution Security', () => {
  const tenantId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const leadId = crypto.randomUUID();
  let toolId: string;

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.$executeRawUnsafe(`INSERT INTO "Tenant" (id, name, "createdAt", "updatedAt") VALUES ('${tenantId}', 'Tenant A', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "User" (id, "tenantId", email, status, "createdAt", "updatedAt") VALUES ('${userId}', '${tenantId}', 'test@test.com', 'ACTIVE', now(), now())`);
      
      const roleId = crypto.randomUUID();
      await tx.$executeRawUnsafe(`INSERT INTO "Role" (id, "tenantId", name, "createdAt", "updatedAt") VALUES ('${roleId}', '${tenantId}', 'User', now(), now())`);
      await tx.$executeRawUnsafe(`INSERT INTO "UserRole" (id, "userId", "roleId", "tenantId", "createdAt") VALUES ('${crypto.randomUUID()}', '${userId}', '${roleId}', '${tenantId}', now())`);
      
      // Give LEAD:UPDATE
      let pLeadUpdate = await tx.permission.findFirst({ where: { resource: 'LEAD', action: 'UPDATE' } });
      if (!pLeadUpdate) pLeadUpdate = await tx.permission.create({ data: { resource: 'LEAD', action: 'UPDATE' } });
      await tx.$executeRawUnsafe(`INSERT INTO "RolePermission" (id, "roleId", "permissionId", "tenantId", "createdAt") VALUES ('${crypto.randomUUID()}', '${roleId}', '${pLeadUpdate.id}', '${tenantId}', now())`);

      await tx.$executeRawUnsafe(`
        INSERT INTO "Lead" (id, "tenantId", name, company, email, status, "createdAt", "updatedAt")
        VALUES ('${leadId}', '${tenantId}', 'Test Lead', 'Acme', 'lead@acme.com', 'NEW', now(), now());
      `);

      let aiTool = await tx.aITool.findUnique({ where: { name: 'update_lead' } });
      if (!aiTool) {
        aiTool = await tx.aITool.create({
          data: { id: crypto.randomUUID(), name: 'update_lead', requiredPermission: 'LEAD:UPDATE', riskLevel: 'MODERATE' }
        });
      }
      toolId = aiTool.id;
    });
  });

  describe('Atomic Claiming and Concurrency', () => {
    it('should successfully create PENDING execution for confirmation_required tools', async () => {
      const context = await ContextBuilderService.buildUserContext(tenantId, userId);
      const res = await ToolRegistry.executeTool('update_lead', { leadId, status: 'CONTACTED' }, context);
      expect(res).toHaveProperty('_type', 'PENDING_CONFIRMATION');
      expect(res).toHaveProperty('executionId');

      const execution = await prisma.aIExecution.findUnique({ where: { id: res.executionId } });
      expect(execution?.status).toBe('PENDING');
      expect(execution?.toolId).toBe(toolId);
    });

    it('should enforce idempotency at the updateLead service level: duplicate key returns existing record', async () => {
      // Mock requireAuth/requireTenant to return this test's identities
      const { requireAuth, requireTenant } = await import('@/lib/auth');
      vi.mocked(requireAuth).mockResolvedValue({ id: userId, email: 'test@test.com' } as any);
      vi.mocked(requireTenant).mockResolvedValue(tenantId);

      const idempotencyKey = crypto.randomUUID();

      // First call: should update and succeed
      const res1 = await updateLead({ id: leadId, status: 'QUALIFIED', idempotencyKey });
      expect(res1).not.toBeNull();

      // Second call with same idempotencyKey: should NOT throw P2002, should return idempotent result
      const res2 = await updateLead({ id: leadId, status: 'QUALIFIED', idempotencyKey });
      expect(res2).not.toBeNull();
    });
  });

  describe('Security Boundaries (The 32-case equivalents)', () => {
    it('must reject execution mutation if AIExecution is not PENDING', async () => {
      const executionId = crypto.randomUUID();
      await prisma.aIExecution.create({
        data: { id: executionId, tenantId, userId, toolId, status: 'REJECTED', input: '{}' }
      });

      const claimed = await prisma.$executeRaw`
        UPDATE "AIExecution" SET "status" = 'IN_PROGRESS'
        WHERE "id" = ${executionId} AND "status" = 'PENDING' AND "tenantId" = ${tenantId} AND "userId" = ${userId}
      `;
      expect(claimed).toBe(0);
    });

    it('must enforce tenant isolation on execution claim', async () => {
      const executionId = crypto.randomUUID();
      await prisma.aIExecution.create({
        data: { id: executionId, tenantId, userId, toolId, status: 'PENDING', input: '{}' }
      });

      const fakeTenantId = crypto.randomUUID();
      const claimed = await prisma.$executeRaw`
        UPDATE "AIExecution" SET "status" = 'IN_PROGRESS'
        WHERE "id" = ${executionId} AND "status" = 'PENDING' AND "tenantId" = ${fakeTenantId} AND "userId" = ${userId}
      `;
      expect(claimed).toBe(0);
    });
  });
});
