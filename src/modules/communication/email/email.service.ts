import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '../../../../database/utils/prisma-tenant';
import { ProviderFactory } from '@/lib/providers/provider.factory';
import { CreateEmailInput } from '../communication.types';
import { getCurrentUserContext } from '@/lib/tenant-context';

export async function sendEmail(input: CreateEmailInput) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('COMMUNICATION', 'CREATE');
  const user = await getCurrentUserContext();
  
  const prisma = withTenant(tenantId);
  const provider = ProviderFactory.getEmailProvider();
  
  const response = await provider.sendEmail(input.to, input.subject, input.bodyHtml);
  if (!response.success) {
    throw new Error('Email provider failed');
  }
  
  return await prisma.$transaction(async (tx: any) => {
    const thread = await tx.emailThread.create({
      data: {
        tenantId,
        subject: input.subject,
        customerId: input.customerId
      }
    });
    
    const msg = await tx.emailMessage.create({
      data: {
        tenantId,
        threadId: thread.id,
        direction: 'OUTBOUND',
        from: 'system@crm.com',
        to: input.to,
        bodyHtml: input.bodyHtml,
        sentAt: new Date()
      }
    });

    if (input.customerId) {
      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'EMAIL',
          content: `Sent email: ${input.subject}`,
          actorId: user.id,
          entityType: 'CUSTOMER',
          entityId: input.customerId,
        }
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'EMAIL_SENT',
        resource: 'COMMUNICATION',
        resourceId: msg.id
      }
    });

    return msg;
  });
}
