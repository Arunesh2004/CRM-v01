import { Logger } from '@/lib/logger/logger';
import { withTenant } from '../../../../database/utils/prisma-tenant';
import { SecurityEventService } from '../../../../src/modules/security-events/security-event.service';

export interface AIContext {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly departmentId: string | null;
  };
  readonly tenantId: string;
  readonly userRoles: readonly string[];
  readonly permissions: readonly string[];
  readonly accessibleModules: readonly string[];
  readonly allowedTools: readonly string[];
  readonly restrictions: readonly string[];
}

export class ContextBuilderService {
  /**
   * Builds the strict AI Context Object bound to the user's RBAC and RLS.
   * This object represents an authenticated human actor.
   * The tenantId and userId MUST be derived from the trusted server-side request scope.
   */
  static async buildUserContext(tenantId: string, userId: string): Promise<AIContext> {
    if (!tenantId || !userId) {
      throw new Error('Unauthorized: Missing required trusted context identity');
    }

    try {
      const prisma = withTenant(tenantId);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          department: true,
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!user) {
        await SecurityEventService.logEvent(tenantId, { eventType: 'AI_PERMISSION_FAILURE', severity: 'HIGH', source: 'ContextBuilderService', metadata: { reason: 'User not found during context build' } }, 'USER', userId);
        throw new Error('Unauthorized: User not found in tenant');
      }

      const userRoles = user.userRoles.map((r: any) => r.role.name);
      
      const permissions: string[] = Array.from(new Set(
        user.userRoles.flatMap((r: any) => 
          r.role.permissions.map((p: any) => `${p.permission.resource}:${p.permission.action}`)
        )
      ));

      // Derive accessible modules based on permissions
      const accessibleModules = Array.from(new Set(
        permissions.map((p: any) => p.split(':')[0])
      ));

      // Fetch allowed tools based on permissions
      const tools = await prisma.aITool.findMany({});
      const allowedTools = tools
        .filter((t: any) => !t.requiredPermission || permissions.includes(t.requiredPermission))
        .map((t: any) => t.name);

      const restrictions = [];
      if (!permissions.includes('SYSTEM:ADMIN')) {
        restrictions.push('Cannot modify system configurations');
        restrictions.push('Cannot access billing information');
      }
      if (!permissions.includes('PII:VIEW')) {
        restrictions.push('Cannot access plain-text PII');
      }

      return Object.freeze({
        user: Object.freeze({
          id: user.id,
          email: user.email,
          departmentId: user.departmentId
        }),
        tenantId,
        userRoles: Object.freeze(userRoles),
        permissions: Object.freeze(permissions),
        accessibleModules: Object.freeze(accessibleModules),
        allowedTools: Object.freeze(allowedTools),
        restrictions: Object.freeze(restrictions)
      });
    } catch (error) {
      Logger.error('Failed to build AI context', { error: (error as any).message });
      // Fail closed: Do not expose internal lookup errors, but strictly deny access
      throw new Error('Unauthorized: Context build failed');
    }
  }
}
