import { ProviderFactory } from '../src/lib/providers/provider.factory';
import { WebhookSecurity } from '../src/lib/providers/webhook/webhook-security';

async function runTests() {
  console.log('--- Running Provider Abstraction Tests ---');

  // 1. Test Factory & Interfaces
  const emailProvider = ProviderFactory.getEmailProvider();
  const telephonyProvider = ProviderFactory.getTelephonyProvider();
  const messagingProvider = ProviderFactory.getMessagingProvider();

  if (!emailProvider || !telephonyProvider || !messagingProvider) {
    throw new Error('Factory failed to instantiate providers');
  }
  
  console.log('✔ Provider Factory successfully instantiated interfaces');

  // 2. Test Abstraction Methods (Safe Placeholders)
  const emailResult = await emailProvider.sendEmail('test@example.com', 'Subject', '<p>Body</p>');
  if (!emailResult.success) throw new Error('Email provider failed');
  console.log('✔ Email provider abstraction returned successfully:', emailResult);

  const callResult = await telephonyProvider.makeCall('+1234567890', '+0987654321');
  if (!callResult.success) throw new Error('Telephony provider failed');
  console.log('✔ Telephony provider abstraction returned successfully:', callResult);

  const msgResult = await messagingProvider.sendMessage('+1234567890', 'Hello from CRM');
  if (!msgResult.success) throw new Error('Messaging provider failed');
  console.log('✔ Messaging provider abstraction returned successfully:', msgResult);

  // 3. Test Webhook Security
  const security = new WebhookSecurity();
  const validTimestamp = Math.floor(Date.now() / 1000).toString();
  const isTimeValid = security.verifyTimestamp(validTimestamp, 300);
  if (!isTimeValid) throw new Error('Webhook timestamp validation failed for valid time');
  
  const staleTimestamp = (Math.floor(Date.now() / 1000) - 1000).toString();
  const isStaleTimeValid = security.verifyTimestamp(staleTimestamp, 300);
  if (isStaleTimeValid) throw new Error('Webhook timestamp validation failed to reject stale time');

  console.log('✔ Webhook Security replay protection validated correctly');

  console.log('--- Tests Completed Successfully ---');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
