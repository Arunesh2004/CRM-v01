import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { assertValidTenantId } from './tenant-id';

export const withTenantTransaction = async <T = any>(tx: T, tenantId: string): Promise<T> => {
  assertValidTenantId(tenantId);
  await (tx as any).$queryRawUnsafe(`SELECT set_config('app.current_tenant_id', '${tenantId}', true)`);
  return tx;
};

export const withTenant = (tenantId: string) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenantScopedModels = [
            // === Core CRM ===
            'User', 'DeviceSession', 'Role', 'AuditLog', 'TenantIntegration',
            'Lead', 'Customer', 'CustomerContact', 'Location', 'Task',
            'CRMComment', 'ActivityTimeline', 'Document', 'DocumentEmbedding', 'DocumentPermission',
            // === Communication ===
            'Call', 'CallParticipant', 'CallLog', 'CallRecording', 'CallTranscript', 'AISummary',
            'Meeting', 'MeetingParticipant', 'DemoStorage',
            'EmailThread', 'EmailMessage', 'EmailAttachment',
            'Conversation', 'ConversationMember', 'Message',
            'MessageMention', 'MessageAttachment', 'MessageReadStatus',
            'ChatConversation', 'ChatParticipant', 'ChatMessage', 'ChatReadReceipt',
            'MailThread', 'MailMessage', 'MailRecipient', 'MailDraft', 'CommunicationAttachment',
            'Notification', 'NotificationPreference',
            // === Security & Identity ===
            'Department', 'RolePermission', 'UserRole', 'UserPresence',
            'SecurityEvent', 'FieldSecurityPolicy', 'ABACPolicy',
            'ApprovalRequest', 'ApprovalStep',
            // === Finance & Revenue ===
            'Subscription', 'Invoice', 'Payment', 'PaymentCustomer', 'UsageEvent',
            'Product', 'ProductCategory', 'ProductFamily',
            'PriceBook', 'PriceBookEntry', 'DiscountRule',
            'Quote', 'QuoteLineItem',
            // === Sales Intelligence ===
            'Pipeline', 'PipelineStage', 'Deal', 'DealStageHistory', 'DealSnapshot',
            'Territory', 'UserTerritory', 'SalesQuota',
            // === CCTV / Monitoring ===
            'Camera', 'CameraCredential', 'CameraStream', 'Recording', 'CameraEvent',
            // === Incidents & Recovery ===
            'Incident', 'RecoveryJob', 'RecoverySnapshot', 'RecoveryAuditLog', 'RestoreCheckpoint',
            // === AI ===
            'AIEvent', 'AIConversation', 'AIConversationMessage',
            'AIExecution', 'AIAgentExecution', 'AIMemory', 'AIReference',
            'AIProviderConfig', 'AITokenUsage',
            // === Workflows & Automation ===
            'Workflow', 'WorkflowTrigger', 'WorkflowAction', 'WorkflowExecution', 'WorkflowExecutionStep',
            // === Events & Integration ===
            'WebhookEvent', 'EventOutbox', 'DeadLetterQueue',
            // === Support ===
            'Ticket', 'TicketMessage', 'SLAConfiguration', 'SLAEvent',
            // === Telephony ===
            'TenantPhoneNumber',
            //
            // ⚠️ IMPORTANT EXCEPTION — IdempotencyKey must NOT be in this list.
            //
            // The withTenant middleware wraps standalone mutations (create, update, delete)
            // in an independent prisma.$transaction() with set_config. For most models this
            // is fine. But IdempotencyKey is created INSIDE an outer transaction in worker.ts
            // (withJobContext). If IdempotencyKey were here, the middleware would wrap the
            // create in a NESTED independent transaction that commits even when the outer
            // transaction aborts — breaking retry-on-failure semantics.
            //
            // IdempotencyKey is still RLS-safe: worker.ts manually calls set_config('app.current_tenant_id')
            // inside the outer transaction before creating the key, so RLS is satisfied.
            //
            // Do NOT add IdempotencyKey here.
          ];
          
          const rlsModels = tenantScopedModels;

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
                 assertValidTenantId(tenantId);
                 await tx.$queryRawUnsafe(`SELECT set_config('app.current_tenant_id', '${tenantId}', true)`);
                 return (tx[model as Uncapitalize<typeof model>] as any)[actualOp](modifiedArgs);
               });
             }
             return (prisma[model as Uncapitalize<typeof model>] as any)[actualOp](modifiedArgs);
          }

          if (rlsModels.includes(model)) {
            // For standalone queries, start an interactive transaction
            return prisma.$transaction(async (tx) => {
              assertValidTenantId(tenantId);
              await tx.$queryRawUnsafe(`SELECT set_config('app.current_tenant_id', '${tenantId}', true)`);
              
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
