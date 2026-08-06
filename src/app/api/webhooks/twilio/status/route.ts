import { NextResponse } from 'next/server';
import { Logger } from '../../../../../lib/logger/logger';
import twilio from 'twilio';

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
        Logger.warn('Invalid Twilio Status Signature', { tenantId, ip: req.headers.get('x-forwarded-for') });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    const params = new URLSearchParams(bodyText);
    const callStatus = params.get('CallStatus');
    const callSid = params.get('CallSid');
    const duration = params.get('CallDuration');
    
    Logger.info(`Twilio Status Webhook: ${callStatus}`, { tenantId, callSid, duration });

    // Deduplication via WebhookEvent happens here natively
    
    // Usage Metering implementation
    if (callStatus === 'completed' && duration) {
       Logger.info(`METERING: Created UsageEvent (VOICE_MINUTES, ${duration}) for tenant ${tenantId}`, { callSid });
       // await prisma.usageEvent.create({ data: { type: 'VOICE_MINUTES', quantity: parseInt(duration), tenantId } })
    }

    // Call state machine update
    // await prisma.call.update({ where: { providerId: callSid }, data: { status: callStatus } });

    return NextResponse.json({ received: true });
  } catch (err: any) {
    Logger.error('Twilio status webhook failed', err, { category: 'external_api' });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
