'use server';

import { askAssistant } from '../assistant.service';
import { requireAuth, requireTenant } from '@/lib/auth';
import { AIConfig } from '@/lib/config/ai.config';
import { DistributedConcurrencyLock } from '@/lib/security/concurrency-lock';
import { ConversationService } from '../conversation.service';
import { AIRole } from '@prisma/client';
import { Logger } from '@/lib/logger/logger';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function askAssistantAction(prompt: string, conversationId?: string) {
  let userId = 'anonymous';
  let tenantId = 'anonymous';
  let lockKey: string | undefined = undefined;

  try {
    const user = await requireAuth();
    userId = user.id;
    tenantId = await requireTenant();

    // Generate unique request ID
    const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

    Logger.info('AI Request Started', { event: 'AI_REQUEST_STARTED', requestId, tenantId, userId, conversationId });

    // Acquire Distributed Lock
    const lockResult = await DistributedConcurrencyLock.acquire(tenantId, userId, requestId);
    if (!lockResult.acquired) {
      Logger.warn('AI Concurrency Blocked', { event: 'AI_CONCURRENCY_BLOCKED', requestId, tenantId, userId });
      return { success: false, error: 'AI is currently processing another request. Please wait.' };
    }
    lockKey = lockResult.lockKey;

    if (!prompt || typeof prompt !== 'string') {
      return { success: false, error: 'Invalid prompt type.' };
    }

    // Size check handled by ConversationService, but we can do a quick check here too
    if (Buffer.byteLength(prompt.trim(), 'utf8') > AIConfig.MAX_MESSAGE_SIZE_BYTES) {
      return { success: false, error: `Message exceeds maximum allowed size.` };
    }

    // 1. Load or Create Conversation securely
    let activeConversationId = conversationId;
    if (activeConversationId) {
      // Verify ownership & tenant
      const existing = await ConversationService.getOwnedConversation(tenantId, userId, activeConversationId);
      if (!existing) {
        return { success: false, error: 'Conversation not found or access denied.' };
      }
    } else {
      // Create new conversation
      const newConv = await ConversationService.createConversation(tenantId, userId, prompt);
      activeConversationId = newConv.id;
    }

    // 2. Persist the USER message
    const userMessageResult = await ConversationService.addMessage(tenantId, userId, activeConversationId, AIRole.USER, prompt);
    if (!userMessageResult.success) {
      Logger.error('AI Message Persist Failed (User)', new Error(userMessageResult.error), { event: 'AI_MESSAGE_PERSIST_FAILED', requestId, tenantId, userId, conversationId: activeConversationId });
      return { success: false, error: userMessageResult.error };
    }

    // 3. Load bounded conversation history from database
    const rawHistory = await ConversationService.getConversationMessages(tenantId, userId, activeConversationId, AIConfig.MAX_HISTORY_MESSAGES + 1);

    // The current prompt is rawHistory[0]. We exclude it from history passed to askAssistant.
    const historicalMessages = rawHistory.slice(1);

    // Bounding logic
    let totalChars = 0;
    const validHistory: ChatMessage[] = [];
    for (const msg of historicalMessages) {
      const charCount = msg.content.length;
      if (totalChars + charCount <= AIConfig.MAX_HISTORY_TOTAL_CHARS) {
        validHistory.unshift({
          role: msg.role === AIRole.USER ? 'user' : 'assistant',
          content: charCount > AIConfig.MAX_HISTORY_MSG_CHARS
            ? msg.content.substring(0, AIConfig.MAX_HISTORY_MSG_CHARS) + '...[truncated]'
            : msg.content
        });
        totalChars += charCount;
      } else {
        break; // Reached budget
      }
    }

    // 4. Execute AI
    const response = await askAssistant(prompt, requestId, validHistory);

    // 5. Persist ASSISTANT message only after success
    // Assistant responses are trusted from our backend, but we still respect bounds
    const asstMessageResult = await ConversationService.addMessage(tenantId, userId, activeConversationId, AIRole.ASSISTANT, response);
    if (!asstMessageResult.success) {
      Logger.error('AI Message Persist Failed (Assistant)', new Error(asstMessageResult.error), { event: 'AI_MESSAGE_PERSIST_FAILED', requestId, tenantId, userId, conversationId: activeConversationId });
      // We don't fail the request if persistence fails, but we logged it.
    }

    return { success: true, data: response, conversationId: activeConversationId };
  } catch (error: any) {
    let msg = error.message || 'Assistant failed to respond.';
    if (msg === 'RATE_LIMITED') {
      msg = 'You have exceeded the allowed number of requests. Please try again later.';
    }
    return { success: false, error: msg };
  } finally {
    // Release lock
    if (lockKey && userId !== 'anonymous' && tenantId !== 'anonymous') {
      await DistributedConcurrencyLock.release(tenantId, userId, lockKey);
    }
  }
}
