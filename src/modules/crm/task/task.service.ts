import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import { CreateTaskInput, UpdateTaskInput } from '../crm.types';
import { assertRelationOwnership } from '@/lib/security/tenant-guard';
import { EventBus } from '../../core/events/event-bus';
import { QueryParams, PaginatedResponse } from '../../core/types';
import globalPrisma from '@db/utils/prisma';

export async function createTask(input: CreateTaskInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('TASK', 'CREATE');

  const relationsToAssert: {model: string, id: string}[] = [];
  if (input.assignedUserId) relationsToAssert.push({ model: 'user', id: input.assignedUserId });
  if (input.leadId) relationsToAssert.push({ model: 'lead', id: input.leadId });
  if (input.customerId) relationsToAssert.push({ model: 'customer', id: input.customerId });

  if (relationsToAssert.length > 0) {
    await assertRelationOwnership(relationsToAssert, tenantId);
  }

  const prisma = withTenant(tenantId);
  return await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    const task = await tx.task.create({
      data: {
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        priority: input.priority || 'MEDIUM',
        assignedUserId: input.assignedUserId,
        leadId: input.leadId,
        customerId: input.customerId,
        tenantId
      }
    });
    
    await tx.activityTimeline.create({
      data: {
        tenantId,
        type: 'SYSTEM',
        content: `Task created: ${task.title}`,
        actorId: user.id,
        entityType: 'TASK',
        entityId: task.id
      }
    });

    if (input.assignedUserId) {
      EventBus.emit('task.assigned', { tenantId, taskId: task.id, assigneeId: input.assignedUserId, title: task.title });
    }

    return task;
  });
}

export async function getTasks(params?: QueryParams & {
  priority?: string;
  customerId?: string;
  leadId?: string;
  dueDateStart?: Date;
  dueDateEnd?: Date;
}): Promise<PaginatedResponse<any>> {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('TASK', 'READ');

  const prisma = withTenant(tenantId);
  const limit = params?.limit || 50;
  
  const where: any = { deletedAt: null, tenantId };
  
  if (params?.search) {
    where.title = { contains: params.search, mode: 'insensitive' };
  }
  
  if (params?.filters) {
    if (params.filters.status) where.status = params.filters.status;
    if (params.filters.assignedUserId) where.assignedUserId = params.filters.assignedUserId;
  }

  if (params?.priority) where.priority = params.priority;
  if (params?.customerId) where.customerId = params.customerId;
  if (params?.leadId) where.leadId = params.leadId;
  
  if (params?.dueDateStart || params?.dueDateEnd) {
    where.dueDate = {};
    if (params.dueDateStart) where.dueDate.gte = params.dueDateStart;
    if (params.dueDateEnd) where.dueDate.lte = params.dueDateEnd;
  }

  // Allowlist sortBy to prevent dynamic key injection; Prisma rejects unknown keys
  // with a runtime error (not SQL injection), but the error message could leak schema details.
  const TASK_SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title', 'status']);
  const safeSortBy = TASK_SORT_FIELDS.has(params?.sortBy || '') ? params!.sortBy! : 'createdAt';
  const safeSortOrder = params?.sortOrder === 'asc' ? 'asc' : 'desc';

  const tasks = await prisma.task.findMany({
    where,
    take: limit + 1,
    ...(params?.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    orderBy: {
      [safeSortBy]: safeSortOrder
    },
    include: {
      assignedUser: { select: { id: true, email: true } },
      customer: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true, company: true } }
    }
  });

  const hasMore = tasks.length > limit;
  const data = hasMore ? tasks.slice(0, -1) : tasks;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return {
    data,
    pagination: {
      nextCursor,
      hasMore
    }
  };
}

export async function getTaskById(taskId: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('TASK', 'READ');

  const prisma = withTenant(tenantId);

  const [task, activities, comments] = await Promise.all([
    prisma.task.findFirst({
      where: { id: taskId, tenantId, deletedAt: null },
      include: {
        assignedUser: { select: { id: true, email: true } },
        customer: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true, company: true } }
      }
    }),
    prisma.activityTimeline.findMany({
      where: { tenantId, entityType: 'TASK', entityId: taskId },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, email: true } } }
    }),
    prisma.cRMComment.findMany({
      where: { tenantId, entityType: 'TASK', entityId: taskId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true } } }
    })
  ]);

  if (!task) return null;

  return { ...task, activities, comments };
}

export async function updateTask(input: UpdateTaskInput) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('TASK', 'UPDATE');

  const prisma = withTenant(tenantId);
  
  return await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    const task = await tx.task.findFirst({ where: { id: input.id, tenantId }});
    if (!task) throw new Error('Task not found');
    
    const updateResult = await tx.task.updateMany({
      where: { 
        id: input.id, 
        tenantId,
        updatedAt: task.updatedAt // Optimistic Concurrency Control
      },
      data: {
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        dueDate: input.dueDate,
        assignedUserId: input.assignedUserId
      }
    });

    if (updateResult.count === 0) {
      throw new Error('CONCURRENCY_CONFLICT: The task was modified by another user. Please refresh and try again.');
    }

    
    if (input.status && input.status !== task.status) {
      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'SYSTEM',
          content: `Task status updated from ${task.status} to ${input.status}`,
          actorId: user.id,
          entityType: 'TASK',
          entityId: input.id
        }
      });
      EventBus.emit('task.status_changed', { tenantId, taskId: input.id, status: input.status, title: input.title || task.title });
    }

    if (input.assignedUserId && input.assignedUserId !== task.assignedUserId) {
       await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'SYSTEM',
          content: `Task reassigned`,
          actorId: user.id,
          entityType: 'TASK',
          entityId: input.id
        }
      });
      EventBus.emit('task.assigned', { tenantId, taskId: input.id, assigneeId: input.assignedUserId, title: input.title || task.title });
    }

    return tx.task.findFirst({ where: { id: input.id, tenantId }});
  });
}

export async function getTaskWorkloadMetrics() {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('USER', 'READ'); // Requires higher permission for workload

  const prisma = withTenant(tenantId);
  
  // Find all active users in tenant
  const users = await prisma.user.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, email: true }
  });

  const now = new Date();
  
  // Aggregate tasks by user
  const groupedTasks = await prisma.task.groupBy({
    by: ['assignedUserId', 'status'],
    where: { tenantId, deletedAt: null },
    _count: { id: true }
  });

  // Get overdue tasks
  const overdueTasks = await prisma.task.groupBy({
    by: ['assignedUserId'],
    where: { 
      tenantId, 
      deletedAt: null, 
      status: { not: 'COMPLETED' },
      dueDate: { lt: now } 
    },
    _count: { id: true }
  });

  const metrics = users.map(u => {
    const userGroups = groupedTasks.filter(g => g.assignedUserId === u.id);
    const active = userGroups.filter(g => g.status !== 'COMPLETED').reduce((acc, curr) => acc + curr._count.id, 0);
    const completed = userGroups.filter(g => g.status === 'COMPLETED').reduce((acc, curr) => acc + curr._count.id, 0);
    const overdue = overdueTasks.find(o => o.assignedUserId === u.id)?._count.id || 0;
    const total = active + completed;
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      user: u,
      active,
      completed,
      overdue,
      completionPercentage
    };
  });

  return metrics;
}
