const fs = require('fs');
let content = fs.readFileSync('src/modules/crm/task/task.service.ts', 'utf8');

content = content.replace(
  "import { EventBus } from '../../core/events/event-bus';",
  "import { EventBus } from '../../core/events/event-bus';\nimport { NotificationService } from '../../notifications/notification.service';\nimport { NotificationType } from '@prisma/client';"
);

content = content.replace(
  "EventBus.emit('task.status_changed', { tenantId, taskId: input.id, status: input.status, title: input.title || task.title });",
  `if (task.assignedUserId || input.assignedUserId) {
        await NotificationService.queueNotification(tx, {
          tenantId,
          userId: input.assignedUserId || task.assignedUserId!,
          type: NotificationType.SYSTEM,
          title: 'Task Status Updated',
          body: \`Task \${input.title || task.title} was moved to \${input.status}\`,
          actionUrl: \`/tasks\`
        });
      }`
);

content = content.replace(
  "EventBus.emit('task.assigned', { tenantId, taskId: input.id, assigneeId: input.assignedUserId, title: input.title || task.title });",
  `await NotificationService.queueNotification(tx, {
        tenantId,
        userId: input.assignedUserId,
        type: NotificationType.SYSTEM,
        title: 'Task Reassigned',
        body: \`You have been assigned to task: \${input.title || task.title}\`,
        actionUrl: \`/tasks\`
      });`
);

fs.writeFileSync('src/modules/crm/task/task.service.ts', content);
