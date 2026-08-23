import prisma from '../../../../database/utils/prisma';
import { withTenantTransaction } from '../../../../database/utils/prisma-tenant';
import { SecurityEventService } from '../../security-events/security-event.service';
import { checkPermissionFast } from '../../../lib/auth';
import { Action, Resource } from '@prisma/client';

export class RoleManagementService {
  /**
   * Validates if the requesting admin has the permissions they are trying to grant.
   * Escalation protection: You cannot grant a permission you do not have.
   */
  private static async validateDelegationAuthority(tenantId: string, adminId: string, permissions: Array<{ resource: Resource; action: Action }>) {
    // 1. Is the user TENANT_ADMIN? They have implicit all rights.
    const isAdmin = await checkPermissionFast(adminId, 'SYSTEM', 'UPDATE');
    if (isAdmin) return true;

    // 2. If not an admin, they must explicitly possess every single permission they are trying to grant.
    for (const perm of permissions) {
      const hasPerm = await checkPermissionFast(adminId, perm.resource, perm.action);
      if (!hasPerm) {
        return false;
      }
    }
    return true;
  }

  static async createCustomRole(tenantId: string, adminId: string, name: string, permissions: Array<{ resource: Resource; action: Action }>) {
    // 0. Base Authorization
    const canManageRoles = await checkPermissionFast(adminId, 'SYSTEM', 'UPDATE');
    if (!canManageRoles) {
      throw new Error('Forbidden: You do not have permission to manage roles');
    }

    // 1. Authorization
    if (name === 'TENANT_ADMIN' || name === 'GLOBAL_ADMIN') {
      throw new Error('Forbidden: Cannot create protected system roles');
    }

    const hasDelegationAuth = await this.validateDelegationAuthority(tenantId, adminId, permissions);
    if (!hasDelegationAuth) {
      await SecurityEventService.logEvent(tenantId, {
        eventType: 'SUSPICIOUS_ACTIVITY', severity: 'HIGH', source: 'RoleManagement', metadata: { name, permissions }
      }, 'USER', adminId);
      throw new Error('Forbidden: Privilege escalation attempt blocked');
    }

    // 2. Resolve Permission IDs
    const permRecords = await prisma.permission.findMany({
      where: {
        OR: permissions.map(p => ({ resource: p.resource, action: p.action }))
      }
    });

    if (permRecords.length !== permissions.length) {
      throw new Error('Invalid permissions specified');
    }

    // 3. Mutation & Audit
    const role = await prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      const newRole = await tx.role.create({
        data: {
          tenantId,
          name,
          permissions: {
            create: permRecords.map(p => ({ permissionId: p.id, tenantId }))
          }
        }
      });
      await tx.auditLog.create({
        data: {
          tenantId, actorId: adminId, actorType: 'USER', action: 'CREATE_ROLE',
          resource: 'SYSTEM', resourceId: newRole.id,
          metadata: { name, permissions }
        }
      });
      return newRole;
    });

    return role;
  }

  static async assignRole(tenantId: string, adminId: string, targetUserId: string, roleId: string) {
    // 1. Fetch Role
    const role = await prisma.role.findFirst({ where: { id: roleId, tenantId, deletedAt: null } });
    if (!role) throw new Error('Role not found');

    // 2. Authorization
    if (role.name === 'TENANT_ADMIN') {
      // Only existing TENANT_ADMIN can assign TENANT_ADMIN
      const isSuper = await checkPermissionFast(adminId, 'SYSTEM', 'UPDATE');
      if (!isSuper) {
        await SecurityEventService.logEvent(tenantId, {
          eventType: 'SUSPICIOUS_ACTIVITY', severity: 'CRITICAL', source: 'RoleManagement', metadata: { roleId, targetUserId }
        }, 'USER', adminId);
        throw new Error('Forbidden: Cannot assign TENANT_ADMIN');
      }
    } else {
      const hasAuth = await checkPermissionFast(adminId, 'SYSTEM', 'UPDATE'); // Minimum right to manage roles
      if (!hasAuth) throw new Error('Forbidden: Requires role management permission');
    }

    // 3. Mutation & Audit
    await prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      await tx.userRole.create({
        data: { tenantId, userId: targetUserId, roleId }
      });
      await tx.auditLog.create({
        data: {
          tenantId, actorId: adminId, actorType: 'USER', action: 'ASSIGN_ROLE',
          resource: 'USER', resourceId: targetUserId,
          metadata: { roleId }
        }
      });
    });
  }
}
