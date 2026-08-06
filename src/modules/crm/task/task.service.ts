import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { CreateTaskInput, UpdateTaskInput } from '../crm.types';

export async function createTask(input: CreateTaskInput) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('TASK', 'CREATE');

  const prisma = withTenant(tenantId);
  return await prisma.task.create({
    data: {
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      assignedUserId: input.assignedUserId,
      leadId: input.leadId,
      customerId: input.customerId,
      tenantId
    }
  });
}

export async function getTasks() {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('TASK', 'READ');

  const prisma = withTenant(tenantId);
  return await prisma.task.findMany({
    where: { deletedAt: null }
  });
}

export async function updateTask(input: UpdateTaskInput) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('TASK', 'UPDATE');

  const prisma = withTenant(tenantId);
  
  await prisma.task.updateMany({
    where: { id: input.id, tenantId },
    data: {
      title: input.title,
      description: input.description,
      status: input.status,
    }
  });
  
  return prisma.task.findFirst({ where: { id: input.id, tenantId }});
}

export async function assignTask(taskId: string, newAssignedUserId: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('TASK', 'UPDATE');

  const prisma = withTenant(tenantId);

  return await prisma.$transaction(async (tx) => {
    const task = await tx.task.findFirst({ where: { id: taskId, tenantId }});
    if (!task) throw new Error('Task not found');

    await tx.task.updateMany({
      where: { id: taskId, tenantId },
      data: { assignedUserId: newAssignedUserId }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'TASK_ASSIGNMENT_CHANGED',
        resource: 'TASK',
        resourceId: taskId,
        metadata: { newAssignedUserId }
      }
    });
    
    return tx.task.findFirst({ where: { id: taskId, tenantId }});
  });
}
