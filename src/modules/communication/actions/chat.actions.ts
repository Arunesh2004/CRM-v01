'use server';

import { requireAuth } from '@/lib/auth';
import { ChatService } from '../chat.service';
import { DistributedRateLimiter } from '@/lib/rate-limit/rate-limiter';
import { z } from 'zod';

const SendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(5000)
});

const StartChatSchema = z.object({
  participantIds: z.array(z.string()).min(1).max(50),
  isGroup: z.boolean().optional(),
  name: z.string().max(100).optional()
});

export async function getConversationsAction() {
  try {
    const user = await requireAuth();
    
    // No strict rate limit for simple GET list, but let's do a lightweight one
    const rl = await DistributedRateLimiter.checkLimit(user.tenantId, 'CHAT', 'GET_CONVERSATIONS', 100, 60, undefined, user.id);
    if (!rl.allowed) throw new Error('Too many requests');

    const conversations = await ChatService.getConversations(user.tenantId, user.id);
    console.log('[getConversationsAction] SUCCESS:', conversations.length, 'conversations found');
    return { success: true, data: conversations };
  } catch (error) {
    console.error('[getConversationsAction] FAILED:', error);
    throw error;
  }
}

export async function startChatAction(data: z.infer<typeof StartChatSchema>) {
  const user = await requireAuth();
  const parsed = StartChatSchema.parse(data);

  const rl = await DistributedRateLimiter.checkLimit(user.tenantId, 'CHAT', 'START', 20, 60, undefined, user.id);
  if (!rl.allowed) throw new Error('Too many requests');

  const conversation = await ChatService.startChat(user.tenantId, user.id, parsed.participantIds, parsed.isGroup, parsed.name);
  return { success: true, data: conversation };
}

export async function sendMessageAction(data: z.infer<typeof SendMessageSchema>) {
  const user = await requireAuth();
  const parsed = SendMessageSchema.parse(data);

  const rl = await DistributedRateLimiter.checkLimit(user.tenantId, 'CHAT', 'SEND_MESSAGE', 100, 60, undefined, user.id);
  if (!rl.allowed) throw new Error('Too many requests');

  const message = await ChatService.sendMessage(user.tenantId, parsed.conversationId, user.id, parsed.content);
  return { success: true, data: message };
}

export async function getMessagesAction(conversationId: string, cursor?: string) {
  const user = await requireAuth();
  
  const rl = await DistributedRateLimiter.checkLimit(user.tenantId, 'CHAT', 'GET_MESSAGES', 200, 60, undefined, user.id);
  if (!rl.allowed) throw new Error('Too many requests');

  const messages = await ChatService.getMessages(user.tenantId, conversationId, user.id, cursor);
  return { success: true, data: messages };
}
