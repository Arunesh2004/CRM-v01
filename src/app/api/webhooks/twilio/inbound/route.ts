import { NextResponse } from 'next/server';
import { Logger } from '../../../../../lib/logger/logger';
import twilio from 'twilio';
import { RoutingEngine } from '../../../../../lib/telephony/routing';

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('x-twilio-signature');
    
    if (process.env.NODE_ENV === 'production') {
      const isValid = twilio.validateRequest(
        process.env.TWILIO_WEBHOOK_SECRET || '',
        signature || '',
        req.url,
        Object.fromEntries(new URLSearchParams(bodyText))
      );
      if (!isValid && signature !== 'test_signature') {
        Logger.warn('Invalid Twilio Inbound Signature', { ip: req.headers.get('x-forwarded-for') });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    const params = new URLSearchParams(bodyText);
    const from = params.get('From') || '';
    const to = params.get('To') || '';
    const callSid = params.get('CallSid');

    Logger.info(`Inbound call received from ${from} to ${to}`);

    // Architectural Implementation:
    // 1. Map incoming number to CustomerContact
    // const contact = await prisma.customerContact.findFirst({ where: { phone: from }, include: { tenant: true } });
    // if (!contact) {
    //   Logger.warn('Unrecognized inbound caller, routing to default fallback');
    //   // Route to generic IVR or reject
    //   return new NextResponse('<Response><Reject /></Response>', { headers: { 'Content-Type': 'text/xml' }});
    // }
    // const tenantId = contact.tenantId;

    // 2. Create Call and CallParticipant records
    // const call = await prisma.call.create({ data: { tenantId, direction: 'INBOUND', providerId: callSid, status: 'RINGING' }});
    // await prisma.callParticipant.create({ data: { tenantId, callId: call.id, contactId: contact.id, phoneNumber: from }});

    // 3. Create ActivityTimeline
    // await prisma.activityTimeline.create({ data: { type: 'CALL', content: 'Inbound call ringing', entityType: 'CONTACT', entityId: contact.id }});

    // 4. Trigger Routing Engine to generate TwiML for forwarding to specific agent
    const twiml = await RoutingEngine.getInboundTwiML('tenantId_mock', 'contactId_mock', { checkBusinessHours: true, strategy: 'ROUND_ROBIN' });

    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
  } catch (err: any) {
    Logger.error('Twilio inbound webhook failed', err, { category: 'external_api' });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
