import { Logger } from '@/lib/logger/logger';
import { GeminiProvider } from '@/lib/providers/ai/gemini.provider';
import { TwilioProvider, MockTelephonyProvider } from '@/lib/providers/telephony/twilio.provider';
import { StorageProviderFactory } from '@/lib/storage/storage.factory';
import { withTenant } from '@db/utils/prisma-tenant';
import { SecureJobEnvelope } from '@/lib/queue/types';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { Prisma } from '@prisma/client';

export async function processCallCompleted(envelope: SecureJobEnvelope<any>) {
  const { tenantId, payload, jobId } = envelope;
  const { callSid, recordingUrl } = payload;
  
  if (!callSid || !recordingUrl) {
    Logger.warn('Skipping call transcription: Missing callSid or recordingUrl', { tenantId, payload });
    return { success: true, skipped: true };
  }

  const tenantPrisma = withTenant(tenantId);
  const tmpFile = path.join(os.tmpdir(), `recording_${callSid}_${Date.now()}.wav`);
  try {
    // 2. Verify CallLog belongs to this tenant and hasn't already been processed
    const callLog = await tenantPrisma.callLog.findFirst({
      where: { providerCallId: callSid, tenantId }
    });

    if (!callLog) {
      throw new Error(`CallLog not found for CallSid: ${callSid}`);
    }

    const currentMetadata = (callLog.metadata as any) || {};
    if (currentMetadata.transcriptStatus === 'COMPLETED') {
      Logger.info('Skipping call transcription: Already COMPLETED', { tenantId, callSid });
      return { success: true, skipped: true };
    }

    // 3. Download recording
    const isDemo = process.env.APP_MODE === 'demo';
    const telephony = isDemo ? new MockTelephonyProvider() : new TwilioProvider();
    
    await telephony.downloadRecording(recordingUrl, tmpFile);

    // 4. Process with Gemini
    const gemini = new GeminiProvider();
    const result = await gemini.transcribeAudio(tmpFile, 'audio/wav', 'Transcribe and summarize this call.');

    // 5. Upload transcript JSON to R2
    const storage = StorageProviderFactory.getProvider();
    const transcriptKey = `transcripts/${callSid}.json`;
    const transcriptBuffer = Buffer.from(JSON.stringify(result, null, 2));
    const objectUrl = await storage.uploadFile(tenantId, transcriptKey, transcriptBuffer, 'application/json');

    // 6. Tenant-scoped CallLog update
    await tenantPrisma.callLog.update({
      where: { id: callLog.id },
      data: {
        metadata: {
          ...currentMetadata,
          transcriptStatus: 'COMPLETED',
          transcriptUrl: objectUrl,
          summary: result.summary,
          sentiment: result.sentiment,
          processedAt: new Date().toISOString()
        }
      }
    });

    Logger.info('Successfully processed call transcription', { tenantId, callSid });
    return { success: true };
  } catch (error: any) {
    Logger.error('Failed to process call transcription', error, { tenantId, callSid });
    throw error;
  } finally {
    // Cleanup temp file
    if (fs.existsSync(tmpFile)) {
      try {
        fs.unlinkSync(tmpFile);
      } catch (cleanupErr) {
        Logger.error('Failed to cleanup temp file', cleanupErr, { tenantId, callSid, tmpFile });
      }
    }
  }
}
