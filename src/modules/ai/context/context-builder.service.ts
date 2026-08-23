import { withTenant } from '../../../../database/utils/prisma-tenant';
import { SecurityEventService } from '../../../../src/modules/security-events/security-event.service';

export interface AIContext {
  user: {
    id: string;
    email: string;
    departmentId: string | null;
  };
  tenantId: string;
  userRoles: string[];
  permissions: string[];
  accessibleModules: string[];
  allowedTools: string[];
  restrictions: string[];
}

export class ContextBuilderService {
  /**
   * Builds the strict AI Context Object bound to the user's RBAC and RLS
   */
  static async buildUserContext(tenantId: string, userId: string): Promise<AIContext> {
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
        throw new Error('User not found');
      }

      const userRoles = user.userRoles.map((r: any) => r.role.name);
      
      const permissions: string[] = Array.from(new Set(
        user.userRoles.flatMap((r: any) => 
          r.role.permissions.map((p: any) => p.permission.name)
        )
      ));

      // Derive accessible modules based on permissions
      const accessibleModules = Array.from(new Set(
        permissions.map((p: any) => p.split(':')[0])
      ));

      // Fetch allowed tools based on permissions
      // E.g., if tool requires 'CRM:WRITE', user must have it.
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

      return {
        user: {
          id: user.id,
          email: user.email,
          departmentId: user.departmentId
        },
        tenantId,
        userRoles,
        permissions,
        accessibleModules,
        allowedTools,
        restrictions
      };
    } catch (error) {
      console.error('Failed to build AI context', error);
      throw error;
    }
  }
}
