import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '../../../../database/utils/prisma-tenant';
import { ProviderFactory } from '@/lib/providers/provider.factory';
import { CreateMessageInput } from '../communication.types';
import { getCurrentUserContext } from '@/lib/tenant-context';

export async function sendMessage(input: CreateMessageInput & { idempotencyKey?: string }) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('COMMUNICATION', 'CREATE');
  const user = await getCurrentUserContext();
  
  const prisma = withTenant(tenantId);
  // Concurrency-safe idempotency via DB unique constraint
  let msg: any = null;
  if (input.idempotencyKey) {
    try {
      msg = await prisma.message.create({
        data: {
          tenantId,
          conversationId: input.conversationId,
          senderId: user.id,
          content: input.content,
          status: 'QUEUED',
          idempotencyKey: input.idempotencyKey
        }
      });
    } catch (e: any) {
      if (e.code === 'P2002') { // Unique constraint violation
        const existing = await prisma.message.findFirst({
          where: { tenantId, idempotencyKey: input.idempotencyKey }
        });
        if (existing) return existing;
      }
      throw e;
    }
  } else {
    msg = await prisma.message.create({
      data: {
        tenantId,
        conversationId: input.conversationId,
        senderId: user.id,
        content: input.content,
        status: 'QUEUED'
      }
    });
  }

  const provider = ProviderFactory.getMessagingProvider();
  
  const conversation = await prisma.conversation.findFirst({
    where: { 
      id: input.conversationId,
      tenantId: tenantId
    },
    include: {
      customer: {
        include: {
          contacts: {
            where: { isPrimary: true }
          }
        }
      }
    }
  });

  if (!conversation) {
    throw new Error('Related entity does not belong to this tenant: Conversation');
  }

  // BUG-COM-001: Resolve real phone number
  let phoneNumber = 'unknown';
  if (conversation.customer && conversation.customer.contacts.length > 0) {
     phoneNumber = conversation.customer.contacts[0].phone || 'unknown';
  }
  
  if (phoneNumber === 'unknown') {
    throw new Error('No primary contact phone number found for SMS/WhatsApp');
  }

  // Send message natively to Provider
  let response;
  try {
    response = await provider.sendMessage(tenantId, { to: phoneNumber, type: 'text', text: input.content });
  } catch (err: any) {
    response = { success: false, error: err.message };
  }

  // BUG-COM-001: Set real status
  const messageStatus = response.success ? 'SENT' : 'FAILED';
  
  await prisma.message.update({
    where: { id: msg.id },
    data: { status: messageStatus }
  });

  if (conversation.customerId && messageStatus === 'SENT') {
    await prisma.activityTimeline.create({
      data: {
        tenantId,
        type: 'NOTE', 
        content: `Sent message in conversation`,
        actorId: user.id,
        entityType: 'CUSTOMER',
        entityId: conversation.customerId,
      }
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: user.id,
      actorType: 'USER',
      action: messageStatus === 'SENT' ? 'MESSAGE_SENT' : 'MESSAGE_FAILED',
      resource: 'COMMUNICATION',
      resourceId: msg.id
    }
  });

  return prisma.message.findUnique({ where: { id: msg.id } });
}

export async function getMessages(conversationId: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('COMMUNICATION', 'READ');
  const prisma = withTenant(tenantId);

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId }
  });

  if (!conversation) {
    throw new Error('Related entity does not belong to this tenant: Conversation');
  }

  return await prisma.message.findMany({
    where: { conversationId, tenantId },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getConversations() {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('COMMUNICATION', 'READ');
  const prisma = withTenant(tenantId);

  return await prisma.conversation.findMany({
    where: { tenantId },
    orderBy: { updatedAt: 'desc' }
  });
}
