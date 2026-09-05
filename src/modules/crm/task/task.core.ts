import { CreateTaskInput } from '../crm.types';
import { requireRelationOwnership } from '@/lib/auth/relation-auth';
import { EventBus } from '../../core/events/event-bus';

export class TaskCore {
  static async createTask(tx: any, tenantId: string, actorId: string, input: CreateTaskInput) {
    await requireRelationOwnership(tx, tenantId, {
      user: input.assignedUserId,
      lead: input.leadId,
      customer: input.customerId,
    });

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
        actorId: actorId,
        entityType: 'TASK',
        entityId: task.id
      }
    });

    if (input.assignedUserId) {
      EventBus.emit('task.assigned', { tenantId, taskId: task.id, assigneeId: input.assignedUserId, title: task.title });
    }

    return task;
  }
}
