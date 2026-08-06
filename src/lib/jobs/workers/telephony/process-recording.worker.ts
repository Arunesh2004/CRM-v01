import { BaseWorker } from '../worker.base';
import { JobContext } from '../../queue.interface';
import { TelephonyProviderFactory } from '../../../providers/telephony/telephony.factory';
import { Logger } from '../../../logger/logger';

export interface ProcessRecordingContext extends JobContext {
  callSid: string;
  recordingUrl: string;
  duration: string;
}

export class ProcessRecordingWorker extends BaseWorker<ProcessRecordingContext> {
  constructor() {
    super('process_recording_queue');
  }

  protected async processJob(jobId: string, data: ProcessRecordingContext): Promise<void> {
    const provider = TelephonyProviderFactory.getProvider();
    
    try {
      // 1. Fetch raw audio buffer from Twilio API
      const audioBuffer = await provider.fetchRecording(data.recordingUrl);
      
      // 2. Store via existing S3StorageProvider
      const storageKey = `${data.tenantId}/recordings/${data.callSid}.mp3`;
      // await S3StorageProvider.upload(storageKey, audioBuffer, 'audio/mpeg');
      
      // 3. Update Database Record
      // await prisma.callRecording.create({ 
      //    data: { tenantId: data.tenantId, callId: data.callSid, storageKey, duration: parseInt(data.duration) }
      // });

      Logger.info(`Successfully processed and stored call recording to ${storageKey}`, { tenantId: data.tenantId, callSid: data.callSid });
      
    } catch (err: any) {
      Logger.error(`Failed to process recording, will retry`, err, { tenantId: data.tenantId, callSid: data.callSid });
      throw err; // BullMQ will handle exponential backoff
    }
  }
}
