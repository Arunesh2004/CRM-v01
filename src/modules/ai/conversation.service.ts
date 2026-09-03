import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import prisma from '@db/utils/prisma';
import { AIConfig } from '@/lib/config/ai.config';
import { Logger } from '@/lib/logger/logger';
import { AIRole, AIConversationStatus, AIConversation, AIConversationMessage } from '@prisma/client';

export class ConversationService {
  /**
   * Retrieves an owned conversation. Returns null if missing or not owned by user/tenant.
   */
  static async getOwnedConversation(tenantId: string, userId: string, conversationId: string): Promise<AIConversation | null> {
    const conversation = await withTenant(tenantId).aIConversation.findUnique({
      where: { id: conversationId }
    });
    
    if (!conversation || conversation.tenantId !== tenantId || conversation.userId !== userId) {
      return null;
    }
    
    return conversation;
  }

  /**
   * Creates a new conversation bounded by tenant and user.
   */
  static async createConversation(tenantId: string, userId: string, title?: string): Promise<AIConversation> {
    // Determine title: sanitize and truncate if provided
    let safeTitle = null;
    if (title && typeof title === 'string') {
      safeTitle = title.replace(/[\r\n]+/g, ' ').substring(0, 80);
    }
    
    const conv = await withTenant(tenantId).aIConversation.create({
      data: {
        tenantId,
        userId,
        title: safeTitle,
        status: AIConversationStatus.ACTIVE
      }
    });
    Logger.info('AI Conversation Created', { event: 'AI_CONVERSATION_CREATED', conversationId: conv.id, tenantId, userId });
    return conv;
  }

  /**
   * Lists conversations owned by the user using deterministic bounded limits.
   */
  static async listOwnedConversations(tenantId: string, userId: string, limit: number = AIConfig.MAX_CONVERSATION_LIST_LIMIT, cursor?: string): Promise<AIConversation[]> {
    const takeAmount = Math.min(limit, AIConfig.MAX_CONVERSATION_LIST_LIMIT);
    return withTenant(tenantId).aIConversation.findMany({
      where: { tenantId, userId, status: AIConversationStatus.ACTIVE },
      take: takeAmount,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: [
        { createdAt: 'desc' },
        { id: 'asc' }
      ]
    });
  }

  /**
   * Lists archived conversations owned by the user.
   */
  static async listArchivedConversations(tenantId: string, userId: string, limit: number = AIConfig.MAX_CONVERSATION_LIST_LIMIT, cursor?: string): Promise<AIConversation[]> {
    const takeAmount = Math.min(limit, AIConfig.MAX_CONVERSATION_LIST_LIMIT);
    return withTenant(tenantId).aIConversation.findMany({
      where: { tenantId, userId, status: AIConversationStatus.ARCHIVED },
      take: takeAmount,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: [
        { createdAt: 'desc' },
        { id: 'asc' }
      ]
    });
  }

  /**
   * Archives a conversation manually.
   */
  static async archiveConversation(tenantId: string, userId: string, conversationId: string): Promise<AIConversation | null> {
    const conv = await this.getOwnedConversation(tenantId, userId, conversationId);
    if (!conv || conv.status === AIConversationStatus.ARCHIVED) {
      return conv; // Already archived or not found
    }
    
    return withTenant(tenantId).aIConversation.update({
      where: { id: conversationId },
      data: {
        status: AIConversationStatus.ARCHIVED,
        archivedAt: new Date()
      }
    });
  }

  /**
   * Appends a message to a conversation. Validates ownership and counts.
   * Returns a structured error object if limits are exceeded or unauthorized.
   */
  static async addMessage(
    tenantId: string, 
    userId: string, 
    conversationId: string, 
    role: AIRole, 
    content: string
  ): Promise<{ success: boolean; error?: string; message?: AIConversationMessage }> {
    
    // 1. Verify content constraints
    if (!content || typeof content !== 'string') {
      return { success: false, error: 'Invalid content type.' };
    }
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return { success: false, error: 'Message content cannot be empty.' };
    }
    
    // Convert string sizes safely via buffer length
    const byteSize = Buffer.byteLength(trimmedContent, 'utf8');
    if (byteSize > AIConfig.MAX_MESSAGE_SIZE_BYTES) {
      return { success: false, error: `Message exceeds maximum allowed size of ${AIConfig.MAX_MESSAGE_SIZE_BYTES} bytes.` };
    }

    // 2. Load and verify ownership
    const conv = await this.getOwnedConversation(tenantId, userId, conversationId);
    if (!conv) {
      return { success: false, error: 'Conversation not found or access denied.' };
    }
    if (conv.status !== AIConversationStatus.ACTIVE) {
      return { success: false, error: 'Cannot add message to an inactive conversation.' };
    }

    // 3. Verify conversation bounds via aggregation
    const countQuery = withTenant(tenantId).aIConversationMessage.count({
      where: { conversationId, tenantId }
    });
    
    // Approximate byte size aggregation by doing sum of lengths
    const messages = await withTenant(tenantId).aIConversationMessage.findMany({
      where: { conversationId, tenantId },
      select: { content: true } // Minimal payload to compute size safely
    });

    const currentCount = messages.length;
    let totalBytes = 0;
    for (const msg of messages) {
      totalBytes += Buffer.byteLength(msg.content, 'utf8');
    }

    if (currentCount >= AIConfig.MAX_MESSAGES_PER_CONVERSATION) {
      return { success: false, error: 'Conversation limit reached. Please start a new chat.' };
    }
    if (totalBytes + byteSize > AIConfig.MAX_CONVERSATION_SIZE_BYTES) {
      return { success: false, error: 'Conversation size limit reached. Please start a new chat.' };
    }

    // 4. Proceed with insertion inside a try-catch for DB safety
    try {
      const message = await withTenant(tenantId).aIConversationMessage.create({
        data: {
          conversationId,
          tenantId,
          role,
          content: trimmedContent
        }
      });
      return { success: true, message };
    } catch (err) {
      Logger.error('Failed to append message to conversation', err as Error, { category: 'database' });
      return { success: false, error: 'Failed to persist message securely.' };
    }
  }

  /**
   * Retrieves conversation messages using bounded pagination to avoid memory leaks.
   */
  static async getConversationMessages(
    tenantId: string, 
    userId: string, 
    conversationId: string, 
    limit: number = AIConfig.MAX_HISTORY_MESSAGES, 
    cursor?: string
  ): Promise<AIConversationMessage[]> {
    
    // Validate ownership before returning ANY messages
    const conv = await this.getOwnedConversation(tenantId, userId, conversationId);
    if (!conv) {
      return [];
    }

    const takeAmount = Math.min(limit, AIConfig.MAX_HISTORY_MESSAGES + 50); // Hard limit sanity check
    
    return withTenant(tenantId).aIConversationMessage.findMany({
      where: { conversationId, tenantId },
      take: takeAmount,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: [
        { createdAt: 'desc' }, // Latest first for context sliding window
        { id: 'asc' } // Deterministic tie-breaker
      ]
    });
  }
}
