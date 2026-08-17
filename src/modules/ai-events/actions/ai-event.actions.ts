'use server'
import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import * as aiEventService from '../ai-event.service';

export async function getAIEventsAction(params?: { cameraId?: string; limit?: number; cursor?: string; }) {
  try {
    const result = await aiEventService.getAIEvents(params);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
