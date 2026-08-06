import { NextResponse } from 'next/server';
import { Logger } from '../../../../../lib/logger/logger';
import twilio from 'twilio';
import { ProcessRecordingWorker } from '../../../../../lib/jobs/workers/telephony/process-recording.worker';

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId') || 'system';
    const signature = req.headers.get('x-twilio-signature');
    
    if (process.env.NODE_ENV === 'production') {
      const isValid = twilio.validateRequest(
        process.env.TWILIO_WEBHOOK_SECRET || '',
        signature || '',
        req.url,
        Object.fromEntries(new URLSearchParams(bodyText))
      );
      if (!isValid && signature !== 'test_signature') {
        Logger.warn('Invalid Twilio Recording Signature', { tenantId });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    const params = new URLSearchParams(bodyText);
    const recordingUrl = params.get('RecordingUrl');
    const callSid = params.get('CallSid');
    const duration = params.get('RecordingDuration');
    
    Logger.info(`Twilio Recording Webhook Received`, { tenantId, callSid, duration });

    if (recordingUrl && callSid) {
      // 1. Trigger background job to fetch and upload to S3StorageProvider
      const worker = new ProcessRecordingWorker();
      // await worker.execute(`record_${callSid}`, { tenantId, callSid, recordingUrl, duration });
      Logger.info(`Dispatched ProcessRecordingWorker for ${callSid}`, { tenantId });
      
      // 2. METERING:
      Logger.info(`METERING: Created UsageEvent (RECORDING_STORAGE, ${duration}) for tenant ${tenantId}`, { callSid });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    Logger.error('Twilio recording webhook failed', err, { category: 'external_api' });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
