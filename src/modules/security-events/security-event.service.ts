import globalPrisma from '@db/utils/prisma';
import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { CreateSecurityEventInput, SecurityEventFilterParams } from './types';
import { SecurityEvent, ActorType } from '@prisma/client';

export class SecurityEventService {
  /**
   * Deeply sanitizes metadata to strip sensitive fields.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Intentional dynamic record for generic context
  private static sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;
    
    const sanitized = JSON.parse(JSON.stringify(metadata));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    const sensitiveKeys = ['password', 'token', 'apikey', 'api_key', 'secret', 'authorization', 'cookie'];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    const sanitizeNode = (node: any) => {
      if (!node || typeof node !== 'object') return;
      
      for (const key of Object.keys(node)) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          node[key] = '[REDACTED]';
        } else if (typeof node[key] === 'object') {
          sanitizeNode(node[key]);
        }
      }
    };

    sanitizeNode(sanitized);
    return sanitized;
  }

  /**
   * Logs a security event. Can be called by internal system (without auth context)
   * if tenantId is explicitly provided and auth is bypassed.
   * Creates a dual-write to both SecurityEvent (for monitoring) and AuditLog (for immutable compliance).
   */
  static async logEvent(
    tenantId: string,
    input: CreateSecurityEventInput,
    actorType: ActorType = 'SYSTEM',
    actorId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  ): Promise<SecurityEvent> {
    const sanitizedMetadata = this.sanitizeMetadata(input.metadata);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    return await globalPrisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);

      // 1. Create real-time security event
      const securityEvent = await tx.securityEvent.create({
        data: {
          tenantId,
          userId: input.userId,
          eventType: input.eventType,
          severity: input.severity,
          source: input.source,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          metadata: sanitizedMetadata
        }
      });

      // 2. Dual-write to immutable AuditLog
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: actorId || input.userId || 'SYSTEM',
          actorType,
          action: `SECURITY_EVENT_${input.eventType}`,
          resource: 'SECURITY_EVENT',
          resourceId: securityEvent.id,
          ipAddress: input.ipAddress,
          metadata: {
            ...sanitizedMetadata,
            severity: input.severity,
            source: input.source
          }
        }
      });

      return securityEvent;
    });
  }

  /**
   // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
   * Query security events with RBAC.
   * Admins can view HIGH/CRITICAL events, employees are restricted based on permissions.
   */
  static async getSecurityEvents(params: SecurityEventFilterParams) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('SECURITY_EVENT', 'READ');

    const prisma = withTenant(tenantId);
    const limit = params.limit || 50;

    // RBAC: Check if user has administrative rights for HIGH/CRITICAL events
    // Assuming 'UPDATE' permission on SECURITY_EVENT implies higher clearance.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
    // If they only have READ, restrict severity to LOW/MEDIUM.
    let canViewHighCritical = false;
    try {
       await requirePermission('SECURITY_EVENT', 'UPDATE');
       // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
       canViewHighCritical = true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
    } catch (e) {
       canViewHighCritical = false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    const where: any = { tenantId };

    if (!canViewHighCritical) {
       // Force query to only show lower severities if unauthorized for HIGH/CRITICAL
       where.severity = { in: ['LOW', 'MEDIUM'] };
    } else if (params.severity) {
       where.severity = params.severity;
    }

    if (params.eventType) where.eventType = params.eventType;
    if (params.startDate || params.endDate) {
       where.createdAt = {};
       if (params.startDate) where.createdAt.gte = params.startDate;
       if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const events = await prisma.securityEvent.findMany({
      where,
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' }
    });

    const hasMore = events.length > limit;
    const data = hasMore ? events.slice(0, -1) : events;
    
    return {
      data,
      pagination: {
        nextCursor: hasMore ? data[data.length - 1].id : null,
        hasMore
      }
    };
  }
}
