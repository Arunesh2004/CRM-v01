import { Prisma } from '@prisma/client';
import prisma from './prisma';

export const withTenantTransaction = async <T = any>(tx: T, tenantId: string): Promise<T> => {
  await (tx as any).$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', '${tenantId}', true)`);
  return tx;
};

export const withTenant = (tenantId: string) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const rlsModels = [
            'User', 'Customer', 'CustomerContact', 'Lead', 'Deal',
            'Task', 'Incident', 'Camera', 'AIEvent', 'ChatMessage',
            'MailMessage', 'Document', 'AuditLog', 'SecurityEvent',
            'AIExecution', 'Ticket', 'TicketMessage', 'SLAConfiguration', 'SLAEvent',
            'ActivityTimeline', 'CallLog'
          ];
          
          const tenantScopedModels = [
            'User', 'DeviceSession', 'Role', 'AuditLog', 'TenantIntegration',
            'Lead', 'Customer', 'CustomerContact', 'Location', 'Task',
            'CRMComment', 'ActivityTimeline', 'Call', 'CallParticipant', 'CallLog',
            'CallRecording', 'CallTranscript', 'AISummary', 'Meeting',
            'MeetingParticipant', 'DemoStorage', 'EmailThread', 'EmailMessage',
            'EmailAttachment', 'Conversation', 'ConversationMember', 'Message',
            'MessageMention', 'MessageAttachment', 'MessageReadStatus',
            'Notification', 'NotificationPreference', 'Subscription', 'Invoice',
            'Payment', 'PaymentCustomer', 'UsageEvent', 'Camera', 'CameraCredential',
            'CameraStream', 'Recording', 'CameraEvent', 'AIEvent', 'WebhookEvent',
            'Incident', 'RecoveryJob', 'RecoverySnapshot', 'RecoveryAuditLog',
            'RestoreCheckpoint', 'Pipeline', 'PipelineStage', 'Deal',
            'DealStageHistory', 'EventOutbox', 'AIConversation', 'AIConversationMessage',
            'SecurityEvent', 'AIExecution', 'Ticket', 'TicketMessage',
            'SLAConfiguration', 'SLAEvent'
          ];

          if (!tenantScopedModels.includes(model)) {
            return query(args);
          }

          let modifiedArgs = args ? ({ ...args } as any) : {};

          if (operation === 'create' || operation === 'createMany') {
             if (modifiedArgs.data) {
                if (Array.isArray(modifiedArgs.data)) {
                   modifiedArgs.data = modifiedArgs.data.map((d: any) => ({ ...d, tenantId }));
                } else {
                   modifiedArgs.data = { ...modifiedArgs.data, tenantId };
                }
             }
          }

          if (operation === 'update' || operation === 'updateMany') {
             if (modifiedArgs.data && 'tenantId' in (modifiedArgs.data as any)) {
                if ((modifiedArgs.data as any).tenantId !== tenantId) {
                   throw new Error('Tenant ID is immutable');
                }
             }
          }

          if (['findFirst', 'findFirstOrThrow', 'findMany', 'updateMany', 'deleteMany', 'aggregate', 'count', 'groupBy'].includes(operation)) {
             modifiedArgs.where = { ...(modifiedArgs.where || {}), tenantId };
          }
          
          if (['findUnique', 'findUniqueOrThrow'].includes(operation)) {
             modifiedArgs.where = { ...(modifiedArgs.where || {}), tenantId };
             const actualOp = operation === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
             
             if (rlsModels.includes(model)) {
               return prisma.$transaction(async (tx) => {
                 await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', '${tenantId}', true)`);
                 return (tx[model as Uncapitalize<typeof model>] as any)[actualOp](modifiedArgs);
               });
             }
             return (prisma[model as Uncapitalize<typeof model>] as any)[actualOp](modifiedArgs);
          }

          if (rlsModels.includes(model)) {
            // For standalone queries, start an interactive transaction
            return prisma.$transaction(async (tx) => {
              await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', '${tenantId}', true)`);
              
              if (['update', 'delete'].includes(operation)) {
                 const record = await (tx[model as Uncapitalize<typeof model>] as any).findFirst({
                   where: { ...(modifiedArgs.where || {}), tenantId }
                 });
                 if (!record) {
                    throw new Error('Record not found or access denied');
                 }
                 return (tx[model as Uncapitalize<typeof model>] as any)[operation](modifiedArgs);
              }
              
              return (tx[model as Uncapitalize<typeof model>] as any)[operation](modifiedArgs);
            });
          }

          if (['update', 'delete'].includes(operation)) {
             const record = await (prisma[model as Uncapitalize<typeof model>] as any).findFirst({
               where: { ...(modifiedArgs.where || {}), tenantId }
             });
             if (!record) {
                throw new Error('Record not found or access denied');
             }
             return (prisma[model as Uncapitalize<typeof model>] as any)[operation](modifiedArgs);
          }

          // Fallback for non-RLS standalone models
          return (prisma[model as Uncapitalize<typeof model>] as any)[operation](modifiedArgs);
        }
      }
    }
  });
};
