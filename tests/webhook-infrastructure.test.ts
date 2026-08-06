import { GenericWebhookVerifier } from '../src/lib/webhooks/providers/generic-verifier';
import { ClerkWebhookVerifier } from '../src/lib/webhooks/providers/clerk-verifier';
import { verifyWebhook, receiveWebhook, markProcessed, markFailed } from '../src/lib/webhooks/webhook.service';
import prisma from '../database/utils/prisma';
import crypto from 'crypto';

async function runTests() {
  console.log('--- Running Webhook Infrastructure Tests ---');
  
  const secret = 'test_secret_123';
  const payload = JSON.stringify({ data: 'test' });
  
  // 1. Valid webhook accepted & replay protection bypass (fresh timestamp)
  const genericVerifier = new GenericWebhookVerifier();
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const freshTimestamp = Date.now().toString();
  
  const isValid = verifyWebhook(genericVerifier, payload, {
    'x-signature': signature,
    'x-timestamp': freshTimestamp
  }, secret);
  
  if (!isValid) throw new Error('Failed to verify valid webhook');
  console.log('✔ Valid webhook accepted');
  
  // 2. Replay protection (stale request)
  const staleTimestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 minutes ago
  const isStaleValid = verifyWebhook(genericVerifier, payload, {
    'x-signature': signature,
    'x-timestamp': staleTimestamp
  }, secret);
  
  if (isStaleValid) throw new Error('Failed to reject stale request (replay attack)');
  console.log('✔ Replay protection working (stale request rejected)');

  // 3. Invalid signature rejected
  const isInvalid = verifyWebhook(genericVerifier, payload, {
    'x-signature': 'bad_signature',
    'x-timestamp': freshTimestamp
  }, secret);
  
  if (isInvalid) throw new Error('Failed to reject invalid signature');
  console.log('✔ Invalid signature rejected');

  // 4. Duplicate event ignored
  const eventId = 'evt_' + Date.now();
  await receiveWebhook({
    provider: 'STRIPE',
    eventId: eventId,
    eventType: 'payment.success',
    payload: { id: eventId },
    signatureVerified: true
  });
  
  try {
    await receiveWebhook({
      provider: 'STRIPE',
      eventId: eventId,
      eventType: 'payment.success',
      payload: { id: eventId },
      signatureVerified: true
    });
    throw new Error('Allowed duplicate event processing');
  } catch (err: any) {
    if (!err.message.includes('Duplicate webhook event')) throw new Error('Wrong error thrown for duplicate event');
    console.log('✔ Duplicate event rejected correctly');
  }

  // 5. Status tracking
  await markProcessed(eventId);
  let evt = await prisma.webhookEvent.findUnique({ where: { eventId } });
  if (evt?.status !== 'PROCESSED') throw new Error('Failed to mark processed');
  
  await markFailed(eventId);
  evt = await prisma.webhookEvent.findUnique({ where: { eventId } });
  if (evt?.status !== 'FAILED') throw new Error('Failed to mark failed');
  console.log('✔ Failed processing recorded');

  // Cleanup
  await prisma.webhookEvent.deleteMany({ where: { provider: 'STRIPE' } });

  console.log('--- Tests Completed Successfully ---');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
