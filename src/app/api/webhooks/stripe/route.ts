import { NextResponse } from 'next/server';
import prisma from '@/../database/utils/prisma';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  // Real implementation requires Stripe library to verify signature:
  // const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  
  try {
    const payload = JSON.parse(body);
    console.log('[Stripe Webhook] Received event:', payload.type);

    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      const tenantId = session.metadata?.tenantId;
      
      if (tenantId) {
        console.log(`[Stripe Webhook] Updating subscription for tenant ${tenantId}...`);
        
        // This relies on the real business logic, e.g. finding the tenant and updating their subscription status
        await prisma.subscription.updateMany({
          where: { tenantId },
          data: { status: 'ACTIVE' }
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[Stripe Webhook] Error:', err);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }
}
