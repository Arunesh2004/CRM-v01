import { Prisma } from '@prisma/client';
import prisma from './prisma';

export const withTenant = (tenantId: string) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenantScopedModels = [
            'User', 'DeviceSession', 'Role', 'AuditLog', 'TenantIntegration',
            'Lead', 'Customer', 'CustomerContact', 'Location', 'Task',
            'CRMComment', 'ActivityTimeline', 'Call', 'CallParticipant',
            'CallRecording', 'CallTranscript', 'AISummary', 'Meeting',
            'MeetingParticipant', 'DemoStorage', 'EmailThread', 'EmailMessage',
            'EmailAttachment', 'Conversation', 'ConversationMember', 'Message',
            'MessageMention', 'MessageAttachment', 'MessageReadStatus',
            'Notification', 'NotificationPreference', 'Subscription', 'Invoice',
            'Payment', 'PaymentCustomer', 'UsageEvent', 'Camera', 'CameraCredential',
            'CameraStream', 'Recording', 'CameraEvent', 'AIEvent', 'WebhookEvent',
            'Incident', 'RecoveryJob', 'RecoverySnapshot', 'RecoveryAuditLog',
            'RestoreCheckpoint', 'Pipeline', 'PipelineStage', 'Deal',
            'DealStageHistory', 'EventOutbox'
          ];

          if (!tenantScopedModels.includes(model)) {
            return query(args);
          }

          if (operation === 'create' || operation === 'createMany') {
             if (args.data) {
                if (Array.isArray(args.data)) {
                   args.data = (args.data as any[]).map(d => ({ ...d, tenantId }));
                } else {
                   args.data = { ...(args.data as any), tenantId };
                }
             }
          }

          if (operation === 'update' || operation === 'updateMany') {
             if (args.data && 'tenantId' in (args.data as any)) {
                if ((args.data as any).tenantId !== tenantId) {
                   throw new Error('Tenant ID is immutable');
                }
             }
          }

          if (['findUnique', 'findUniqueOrThrow'].includes(operation)) {
             const newArgs = JSON.parse(JSON.stringify(args));
             newArgs.where = { ...newArgs.where, tenantId };
             return (prisma[model as Uncapitalize<typeof model>] as any)[operation === 'findUnique' ? 'findFirst' : 'findFirstOrThrow'](newArgs);
          }

          if (['update', 'delete'].includes(operation)) {
             const record = await (prisma[model as Uncapitalize<typeof model>] as any).findFirst({
               where: { ...(args as any).where, tenantId }
             });
             if (!record) {
                throw new Error('Record not found or access denied');
             }
             return query(args);
          }

          if (['findFirst', 'findFirstOrThrow', 'findMany', 'updateMany', 'deleteMany', 'aggregate', 'count', 'groupBy'].includes(operation)) {
             (args as any).where = { ...(args as any).where, tenantId };
          }

          return query(args);
        }
      }
    }
  });
};
