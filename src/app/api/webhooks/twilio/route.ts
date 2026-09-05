import { NextResponse } from 'next/server';
import { Logger } from '@/lib/observability/logger';
import twilio from 'twilio';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { withTenant } from '@db/utils/prisma-tenant';

const logger = new Logger();

// DEPRECATED: This is a legacy/duplicate status endpoint.
// Production traffic should route to /api/webhooks/twilio/status
// Maintained for backwards compatibility in case existing Twilio configs still point here.
export async function POST(req: Request) {
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
      logger.warn('Invalid Twilio Status Signature', { ip: req.headers.get('x-forwarded-for') });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const params = new URLSearchParams(bodyText);
    const callStatus = params.get('CallStatus');
    const callSid = params.get('CallSid');

    if (!callSid) {
      return NextResponse.json({ error: 'Missing CallSid' }, { status: 400 });
    }

    // Securely resolve tenantId from trusted CallLog using System context
    const callLog = await executeAsSystem(SystemOperation.EXTERNAL_WEBHOOK_PROCESS, async (tx) => {
      return tx.callLog.findFirst({ where: { providerCallId: callSid } });
    });

    if (!callLog) {
      logger.warn('Status webhook received for unknown CallSid', { callSid });
      return NextResponse.json({ error: 'Unknown CallSid' }, { status: 400 });
    }

    const tenantId = callLog.tenantId;
    logger.info('Twilio Webhook: Received status update', { callSid, tenantId, callStatus });

    // Entering tenant context to securely update the CallLog
    const prisma = withTenant(tenantId);
    // await prisma.callLog.update({
    //   where: { id: callLog.id },
    //   data: { status: mapTwilioStatus(callStatus) }
    // });
    
    return NextResponse.json({ received: true });
  } catch (err: any) {
    logger.error('Twilio Webhook Error', undefined, { name: err?.name });
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }
}
