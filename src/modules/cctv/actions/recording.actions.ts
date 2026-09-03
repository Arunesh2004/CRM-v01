'use server'
import { withServerActionContext } from '@/lib/observability/server-action';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import * as recordingService from '../recording.service';

async function _getCameraRecordingsAction(cameraId: string, limit?: number, cursor?: string) {
  try {
    const result = await recordingService.getCameraRecordings(cameraId, limit, cursor);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _generateRecordingDownloadUrlAction(recordingId: string) {
  try {
    const result = await recordingService.generateRecordingDownloadUrl(recordingId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getCameraRecordingsAction = withServerActionContext(_getCameraRecordingsAction);

export const generateRecordingDownloadUrlAction = withServerActionContext(_generateRecordingDownloadUrlAction);
