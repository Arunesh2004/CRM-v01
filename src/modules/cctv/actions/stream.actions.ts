'use server'
import { withServerActionContext } from '@/lib/observability/server-action';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import * as streamService from '../stream.service';

async function _generateStreamTokenAction(cameraId: string) {
  try {
    const result = await streamService.generateStreamToken(cameraId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const generateStreamTokenAction = withServerActionContext(_generateStreamTokenAction);
