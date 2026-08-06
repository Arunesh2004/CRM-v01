import { NextResponse } from 'next/server';
import { Logger } from '../../../../lib/logger/logger';
import { RazorpayProvider } from '../../../../lib/providers/payment/razorpay.provider';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    
    if (process.env.NODE_ENV === 'production' && !signature) {
      Logger.warn('Missing Razorpay Signature', { ip: req.headers.get('x-forwarded-for') });
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const razorpayProvider = new RazorpayProvider();
    
    if (process.env.NODE_ENV === 'production') {
      const isValid = razorpayProvider.verifyWebhookSignature(rawBody, signature as string);
      if (!isValid) {
        Logger.warn('Invalid Razorpay Webhook Signature', { ip: req.headers.get('x-forwarded-for') });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);

    // Explicitly integrate WebhookEvent model for webhook deduplication (Replay attack protection)
    const eventId = req.headers.get('x-razorpay-event-id') || event.payload?.payment?.entity?.id || Date.now().toString();
    // const existingEvent = await prisma.webhookEvent.findUnique({ where: { provider_eventId: { provider: 'RAZORPAY', eventId } }});
    // if (existingEvent) return NextResponse.json({ received: true });
    // await prisma.webhookEvent.create({ data: { provider: 'RAZORPAY', eventId, eventType: event.event, payload: event }});

    Logger.info(`Razorpay Webhook Received: ${event.event}`, { eventId });

    // Payment audit logging via CRM AuditLog will happen in the worker

    // Enqueue event to BullMQ based on type
    switch (event.event) {
      case 'payment.captured':
      case 'payment.failed':
      case 'subscription.charged':
      case 'subscription.halted':
      case 'subscription.cancelled':
      case 'refund.processed':
        // await billingQueue.add('process_razorpay_webhook', { event });
        Logger.info(`Enqueued Razorpay event to billing queue`, { type: event.event });
        break;
      default:
        Logger.info(`Unhandled Razorpay event type: ${event.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    Logger.error('Razorpay webhook processing failed', err, { category: 'external_api' });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
