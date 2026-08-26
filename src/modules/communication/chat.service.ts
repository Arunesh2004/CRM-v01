import { withTenant } from '../../../database/utils/prisma-tenant';
import { realtime } from './adapter';

export class ChatService {
  /**
   * Start a new chat or get an existing direct chat
   */
  static async startChat(tenantId: string, initiatorId: string, participantIds: string[], isGroup: boolean = false, name?: string) {
    const prisma = withTenant(tenantId);

    if (!isGroup && participantIds.length === 1) {
      // Check if direct chat already exists
      const existing = await prisma.chatConversation.findFirst({
        where: {
          type: 'DIRECT',
          participants: {
            every: {
              userId: { in: [initiatorId, participantIds[0]] }
            }
          }
        },
        include: { participants: true }
      });
      
      // Strict check that the length is exactly 2 for DIRECT
      if (existing && existing.participants.length === 2) {
        return existing;
      }
    }

    // Create new chat
    const conversation = await prisma.chatConversation.create({
      data: {
        tenantId,
        type: isGroup ? 'GROUP' : 'DIRECT',
        name,
        participants: {
          create: [
            { tenantId, userId: initiatorId, role: isGroup ? 'ADMIN' : 'MEMBER' },
            ...participantIds.map(id => ({ tenantId, userId: id, role: 'MEMBER' as const }))
          ]
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: initiatorId, actorType: 'USER',
        action: 'CHAT_CREATED',
        resource: 'COMMUNICATION',
        resourceId: conversation.id,
        metadata: { type: conversation.type, participants: participantIds }
      }
    });

    return conversation;
  }

  /**
   * Send a message to a chat.
   * Verifies the sender is a participant in the conversation before creating the message.
   * All queries use withTenant(tenantId) to enforce RLS at the database level.
   */
  static async sendMessage(tenantId: string, conversationId: string, senderId: string, content: string, metadata?: any) {
    const prisma = withTenant(tenantId);

    // Verify participation and tenant boundary
    // ChatParticipant is now RLS-protected; the withTenant context ensures the lookup
    // only returns rows belonging to this tenant.
    const participation = await prisma.chatParticipant.findFirst({
      where: { conversationId, userId: senderId }
    });

    if (!participation) {
      throw new Error('Not authorized to send messages in this conversation.');
    }

    const message = await prisma.chatMessage.create({
      data: {
        tenantId,
        conversationId,
        senderId,
        content,
        metadata: metadata ? metadata : undefined
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: senderId, actorType: 'USER',
        action: 'MESSAGE_SENT',
        resource: 'COMMUNICATION',
        resourceId: message.id,
        metadata: { conversationId }
      }
    });

    await realtime.publishToChannel(tenantId, conversationId, 'new_message', message);
    return message;
  }

  /**
   * Soft delete a message
   */
  static async deleteMessage(tenantId: string, messageId: string, userId: string) {
    const prisma = withTenant(tenantId);

    const message = await prisma.chatMessage.findFirst({
      where: { id: messageId }
    });

    if (!message || message.senderId !== userId) {
      throw new Error('Not authorized to delete this message.');
    }

    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        content: 'This message was deleted.',
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: userId, actorType: 'USER',
        action: 'MESSAGE_DELETED',
        resource: 'COMMUNICATION',
        resourceId: message.id
      }
    });

    await realtime.publishToChannel(tenantId, message.conversationId, 'message_deleted', { messageId });
    return updated;
  }

  /**
   * Get paginated messages
   */
  static async getMessages(tenantId: string, conversationId: string, userId: string, cursor?: string, take: number = 50) {
    const prisma = withTenant(tenantId);

    // Verify access — RLS enforces tenant boundary; participant check enforces conversation membership.
    const participation = await prisma.chatParticipant.findFirst({
      where: { conversationId, userId }
    });

    if (!participation) {
      throw new Error('Not authorized');
    }

    return await prisma.chatMessage.findMany({
      where: { conversationId },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        isDeleted: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true
          }
        }
      }
    });
  }
}
