import { withTenant } from '@db/utils/prisma-tenant';
import { ActorType } from '@prisma/client';
import { Logger } from '@/lib/logger/logger';

export type AuditLogPayload = {
  tenantId: string;
  actorId: string;
  actorType?: ActorType;
  action: string;
  resource: string;
  resourceId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  metadata?: any;
  ipAddress?: string;
};

export async function createAuditLog(payload: AuditLogPayload) {
  try {
    await withTenant(payload.tenantId).auditLog.create({
      data: {
        tenantId: payload.tenantId,
        actorId: payload.actorId,
        actorType: payload.actorType || ActorType.USER,
        action: payload.action,
        resource: payload.resource,
        resourceId: payload.resourceId,
        metadata: payload.metadata || {},
        ipAddress: payload.ipAddress,
      },
    });
  } catch (error) {
    // Log failure but don't crash the main transaction
    Logger.error('[AUDIT_LOG_ERROR]', error);
  }
}
