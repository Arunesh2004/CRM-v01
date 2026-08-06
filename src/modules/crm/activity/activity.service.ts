import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { CreateTimelineEntryInput } from '../crm.types';

export async function createTimelineEntry(input: CreateTimelineEntryInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  
  await requirePermission('SYSTEM', 'READ'); // Base internal permission

  const prisma = withTenant(tenantId);
  
  return await prisma.activityTimeline.create({
    data: {
      type: input.type,
      content: input.content,
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: user.id,
      tenantId
    }
  });
}
