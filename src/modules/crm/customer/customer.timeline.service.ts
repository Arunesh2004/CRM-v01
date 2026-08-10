import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { UnifiedTimelineItem, UnifiedTimelineType } from '../crm.types';

export async function getCustomerTimeline({
  customerId,
  cursor,
  limit = 50
}: {
  customerId: string;
  cursor?: string;
  limit?: number;
}) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('CUSTOMER', 'READ');

  const prisma = withTenant(tenantId);
  const events: UnifiedTimelineItem[] = [];

  // Currently we fetch all and sort in memory, since merging heterogeneous 
  // paginated sources across different tables is complex via purely SQL.
  // We'll limit the lookback for very large datasets, or fetch the last X from each and merge.
  // For R.14.1, we'll fetch recent activities (up to 200 from each) to safely merge and paginate.
  
  // 1. Fetch Tasks
  const tasks = await prisma.task.findMany({
    where: { tenantId, customerId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { assignedUser: { select: { email: true } } }
  });
  for (const t of tasks) {
    events.push({
      id: t.id,
      type: 'TASK',
      title: t.title,
      description: t.description || `Status: ${t.status}`,
      actor: { name: t.assignedUser?.email || 'Unassigned' },
      timestamp: t.createdAt.toISOString(),
      metadata: { status: t.status, dueDate: t.dueDate }
    });
  }

  // 2. Fetch Notes/System (ActivityTimeline)
  const activities = await prisma.activityTimeline.findMany({
    where: { tenantId, entityType: 'CUSTOMER', entityId: customerId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { actor: { select: { email: true } } }
  });
  for (const a of activities) {
    events.push({
      id: a.id,
      type: a.type === 'NOTE' ? 'NOTE' : 'SYSTEM',
      title: a.type === 'NOTE' ? 'Note Added' : 'System Event',
      description: a.content,
      actor: { name: a.actor.email },
      timestamp: a.createdAt.toISOString(),
    });
  }

  // 3. Fetch Calls
  const calls = await prisma.call.findMany({
    where: {
      tenantId,
      deletedAt: null,
      participants: { some: { contact: { customerId } } }
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  for (const c of calls) {
    events.push({
      id: c.id,
      type: 'CALL',
      title: `${c.direction} Call`,
      description: `Duration: ${c.durationSeconds || 0}s`,
      actor: { name: 'System' }, // Could fetch specific user if needed
      timestamp: c.createdAt.toISOString(),
      metadata: { status: c.status }
    });
  }

  // 4. Fetch Emails
  const emailThreads = await prisma.emailThread.findMany({
    where: { tenantId, customerId },
    include: { messages: { orderBy: { createdAt: 'desc' } } },
    take: 20
  });
  for (const t of emailThreads) {
    for (const m of t.messages) {
      events.push({
        id: m.id,
        type: 'EMAIL',
        title: t.subject,
        description: m.bodyText ? m.bodyText.substring(0, 100) + '...' : 'No content',
        actor: { name: m.from },
        timestamp: m.createdAt.toISOString(),
        metadata: { direction: m.direction, status: m.status }
      });
    }
  }

  // 5. Fetch Customer Messages (Exclude Internal)
  const conversations = await prisma.conversation.findMany({
    where: { 
      tenantId, 
      customerId, 
      deletedAt: null,
      type: { notIn: ['INTERNAL_DIRECT', 'INTERNAL_GROUP', 'INTERNAL_CHANNEL'] }
    },
    include: { messages: { include: { sender: { select: { email: true } } } } }
  });
  for (const c of conversations) {
    for (const m of c.messages) {
      events.push({
        id: m.id,
        type: 'MESSAGE',
        title: `Message in ${c.type}`,
        description: m.content,
        actor: { name: m.sender?.email || 'Customer' },
        timestamp: m.createdAt.toISOString(),
      });
    }
  }

  // Merge and Sort
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Cursor Pagination implementation in memory
  let paginatedEvents = events;
  if (cursor) {
    const cursorIndex = events.findIndex(e => e.id === cursor);
    if (cursorIndex >= 0) {
      paginatedEvents = events.slice(cursorIndex + 1);
    }
  }
  
  const hasMore = paginatedEvents.length > limit;
  const resultData = paginatedEvents.slice(0, limit);
  const nextCursor = hasMore ? resultData[resultData.length - 1].id : null;

  return {
    data: resultData,
    pagination: {
      nextCursor,
      hasMore
    }
  };
}
