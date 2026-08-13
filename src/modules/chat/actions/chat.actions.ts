'use server';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';


import { ConversationService } from '../conversation.service';
import { MessageService } from '../message.service';
import { MessageType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getUserConversationsAction(cursor?: string, limit = 50) {
  try {
    const data = await ConversationService.getUserConversations(cursor, limit);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function createDirectConversationAction(targetUserId: string) {
  try {
    const data = await ConversationService.createDirectConversation(targetUserId);
    revalidatePath('/chat');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function getMessagesAction(conversationId: string, cursor?: string) {
  try {
    const data = await MessageService.getMessages(conversationId, cursor);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function sendMessageAction(conversationId: string, content: string, messageType: MessageType = 'TEXT') {
  try {
    const data = await MessageService.sendMessage(conversationId, content, messageType);
    revalidatePath(`/chat`);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
