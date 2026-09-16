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
   * Get all conversations for a user
   */
  static async getConversations(tenantId: string, userId: string) {
    const prisma = withTenant(tenantId);
    
    // RLS will ensure we only see tenant conversations
    const conversations = await prisma.chatConversation.findMany({
      where: {
        participants: {
          some: { userId }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // We can infer a nice name if it's a DIRECT chat without a name
    return conversations.map(c => {
      let computedName = c.name;
      let targetUserId: string | undefined;
      
      if (!computedName && c.type === 'DIRECT') {
        const other = c.participants.find(p => p.userId !== userId);
        if (other?.user) {
          computedName = `${other.user.firstName || ''} ${other.user.lastName || ''}`.trim() || other.user.email;
          targetUserId = other.user.id;
        }
      }
      
      return {
        id: c.id,
        type: c.type,
        name: computedName || 'Chat',
        participants: c.participants.map(p => p.userId),
        targetUserId // expose the other participant's ID for WebRTC initiation
      };
    });
  }

  /**
   * Send a message to a chat.
   * Verifies the sender is a participant in the conversation before creating the message.
   * All queries use withTenant(tenantId) to enforce RLS at the database level.
   */
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
