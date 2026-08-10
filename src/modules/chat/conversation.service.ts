import { withTenant } from '@/../database/utils/prisma-tenant';
import { requireAuth, requireTenant } from '@/lib/auth';
import { verifyConversationAccess } from './chat.permissions';

export class ConversationService {
  static async createDirectConversation(targetUserId: string) {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    const prisma = withTenant(tenantId);

    // Verify target user is in the same tenant
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, tenantId }
    });
    if (!targetUser) throw new Error("User not found in tenant");

    // Check if direct conversation already exists
    const existing = await prisma.conversation.findFirst({
      where: {
        tenantId,
        type: 'INTERNAL_DIRECT',
        members: {
          every: {
            userId: { in: [user.id, targetUserId] }
          }
        }
      },
      include: { members: true }
    });

    if (existing && existing.members.length === 2) {
      return existing;
    }

    return await prisma.conversation.create({
      data: {
        tenantId,
        type: 'INTERNAL_DIRECT',
        createdBy: user.id,
        members: {
          create: [
            { tenantId, userId: user.id, role: 'ADMIN' },
            { tenantId, userId: targetUserId, role: 'MEMBER' }
          ]
        }
      },
      include: { members: true }
    });
  }

  static async createGroupConversation(name: string, memberIds: string[]) {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    const prisma = withTenant(tenantId);

    // Ensure creator is in the list
    const finalMemberIds = Array.from(new Set([user.id, ...memberIds]));

    const users = await prisma.user.findMany({
      where: { id: { in: finalMemberIds }, tenantId }
    });

    if (users.length !== finalMemberIds.length) {
      throw new Error("One or more users not found in tenant");
    }

    return await prisma.conversation.create({
      data: {
        tenantId,
        type: 'INTERNAL_GROUP',
        name,
        createdBy: user.id,
        members: {
          create: finalMemberIds.map(id => ({
            tenantId,
            userId: id,
            role: id === user.id ? 'ADMIN' : 'MEMBER'
          }))
        }
      },
      include: { members: true }
    });
  }

  static async createChannel(name: string) {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    const prisma = withTenant(tenantId);

    return await prisma.conversation.create({
      data: {
        tenantId,
        type: 'INTERNAL_CHANNEL',
        name,
        createdBy: user.id,
        members: {
          create: [
            { tenantId, userId: user.id, role: 'ADMIN' }
          ]
        }
      },
      include: { members: true }
    });
  }

  static async addMember(conversationId: string, targetUserId: string) {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    const prisma = withTenant(tenantId);

    // Check if current user is an admin in the conversation
    const currentMember = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: user.id } }
    });
    if (currentMember?.role !== 'ADMIN') throw new Error("Only admins can add members");

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, tenantId }
    });
    if (!conversation || conversation.type === 'INTERNAL_DIRECT') {
      throw new Error("Cannot add members to this conversation");
    }

    return await prisma.conversationMember.create({
      data: {
        tenantId,
        conversationId,
        userId: targetUserId,
        role: 'MEMBER'
      }
    });
  }

  static async removeMember(conversationId: string, targetUserId: string) {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    const prisma = withTenant(tenantId);

    if (user.id !== targetUserId) {
      const currentMember = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId, userId: user.id } }
      });
      if (currentMember?.role !== 'ADMIN') throw new Error("Only admins can remove members");
    }

    return await prisma.conversationMember.delete({
      where: {
        conversationId_userId: { conversationId, userId: targetUserId }
      }
    });
  }

  static async getUserConversations(cursor?: string, limit = 50) {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    const prisma = withTenant(tenantId);

    const take = Math.min(limit, 100) + 1;

    const conversations = await prisma.conversation.findMany({
      where: {
        tenantId,
        members: {
          some: { userId: user.id }
        }
      },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        members: {
          include: { user: { select: { email: true, id: true } } }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    let nextCursor: string | null = null;
    if (conversations.length > Math.min(limit, 100)) {
      const nextItem = conversations.pop();
      nextCursor = nextItem?.id || null;
    }

    const data = conversations.map(c => ({
      ...c,
      unreadCount: 0 // Placeholder for unread count
    }));

    return {
      conversations: data,
      nextCursor
    };
  }
}
