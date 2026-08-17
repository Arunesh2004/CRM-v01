'use server'
import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import * as streamService from '../stream.service';

export async function generateStreamTokenAction(cameraId: string) {
  try {
    const result = await streamService.generateStreamToken(cameraId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
