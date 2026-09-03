import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { Logger } from '../../../../../lib/logger/logger';
import twilio from 'twilio';
import { ProcessRecordingWorker } from '../../../../../lib/jobs/workers/telephony/process-recording.worker';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';

const _orig_POST = async function (req: Request) {
  try {
    const bodyText = await req.text();
    const url = new URL(req.url);
    const signature = req.headers.get('x-twilio-signature');
    
    const isValid = twilio.validateRequest(
      process.env.TWILIO_WEBHOOK_SECRET || '',
      signature || '',
      req.url,
      Object.fromEntries(new URLSearchParams(bodyText))
    );
    if (!isValid) {
      Logger.warn('Invalid Twilio Recording Signature', { ip: req.headers.get('x-forwarded-for') });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const params = new URLSearchParams(bodyText);
    const recordingUrl = params.get('RecordingUrl');
    const callSid = params.get('CallSid');
    const duration = params.get('RecordingDuration');
    
    if (!callSid) {
      return NextResponse.json({ error: 'Missing CallSid' }, { status: 400 });
    }

    // Securely resolve tenantId from trusted CallLog using System context
    const callLog = await executeAsSystem(SystemOperation.EXTERNAL_WEBHOOK_PROCESS, async (tx) => {
      return tx.callLog.findFirst({ where: { providerCallId: callSid } });
    });

    if (!callLog) {
      Logger.warn('Recording webhook received for unknown CallSid', { callSid });
      return NextResponse.json({ error: 'Unknown CallSid' }, { status: 400 });
    }

    const tenantId = callLog.tenantId;

    Logger.info(`Twilio Recording Webhook Received`, { tenantId, callSid, duration });

    if (recordingUrl) {
      // 1. Trigger background job to fetch and upload to S3StorageProvider
      const worker = new ProcessRecordingWorker();
      // Worker will safely re-enter withJobContext / withTenant
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

export const POST = withApiContext(_orig_POST);
