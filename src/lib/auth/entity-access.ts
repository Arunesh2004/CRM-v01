import { withTenant } from '@/../database/utils/prisma-tenant';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { EntityType, PrismaClient } from '@prisma/client';

export async function verifyEntityAccess(tenantId: string, entityType: EntityType, entityId: string) {
  // First ensure they are authenticated and have basic USER read permissions.
  // Realistically we might map EntityType to specific resources (e.g. DEAL -> DEAL, TASK -> TASK)
  // For now, we verify that the entity literally exists in the user's tenant.
  const prisma = withTenant(tenantId);
  
  switch (entityType) {
    case 'DEAL':
      await requirePermission('USER', 'READ');
      const deal = await prisma.deal.findFirst({ where: { id: entityId, tenantId, deletedAt: null } });
      if (!deal) throw new Error(`Access Denied: Deal ${entityId} not found or belongs to another tenant.`);
      return true;
      
    case 'TASK':
      await requirePermission('USER', 'READ');
      const task = await prisma.task.findFirst({ where: { id: entityId, tenantId, deletedAt: null } });
      if (!task) throw new Error(`Access Denied: Task ${entityId} not found or belongs to another tenant.`);
      return true;
      
    case 'LEAD':
      await requirePermission('USER', 'READ');
      const lead = await prisma.lead.findFirst({ where: { id: entityId, tenantId, deletedAt: null } });
      if (!lead) throw new Error(`Access Denied: Lead ${entityId} not found or belongs to another tenant.`);
      return true;
      
    case 'CUSTOMER':
      await requirePermission('USER', 'READ');
      const customer = await prisma.customer.findFirst({ where: { id: entityId, tenantId, deletedAt: null } });
      if (!customer) throw new Error(`Access Denied: Customer ${entityId} not found or belongs to another tenant.`);
      return true;

    // Expand logic for PROJECT, TICKET, INCIDENT when those modules are built
    default:
      // If we don't have explicit entity table mapping yet, we at least prevent access 
      // or implement generic fallbacks. For now we throw on unsupported types.
      throw new Error(`Entity type ${entityType} access validation not implemented.`);
  }
}
