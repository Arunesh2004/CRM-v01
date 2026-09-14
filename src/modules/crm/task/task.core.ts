import { Prisma } from '@prisma/client';
import { CreateTaskInput } from '../crm.types';
import { requireRelationOwnership } from '@/lib/auth/relation-auth';
import { EventBus } from '../../core/events/event-bus';
import { NotificationService } from '../../notifications/notification.service';
import { NotificationType } from '@prisma/client';

export class TaskCore {
   
   
  static async createTask(tx: Prisma.TransactionClient, tenantId: string, actorId: string, input: CreateTaskInput) {
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
      await NotificationService.queueNotification(tx, {
        tenantId,
        userId: input.assignedUserId,
        type: NotificationType.SYSTEM,
        title: 'Task Assigned',
        body: `You have been assigned to task: ${task.title}`,
        actionUrl: `/tasks`
      });
    }

    return task;
  }
}
