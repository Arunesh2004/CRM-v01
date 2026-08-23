import prisma from '../../../database/utils/prisma';
import { withTenantTransaction } from '../../../database/utils/prisma-tenant';
import { SecurityEventService } from '../security-events/security-event.service';
import { checkPermissionFast } from '../../lib/auth';
import { Action, Resource } from '@prisma/client';
import { FieldSecurityService } from '../security/field-security/field-security.service';

export class ApprovalService {
  static async getPendingApprovals(tenantId: string, userId: string) {
    const approvals = await prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      return await tx.approvalRequest.findMany({
        where: { 
          tenantId, 
          steps: { some: { approverId: userId, status: 'PENDING' } }
        },
        include: {
          requester: true,
        },
        orderBy: { createdAt: 'desc' }
      });
    });
    return Promise.all(approvals.map(a => FieldSecurityService.maskFields(tenantId, userId, 'ApprovalRequest', a)));
  }

  /**
   * Creates an approval request and initial step.
   */
  static async createRequest(tenantId: string, requesterId: string, resource: string, resourceId: string, requiredApproverId?: string, requiredRoleId?: string) {
    return await prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      const request = await tx.approvalRequest.create({
        data: {
          tenantId,
          requesterId,
          resource,
          resourceId,
          status: 'PENDING',
          steps: {
            create: {
              tenantId,
              approverId: requiredApproverId,
              approverRoleId: requiredRoleId,
              status: 'PENDING'
            }
          }
        },
        include: { steps: true }
      });

      await tx.auditLog.create({
        data: {
          tenantId, actorId: requesterId, actorType: 'USER', action: 'CREATE_APPROVAL_REQUEST',
          resource, resourceId,
          metadata: { requestId: request.id }
        }
      });

      return request;
    });
  }

  /**
   * Approves a specific step in a request, enforcing security constraints dynamically.
   */
  static async approveStep(tenantId: string, approverId: string, stepId: string) {
    // We use a transaction to prevent duplicate approvals (race conditions)
    return await prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      // 1. Fetch step and lock the row using a raw query for FOR UPDATE (or rely on Prisma's sequential serializability if applicable, but explicit locking is safer).
      // Prisma doesn't support SELECT FOR UPDATE directly on generic queries without $queryRaw.
      const lockedStep = await tx.$queryRaw<any[]>`
        SELECT id, "status", "approvalRequestId", "approverId", "approverRoleId"
        FROM "ApprovalStep"
        WHERE id = ${stepId} AND "tenantId" = ${tenantId}
        FOR UPDATE
      `;

      if (!lockedStep || lockedStep.length === 0) {
        throw new Error('Approval step not found');
      }

      const step = lockedStep[0];

      if (step.status !== 'PENDING') {
        throw new Error('Approval step is no longer pending');
      }

      // Fetch the parent request to check for self-approval
      const request = await tx.approvalRequest.findUnique({ where: { id: step.approvalRequestId } });
      if (!request || request.status !== 'PENDING') {
        throw new Error('Approval request is not pending');
      }

      // 2. Self-Approval Protection
      if (request.requesterId === approverId) {
        await SecurityEventService.logEvent(tenantId, {
          eventType: 'SUSPICIOUS_ACTIVITY', severity: 'HIGH', source: 'ApprovalService', metadata: { stepId, requestId: request.id }
        }, 'USER', approverId);
        throw new Error('Forbidden: Self-approval is not allowed');
      }

      // 3. Stale Privilege & Identity Check
      if (step.approverId && step.approverId !== approverId) {
        throw new Error('Forbidden: You are not the designated approver for this step');
      }

      if (step.approverRoleId) {
        // Evaluate role at execution time
        const hasRole = await tx.userRole.findFirst({
          where: { userId: approverId, roleId: step.approverRoleId }
        });
        if (!hasRole) {
          await SecurityEventService.logEvent(tenantId, {
            eventType: 'SUSPICIOUS_ACTIVITY', severity: 'HIGH', source: 'ApprovalService', metadata: { stepId, missingRoleId: step.approverRoleId }
          }, 'USER', approverId);
          throw new Error('Forbidden: You do not possess the required role to approve this step');
        }
      } else if (!step.approverId) {
        // If neither approverId nor approverRoleId is set, we assume a generic APPROVAL admin right is required.
        const canApprove = await checkPermissionFast(approverId, 'SYSTEM' as Resource, 'APPROVE' as Action);
        if (!canApprove) {
          throw new Error('Forbidden: Requires generic approval permissions');
        }
      }

      // 4. Mutation
      await tx.approvalStep.update({
        where: { id: stepId },
        data: { status: 'APPROVED', actedAt: new Date() }
      });

      // Mark request as APPROVED if all steps are done (assuming 1-step logic for this prototype)
      const updatedRequest = await tx.approvalRequest.update({
        where: { id: request.id },
        data: { status: 'APPROVED' }
      });

      // 5. Audit
      await tx.auditLog.create({
        data: {
          tenantId, actorId: approverId, actorType: 'USER', action: 'APPROVE_STEP',
          resource: 'SYSTEM', resourceId: stepId,
          metadata: { requestId: request.id }
        }
      });

      return updatedRequest;
    });
  }
}
