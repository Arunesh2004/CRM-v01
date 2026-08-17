'use server'
import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import * as recordingService from '../recording.service';

export async function getCameraRecordingsAction(cameraId: string, limit?: number, cursor?: string) {
  try {
    const result = await recordingService.getCameraRecordings(cameraId, limit, cursor);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function generateRecordingDownloadUrlAction(recordingId: string) {
  try {
    const result = await recordingService.generateRecordingDownloadUrl(recordingId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
