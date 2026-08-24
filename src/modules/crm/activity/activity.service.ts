import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
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

export async function getActivities(params?: { actorId?: string, entityType?: string, entityId?: string, limit?: number, createdAtStart?: Date, createdAtEnd?: Date }) {
  const user = await requireAuth();
  const tenantId = await requireTenant();

  if (params?.actorId && params.actorId !== user.id) {
    await requirePermission('USER', 'READ');
  }

  const prisma = withTenant(tenantId);
  const limit = params?.limit || 20;

  const where: any = { tenantId };
  if (params?.actorId) {
    where.actorId = params.actorId;
  }

  if (params?.entityType) {
    where.entityType = params.entityType;
  }

  if (params?.entityId) {
    where.entityId = params.entityId;
  }

  if (params?.createdAtStart || params?.createdAtEnd) {
    where.createdAt = {};
    if (params.createdAtStart) where.createdAt.gte = params.createdAtStart;
    if (params.createdAtEnd) where.createdAt.lte = params.createdAtEnd;
  }

  return await prisma.activityTimeline.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { actor: { select: { id: true, email: true } } }
  });
}
