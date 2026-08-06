import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '../../../../database/utils/prisma-tenant';
import { ProviderFactory } from '@/lib/providers/provider.factory';
import { CreateMessageInput } from '../communication.types';
import { getCurrentUserContext } from '@/lib/tenant-context';

export async function sendMessage(input: CreateMessageInput) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('COMMUNICATION', 'CREATE');
  const user = await getCurrentUserContext();
  
  const prisma = withTenant(tenantId);
  const provider = ProviderFactory.getMessagingProvider();
  
  const conversation = await prisma.conversation.findUnique({ where: { id: input.conversationId } });
  if (!conversation) throw new Error('Conversation not found');

  if (conversation.type === 'WHATSAPP') {
    const response = await provider.sendMessage('placeholder_to', input.content);
    if (!response.success) throw new Error('Messaging provider failed');
  }
  
  return await prisma.$transaction(async (tx: any) => {
    const msg = await tx.message.create({
      data: {
        tenantId,
        conversationId: input.conversationId,
        senderId: user.id,
        content: input.content
      }
    });

    if (conversation.customerId) {
      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'NOTE', // Using NOTE since MESSAGE isn't in TimelineType enum currently
          content: `Sent message in conversation`,
          actorId: user.id,
          entityType: 'CUSTOMER',
          entityId: conversation.customerId,
        }
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'MESSAGE_SENT',
        resource: 'COMMUNICATION',
        resourceId: msg.id
      }
    });

    return msg;
  });
}
