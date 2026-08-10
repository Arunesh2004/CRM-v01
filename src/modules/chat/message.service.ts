import { withTenant } from '@/../database/utils/prisma-tenant';
import { requireAuth, requireTenant } from '@/lib/auth';
import { verifyConversationAccess } from './chat.permissions';
import { publishChatEvent } from './chat.events';
import { ProviderFactory } from '@/infrastructure/provider.factory';
import { ChatProvider } from '@/infrastructure/chat/chat.interface';
import { MessageType } from '@prisma/client';

export class MessageService {
  static async getMessages(conversationId: string, cursor?: string, limit = 50) {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    const prisma = withTenant(tenantId);

    await verifyConversationAccess(tenantId, user.id, conversationId);

    const messages = await prisma.message.findMany({
      where: {
        tenantId,
        conversationId,
        deletedAt: null
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, email: true } },
        attachments: true,
        mentions: { include: { user: { select: { id: true, email: true } } } }
      }
    });

    let nextCursor: string | undefined = undefined;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem?.id;
    }

    // Reverse to send oldest first on the client usually, but for a paginated API desc is often returned and reversed client-side.
    return { data: messages, nextCursor };
  }

  static async sendMessage(conversationId: string, content: string, messageType: MessageType = 'TEXT', mentions: string[] = []) {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    const prisma = withTenant(tenantId);

    await verifyConversationAccess(tenantId, user.id, conversationId);

    const message = await prisma.message.create({
      data: {
        tenantId,
        conversationId,
        senderId: user.id,
        content,
        messageType,
        status: 'SENT',
        mentions: {
          create: mentions.map(userId => ({
            tenantId,
            userId
          }))
        }
      },
      include: {
        sender: { select: { id: true, email: true } },
        mentions: true
      }
    });

    const provider = (await ProviderFactory.getForTenant('INTERNAL_CHAT')) as ChatProvider;
    await provider.sendMessage({
      conversationId: message.conversationId,
      senderId: message.senderId || 'SYSTEM',
      content: message.content,
      metadata: { mentions, messageId: message.id }
    });

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    await publishChatEvent('MESSAGE_SENT', message);

    return message;
  }

  static async editMessage(messageId: string, newContent: string) {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    const prisma = withTenant(tenantId);

    const existing = await prisma.message.findUnique({ where: { id: messageId, tenantId } });
    if (!existing) throw new Error("Message not found");
    if (existing.senderId !== user.id) throw new Error("Only the sender can edit this message");

    const message = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: newContent,
        editedAt: new Date()
      },
      include: {
        sender: { select: { id: true, email: true } }
      }
    });

    await publishChatEvent('MESSAGE_EDITED', message);
    return message;
  }

  static async deleteMessage(messageId: string) {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    const prisma = withTenant(tenantId);

    const existing = await prisma.message.findUnique({ where: { id: messageId, tenantId } });
    if (!existing) throw new Error("Message not found");
    if (existing.senderId !== user.id) throw new Error("Only the sender can delete this message");

    const message = await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() }
    });

    await publishChatEvent('MESSAGE_DELETED', message);
    return message;
  }
}
