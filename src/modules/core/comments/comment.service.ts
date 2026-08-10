import { withTenant } from '@/../database/utils/prisma-tenant';
import { requireAuth, requireTenant } from '@/lib/auth';
import { EntityType } from '@prisma/client';
import { EventBus } from '@/modules/core/events/event-bus';
import { verifyEntityAccess } from '@/lib/auth/entity-access';

const DEFAULT_LIMIT = 50;

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export async function createCRMComment(
  entityType: EntityType,
  entityId: string,
  content: string,
  parentId?: string
) {
  const user = await requireAuth();
  const tenantId = await requireTenant();

  await verifyEntityAccess(tenantId, entityType, entityId);

  const prisma = withTenant(tenantId);
  const comment = await prisma.cRMComment.create({
    data: {
      tenantId,
      userId: user.id,
      entityType,
      entityId,
      content,
      parentId
    },
    include: { user: { select: { id: true, email: true } } }
  });

  await EventBus.emit('COMMENT_ADDED', {
    tenantId,
    actorId: user.id,
    entityType,
    entityId,
    commentId: comment.id,
    content,
    parentId
  });

  return comment;
}

// ---------------------------------------------------------------------------
// Read (cursor-paginated, top-level comments + nested replies)
// ---------------------------------------------------------------------------
export async function getCRMComments(
  entityType: EntityType,
  entityId: string,
  cursor?: string,
  limit: number = DEFAULT_LIMIT
) {
  // requireAuth MUST precede requireTenant — fixes the audit blocker
  await requireAuth();
  const tenantId = await requireTenant();

  await verifyEntityAccess(tenantId, entityType, entityId);

  const prisma = withTenant(tenantId);

  // Fetch top-level comments only (parentId IS NULL) with cursor pagination
  const take = limit + 1; // fetch one extra to determine hasMore
  const topLevelComments = await prisma.cRMComment.findMany({
    where: {
      tenantId,
      entityType,
      entityId,
      parentId: null, // top-level only
      deletedAt: null,
      ...(cursor ? { id: { lt: cursor } } : {}) // cursor: older than cursor id (desc order)
    },
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      user: { select: { id: true, email: true } },
      replies: {
        where: { deletedAt: null },
        include: { user: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  const hasMore = topLevelComments.length > limit;
  const data = hasMore ? topLevelComments.slice(0, limit) : topLevelComments;
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

  return { data, hasMore, nextCursor };
}

// ---------------------------------------------------------------------------
// Update (edit — author only)
// ---------------------------------------------------------------------------
export async function updateCRMComment(commentId: string, content: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  const comment = await prisma.cRMComment.findFirst({
    where: { id: commentId, tenantId, deletedAt: null }
  });
  if (!comment) throw new Error('Comment not found');
  if (comment.userId !== user.id) throw new Error('Unauthorized: Only the author can edit a comment');

  await verifyEntityAccess(tenantId, comment.entityType, comment.entityId);

  const updated = await prisma.cRMComment.update({
    where: { id: commentId },
    data: { content, updatedAt: new Date() },
    include: { user: { select: { id: true, email: true } } }
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Delete (soft delete — author only)
// ---------------------------------------------------------------------------
export async function deleteCRMComment(commentId: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  const comment = await prisma.cRMComment.findFirst({
    where: { id: commentId, tenantId, deletedAt: null }
  });
  if (!comment) throw new Error('Comment not found');
  if (comment.userId !== user.id) throw new Error('Unauthorized: Only the author can delete a comment');

  await verifyEntityAccess(tenantId, comment.entityType, comment.entityId);

  await prisma.cRMComment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() }
  });

  return { success: true };
}
