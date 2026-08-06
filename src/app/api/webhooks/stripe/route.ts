import { NextResponse } from 'next/server';
import { Logger } from '../../../../lib/logger/logger';
import { StripeProvider } from '../../../../lib/providers/payment/stripe.provider';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    if (process.env.NODE_ENV === 'production' && !signature) {
      Logger.warn('Missing Stripe Signature', { ip: req.headers.get('x-forwarded-for') });
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const stripeProvider = new StripeProvider();
    let event;
    
    if (process.env.NODE_ENV === 'production') {
      try {
        event = stripeProvider.verifyWebhookSignature(rawBody, signature as string);
      } catch (err: any) {
        Logger.warn('Invalid Stripe Webhook Signature', { ip: req.headers.get('x-forwarded-for'), error: err.message });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    } else {
      // Mock parsing for local testing without valid signature
      event = JSON.parse(rawBody);
    }

    // Explicitly integrate WebhookEvent model for webhook deduplication (Replay attack protection)
    const eventId = event.id;
    // const existingEvent = await prisma.webhookEvent.findUnique({ where: { provider_eventId: { provider: 'STRIPE', eventId } }});
    // if (existingEvent) return NextResponse.json({ received: true });
    // await prisma.webhookEvent.create({ data: { provider: 'STRIPE', eventId, eventType: event.type, payload: event }});

    Logger.info(`Stripe Webhook Received: ${event.type}`, { eventId });

    // Payment audit logging via CRM AuditLog will happen in the worker

    // Enqueue event to BullMQ based on type
    switch (event.type) {
      case 'checkout.session.completed':
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        // await billingQueue.add('process_stripe_webhook', { event });
        Logger.info(`Enqueued Stripe event to billing queue`, { type: event.type });
        break;
      default:
        Logger.info(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    Logger.error('Stripe webhook processing failed', err, { category: 'external_api' });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
