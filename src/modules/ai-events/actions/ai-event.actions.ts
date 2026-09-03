'use server'
import { withServerActionContext } from '@/lib/observability/server-action';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import * as aiEventService from '../ai-event.service';

async function _getAIEventsAction(params?: { cameraId?: string; limit?: number; cursor?: string; }) {
  try {
    const result = await aiEventService.getAIEvents(params);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getAIEventsAction = withServerActionContext(_getAIEventsAction);
