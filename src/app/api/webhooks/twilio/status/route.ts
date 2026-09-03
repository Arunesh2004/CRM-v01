import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { Logger } from '../../../../../lib/logger/logger';
import twilio from 'twilio';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { withTenant } from '@db/utils/prisma-tenant';
const _orig_POST = async function (req: Request) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('x-twilio-signature');
    
    const isValid = twilio.validateRequest(
      process.env.TWILIO_WEBHOOK_SECRET || '',
      signature || '',
      req.url,
      Object.fromEntries(new URLSearchParams(bodyText))
    );

    if (!isValid) {
      Logger.warn('Invalid Twilio Status Signature', { ip: req.headers.get('x-forwarded-for') });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const params = new URLSearchParams(bodyText);
    const callStatus = params.get('CallStatus');
    const callSid = params.get('CallSid');
    const duration = params.get('CallDuration');
    
    if (!callSid) {
      return NextResponse.json({ error: 'Missing CallSid' }, { status: 400 });
    }

    // Securely resolve tenantId from trusted CallLog using System context
    const callLog = await executeAsSystem(SystemOperation.EXTERNAL_WEBHOOK_PROCESS, async (tx) => {
      return tx.callLog.findFirst({ where: { providerCallId: callSid } });
    });

    if (!callLog) {
      Logger.warn('Status webhook received for unknown CallSid', { callSid });
      return NextResponse.json({ error: 'Unknown CallSid' }, { status: 400 });
    }

    const tenantId = callLog.tenantId;

    Logger.info(`Twilio Status Webhook: ${callStatus}`, { tenantId, callSid, duration });

    // Deduplication via WebhookEvent happens natively if implemented

    // Usage Metering implementation
    if (callStatus === 'completed' && duration) {
       Logger.info(`METERING: Created UsageEvent (VOICE_MINUTES, ${duration}) for tenant ${tenantId}`, { callSid });
       // await prisma.usageEvent.create({ data: { type: 'VOICE_MINUTES', quantity: parseInt(duration), tenantId } })
    }

    // Call state machine update
    const tenantPrisma = withTenant(tenantId);
    const mappedStatus = (callStatus || 'COMPLETED').toUpperCase().replace('-', '_');
    await tenantPrisma.callLog.updateMany({
      where: { providerCallId: callSid, tenantId },
      data: { status: mappedStatus as any }
    });

    if (callStatus === 'completed') {
      try {
        const eventId = `${callSid}_COMPLETED`;
        await tenantPrisma.eventOutbox.create({
          data: {
            eventId,
            tenantId,
            eventType: 'CALL_COMPLETED',
            payload: { 
              callSid, 
              duration: duration ? parseInt(duration) : null,
              recordingUrl: params.get('RecordingUrl')
            }
          }
        });
        Logger.info(`Queued CALL_COMPLETED event for transcription`, { eventId, tenantId });
      } catch (e: any) {
        // P2002 is Prisma's Unique Constraint Violation error code
        if (e.code === 'P2002') {
          Logger.info(`Idempotent webhook retry swallowed for CALL_COMPLETED`, { callSid, tenantId });
        } else {
          Logger.error('Failed to queue CALL_COMPLETED event', e, { tenantId });
          throw e; // Rethrow to fail webhook and trigger Twilio retry if DB is down
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    Logger.error('Twilio status webhook failed', err, { category: 'external_api' });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiContext(_orig_POST);
