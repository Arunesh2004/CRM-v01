import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
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
  const calls = await prisma.callLog.findMany({
    where: {
      tenantId,
      // For legacy bridge, assume receiverEmployeeId matches customer ID or similar timeline hook
      receiverEmployeeId: customerId 
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  for (const c of calls) {
    events.push({
      id: c.id,
      type: 'CALL',
      title: `Call (${c.provider})`,
      description: `Duration: ${c.duration || 0}s`,
      actor: { name: 'System' },
      timestamp: c.createdAt.toISOString(),
      metadata: { status: c.status }
    });
  }

  // 4. Email timeline
  const mailThreads = await prisma.mailThread.findMany({
    where: { tenantId, customerId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sender: { select: { email: true } } }
      }
    }
  });
  for (const mt of mailThreads) {
    if (mt.messages.length > 0) {
      const latestMsg = mt.messages[0];
      events.push({
        id: mt.id,
        type: 'EMAIL',
        title: `Email: ${mt.subject}`,
        description: latestMsg.bodyText?.substring(0, 100) || latestMsg.bodyHtml?.substring(0, 100) || 'Email thread',
        actor: { name: latestMsg.sender?.email || 'Unknown' },
        timestamp: mt.createdAt.toISOString(),
      });
    }
  }

  // 5. Chat message timeline
  const chatConversations = await prisma.chatConversation.findMany({
    where: { tenantId, customerId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sender: { select: { email: true } } }
      }
    }
  });
  for (const chat of chatConversations) {
    if (chat.messages.length > 0) {
      const latestMsg = chat.messages[0];
      events.push({
        id: chat.id,
        type: 'MESSAGE',
        title: chat.name ? `Chat: ${chat.name}` : `Chat Conversation`,
        description: latestMsg.content,
        actor: { name: latestMsg.sender?.email || 'Unknown' },
        timestamp: chat.createdAt.toISOString(),
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
