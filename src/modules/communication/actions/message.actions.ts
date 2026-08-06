'use server';
import { z } from 'zod';
import { CreateMessageSchema } from '../validators/message.schema';
import * as messagingService from '../messaging/messaging.service';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';

export async function sendMessageAction(payload: z.infer<typeof CreateMessageSchema>) {
  try {
    const validatedData = CreateMessageSchema.parse(payload);
    
    // auth logic imported above
    await requireAuth();
    await requireTenant();
    await requirePermission('COMMUNICATION', 'CREATE');
    
    const result = await messagingService.sendMessage(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
