import prisma from '@/../database/utils/prisma';
import { requirePermissionFast } from '@/lib/auth';
import { Action, Resource } from '@prisma/client';
import { FieldSecurityService } from '../security/field-security/field-security.service';

export class TerritoryService {
  static async getTerritories(tenantId: string, userId: string) {
    await requirePermissionFast(userId, Resource.SALES_INTEL, Action.READ);
    const territories = await prisma.territory.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
    return Promise.all(territories.map(t => FieldSecurityService.maskFields(tenantId, userId, 'Territory', t)));
  }

  /**
   * Create a territory securely.
   */
  static async createTerritory(userId: string, tenantId: string, data: { name: string; description?: string; parentId?: string }) {
    await requirePermissionFast(userId, Resource.SALES_INTEL, Action.MANAGE_TERRITORIES);

    // Validate hierarchy loop if parentId is provided
    if (data.parentId) {
      const parent = await prisma.territory.findUnique({ where: { id: data.parentId } });
      if (!parent || parent.tenantId !== tenantId) {
        throw new Error('Invalid parent territory');
      }
    }

    const territory = await prisma.territory.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        parentId: data.parentId,
      },
    });

    // Write audit
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: userId,
        actorType: 'USER',
        action: 'TERRITORY_CREATED',
        resource: 'Territory',
        resourceId: territory.id,
        metadata: { name: territory.name, parentId: territory.parentId },
      },
    });

    return territory;
  }

  /**
   * Update a territory securely.
   */
  static async updateTerritory(userId: string, tenantId: string, territoryId: string, data: { name?: string; description?: string; parentId?: string }) {
    await requirePermissionFast(userId, Resource.SALES_INTEL, Action.MANAGE_TERRITORIES);

    const territory = await prisma.territory.findUnique({ where: { id: territoryId } });
    if (!territory || territory.tenantId !== tenantId) {
      throw new Error('Territory not found');
    }

    // Prevent circular reference
    if (data.parentId) {
      if (data.parentId === territoryId) {
         throw new Error('Circular hierarchy not allowed');
      }
      const parent = await prisma.territory.findUnique({ where: { id: data.parentId } });
      if (!parent || parent.tenantId !== tenantId) {
        throw new Error('Invalid parent territory');
      }
      // Simple loop check: ensure the new parent isn't a child of this territory
      let currentParentId = parent.parentId;
      while (currentParentId) {
        if (currentParentId === territoryId) throw new Error('Circular hierarchy not allowed');
        const nextParent = await prisma.territory.findUnique({ where: { id: currentParentId } });
        currentParentId = nextParent?.parentId || null;
      }
    }

    const updated = await prisma.territory.update({
      where: { id: territoryId },
      data,
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: userId,
        actorType: 'USER',
        action: 'TERRITORY_UPDATED',
        resource: 'Territory',
        resourceId: territory.id,
      },
    });

    return updated;
  }

  /**
   * Assign a user to a territory securely.
   */
  static async assignUser(userId: string, tenantId: string, data: { targetUserId: string; territoryId: string; role?: string }) {
    await requirePermissionFast(userId, Resource.SALES_INTEL, Action.MANAGE_TERRITORIES);

    const territory = await prisma.territory.findUnique({ where: { id: data.territoryId } });
    if (!territory || territory.tenantId !== tenantId) {
      throw new Error('Territory not found');
    }

    const assignment = await prisma.userTerritory.create({
      data: {
        tenantId,
        userId: data.targetUserId,
        territoryId: data.territoryId,
        role: data.role || 'REP',
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: userId,
        actorType: 'USER',
        action: 'TERRITORY_ASSIGNMENT_CREATED',
        resource: 'UserTerritory',
        resourceId: assignment.id,
        metadata: { assignedUserId: data.targetUserId, territoryId: data.territoryId },
      },
    });

    return assignment;
  }

  /**
   * Remove a user from a territory securely.
   */
  static async removeAssignment(userId: string, tenantId: string, assignmentId: string) {
    await requirePermissionFast(userId, Resource.SALES_INTEL, Action.MANAGE_TERRITORIES);

    const assignment = await prisma.userTerritory.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.tenantId !== tenantId) {
      throw new Error('Assignment not found');
    }

    await prisma.userTerritory.delete({ where: { id: assignmentId } });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: userId,
        actorType: 'USER',
        action: 'TERRITORY_ASSIGNMENT_DELETED',
        resource: 'UserTerritory',
        resourceId: assignmentId,
      },
    });

    return true;
  }

  /**
   * Read territory safely.
   */
  static async getTerritory(userId: string, tenantId: string, territoryId: string) {
    await requirePermissionFast(userId, Resource.SALES_INTEL, Action.READ);
    return prisma.territory.findFirst({
      where: { id: territoryId, tenantId },
      include: { children: true, userTerritories: true }
    });
  }
}
