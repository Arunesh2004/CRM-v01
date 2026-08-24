import globalPrisma from '@db/utils/prisma';
import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { CreateSecurityEventInput, SecurityEventFilterParams } from './types';
import { SecurityEvent, AuditLog, ActorType, SecurityEventSeverity } from '@prisma/client';

export class SecurityEventService {
  /**
   * Deeply sanitizes metadata to strip sensitive fields.
   */
  private static sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;
    
    const sanitized = JSON.parse(JSON.stringify(metadata));
    const sensitiveKeys = ['password', 'token', 'apikey', 'api_key', 'secret', 'authorization', 'cookie'];

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
  ): Promise<SecurityEvent> {
    const sanitizedMetadata = this.sanitizeMetadata(input.metadata);

    return await globalPrisma.$transaction(async (baseTx: any) => {
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
   * Query security events with RBAC.
   * Admins can view HIGH/CRITICAL events, employees are restricted based on permissions.
   */
  static async getSecurityEvents(params: SecurityEventFilterParams) {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('SECURITY_EVENT', 'READ');

    const prisma = withTenant(tenantId);
    const limit = params.limit || 50;

    // RBAC: Check if user has administrative rights for HIGH/CRITICAL events
    // Assuming 'UPDATE' permission on SECURITY_EVENT implies higher clearance.
    // If they only have READ, restrict severity to LOW/MEDIUM.
    let canViewHighCritical = false;
    try {
       await requirePermission('SECURITY_EVENT', 'UPDATE');
       canViewHighCritical = true;
    } catch (e) {
       canViewHighCritical = false;
    }

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
