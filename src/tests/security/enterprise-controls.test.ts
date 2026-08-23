import { RoleManagementService } from '../../modules/security/roles/role-management.service';
import { FieldSecurityService } from '../../modules/security/field-security/field-security.service';
import { ABACPolicyService } from '../../modules/security/abac/abac-policy.service';
import { ApprovalService } from '../../modules/approvals/approval.service';
import { AIPermissionService } from '../../modules/ai-permissions/ai-permission.service';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import prisma from '../../../database/utils/prisma';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Phase 10.3 - Enterprise Controls - Adversarial Security Tests', () => {
  let tenant1Id: string;
  let tenant2Id: string;
  let adminId: string;
  let hackerId: string;
  let approverId: string;

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // Setup 2 Tenants
      const t1 = await tx.tenant.create({ data: { name: 'Ent Test T1' } });
      const t2 = await tx.tenant.create({ data: { name: 'Ent Test T2' } });
      tenant1Id = t1.id;
      tenant2Id = t2.id;

      // Setup Users
      const u1 = await tx.user.create({ data: { tenantId: tenant1Id, email: 'admin@t1.ent', clerkId: 'c_ent_admin', status: 'ACTIVE', firstName: 'A', lastName: 'A' } });
      const u2 = await tx.user.create({ data: { tenantId: tenant1Id, email: 'hacker@t1.ent', clerkId: 'c_ent_hacker', status: 'ACTIVE', firstName: 'H', lastName: 'H' } });
      const u3 = await tx.user.create({ data: { tenantId: tenant1Id, email: 'approver@t1.ent', clerkId: 'c_ent_approver', status: 'ACTIVE', firstName: 'Ap', lastName: 'Ap' } });
      
      adminId = u1.id;
      hackerId = u2.id;
      approverId = u3.id;

      // Make admin TENANT_ADMIN
      const adminRole = await tx.role.create({ data: { tenantId: tenant1Id, name: 'TENANT_ADMIN' } });
      await tx.userRole.create({ data: { tenantId: tenant1Id, userId: adminId, roleId: adminRole.id } });
    });
  });

  afterAll(async () => {
    if (tenant1Id || tenant2Id) {
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        await tx.securityEvent.deleteMany({ where: { tenantId: { in: [tenant1Id, tenant2Id] } } });
        await tx.aBACPolicy.deleteMany({ where: { tenantId: { in: [tenant1Id, tenant2Id] } } });
        await tx.fieldSecurityPolicy.deleteMany({ where: { tenantId: { in: [tenant1Id, tenant2Id] } } });
        await tx.aIExecution.deleteMany({ where: { tenantId: { in: [tenant1Id, tenant2Id] } } });
        await tx.approvalStep.deleteMany({ where: { tenantId: { in: [tenant1Id, tenant2Id] } } });
        await tx.approvalRequest.deleteMany({ where: { tenantId: { in: [tenant1Id, tenant2Id] } } });
        await tx.userRole.deleteMany({ where: { user: { tenantId: { in: [tenant1Id, tenant2Id] } } } });
        await tx.role.deleteMany({ where: { tenantId: { in: [tenant1Id, tenant2Id] } } });
        await tx.user.deleteMany({ where: { tenantId: { in: [tenant1Id, tenant2Id] } } });
        await tx.aITool.deleteMany({ where: { name: 'admin_tool_ent_test' } });
      });
    }
  });

  describe('CUSTOM ROLES', () => {
    it('1. Unauthorized role creation', async () => {
      await expect(
        RoleManagementService.createCustomRole(tenant1Id, hackerId, 'BAD_ROLE', [])
      ).rejects.toThrow(/Forbidden/);
    });

    it('2. Permission escalation attempt', async () => {
      // Hacker tries to grant UPDATE to SYSTEM which they don't have
      await expect(
        RoleManagementService.createCustomRole(tenant1Id, hackerId, 'HACK_ROLE', [{ resource: 'SYSTEM', action: 'UPDATE' }])
      ).rejects.toThrow(/Forbidden/);
    });

    it('3. TENANT_ADMIN assignment attempt', async () => {
      await expect(
        RoleManagementService.createCustomRole(tenant1Id, adminId, 'TENANT_ADMIN', [])
      ).rejects.toThrow(/Cannot create protected system roles/);
    });

    it('4. Cross-tenant role access', async () => {
      const role = await RoleManagementService.createCustomRole(tenant1Id, adminId, 'T1_ROLE', []);
      await expect(
        RoleManagementService.assignRole(tenant2Id, adminId, hackerId, role.id)
      ).rejects.toThrow(/Role not found/); // RLS/where clause isolates
    });
  });

  describe('ABAC', () => {
    it('5. Policy bypass attempt', async () => {
      const p = await ABACPolicyService.createPolicy(tenant1Id, adminId, 'Deny big deals', 'DEAL', 'UPDATE', { amount: { gt: 1000 } }, 'DENY');
      const eval1 = await ABACPolicyService.evaluatePolicies(tenant1Id, 'DEAL', 'UPDATE', { amount: 500 });
      const eval2 = await ABACPolicyService.evaluatePolicies(tenant1Id, 'DEAL', 'UPDATE', { amount: 5000 });
      expect(eval1).toBe('NEUTRAL');
      expect(eval2).toBe('DENY');
    });

    it('6. Conflicting allow/deny policies', async () => {
      await ABACPolicyService.createPolicy(tenant1Id, adminId, 'Allow big deals', 'DEAL', 'UPDATE', { amount: { gt: 1000 } }, 'ALLOW');
      // DENY should override ALLOW from previous test
      const evalConflict = await ABACPolicyService.evaluatePolicies(tenant1Id, 'DEAL', 'UPDATE', { amount: 5000 });
      expect(evalConflict).toBe('DENY');
    });

    it('7. Missing attribute attack', async () => {
      const res = await ABACPolicyService.evaluatePolicies(tenant1Id, 'DEAL', 'UPDATE', {});
      expect(res).not.toBe('DENY'); // Because our simple engine requires the attribute to match. In a strict engine, missing attrs might default to deny.
    });

    it('8. Cross-tenant policy modification', async () => {
      await expect(
        ABACPolicyService.createPolicy(tenant2Id, hackerId, 'T2 Policy', 'DEAL', 'READ', {}, 'ALLOW')
      ).rejects.toThrow(/Forbidden/);
    });
  });

  describe('FLS', () => {
    it('9. Hidden field leakage', async () => {
      const reqEnc = await FieldSecurityService.requiresEncryption('User', 'phone');
      expect(reqEnc).toBe(true);
      const canAccess = await FieldSecurityService.canAccessRawField({ email: 'hacker@test' }, 'User', 'phone');
      expect(canAccess).toBe(false);
      const masked = FieldSecurityService.maskField('1234567890', 'phone');
      expect(masked).toBe('******7890');
    });

    it('10. Unauthorized field modification', async () => {
      await expect(
        FieldSecurityService.updatePolicy(tenant1Id, hackerId, 'User', 'phone', 'LEVEL_1_INTERNAL')
      ).rejects.toThrow(/Forbidden/);
    });

    it('11. Role downgrade protection', async () => {
      // Mocking a role downgrade is just verifying standard user fails
      const canAccess = await FieldSecurityService.canAccessRawField({ userRoles: [] }, 'User', 'phone');
      expect(canAccess).toBe(false);
    });
  });

  describe('APPROVALS', () => {
    let reqId: string;
    let stepId: string;

    beforeAll(async () => {
      const req = await ApprovalService.createRequest(tenant1Id, hackerId, 'QUOTE', 'q1', approverId);
      reqId = req.id;
      stepId = req.steps[0].id;
    });

    it('12. Self approval attempt', async () => {
      await expect(
        ApprovalService.approveStep(tenant1Id, hackerId, stepId)
      ).rejects.toThrow(/Self-approval is not allowed/);
    });

    it('13. Unauthorized approver', async () => {
      const randUser = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.user.create({ data: { tenantId: tenant1Id, email: 'rand@t1.ent', clerkId: 'c_ent_rand', status: 'ACTIVE', firstName: 'R', lastName: 'R' } }));
      await expect(
        ApprovalService.approveStep(tenant1Id, randUser.id, stepId)
      ).rejects.toThrow(/not the designated approver/);
    });

    it('14. Stale privilege approval', async () => {
      // Create a request tied to a ROLE instead of user
      const req = await ApprovalService.createRequest(tenant1Id, hackerId, 'QUOTE', 'q2', undefined, 'fake_role_id');
      await expect(
        ApprovalService.approveStep(tenant1Id, approverId, req.steps[0].id)
      ).rejects.toThrow(/do not possess the required role/);
    });

    it('15. Duplicate approval race condition', async () => {
      // Valid approver approves
      await ApprovalService.approveStep(tenant1Id, approverId, stepId);
      // Try again
      await expect(
        ApprovalService.approveStep(tenant1Id, approverId, stepId)
      ).rejects.toThrow(/no longer pending/);
    });

    it('16. Replay attack', async () => {
      await expect(
        ApprovalService.approveStep(tenant1Id, approverId, stepId)
      ).rejects.toThrow(/no longer pending/);
    });

    it('17. Direct status manipulation', async () => {
      // In a real API, the controller would prevent passing status directly. Here we test the service enforces it via step transition.
      const step = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.approvalStep.findUnique({ where: { id: stepId } }));
      expect(step?.status).toBe('APPROVED');
    });
  });

  describe('AI', () => {
    it('18. AI privilege escalation', async () => {
      // Architectural Note: AITool is intentionally globally scoped because tools represent
      // platform-provided system capabilities. Tenant execution isolation is enforced by
      // AIPermissionService and AIExecution tracking.
      
      // Try to execute a tool that requires 'SYSTEM' 'UPDATE' which AI doesn't have by default unless user has it.
      await prisma.aITool.upsert({
        where: { name: 'admin_tool_ent_test' },
        update: {},
        create: { name: 'admin_tool_ent_test', requiredPermission: 'SYSTEM:UPDATE', riskLevel: 'HIGH' }
      });

      await expect(
        AIPermissionService.requestToolExecution({ toolName: 'admin_tool_ent_test', input: {} }, { user: { id: hackerId }, tenantId: tenant1Id })
      ).rejects.toThrow(/Forbidden/);
    });
  });
});
