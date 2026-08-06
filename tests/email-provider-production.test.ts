import { EmailProviderFactory } from '../src/lib/providers/email/email.factory';
import { SendEmailWorker } from '../src/lib/jobs/workers/email/send-email.worker';
import { POST as resendWebhookHandler } from '../src/app/api/webhooks/resend/route';

async function runTests() {
  console.log('--- Running Email Provider Production Tests ---');

  const originalEnv = { ...process.env };
  
  // 1. Mock Mode validation
  process.env.NODE_ENV = 'development';
  let provider = EmailProviderFactory.getProvider();
  if (provider.constructor.name !== 'MockEmailProvider') throw new Error('Failed to load MockEmailProvider in dev');
  console.log('✔ Mock mode activates successfully in development');

  // 2. Production Mode initialization
  process.env.NODE_ENV = 'production';
  process.env.RESEND_API_KEY = 're_test_123';
  provider = EmailProviderFactory.getProvider();
  if (provider.constructor.name !== 'ResendProvider') throw new Error('Failed to load ResendProvider in production');
  console.log('✔ Real provider initializes with credentials');

  // 3. Worker tenant isolation & failure handling
  const worker = new SendEmailWorker();
  try {
    await worker.execute('job_1', { payload: { to: 'test@example.com', subject: 'test', html: 't' } } as any);
    throw new Error('Worker bypassed tenant isolation');
  } catch (err: any) {
    if (!err.message.includes('tenant context')) throw err;
    console.log('✔ Tenant isolation enforced by background job');
  }

  // 4. Webhook signature rejection
  process.env.RESEND_WEBHOOK_SECRET = 'secret_123';
  
  const mockRequest = (signature: string | null) => ({
    text: async () => JSON.stringify({ type: 'email.sent', data: { email_id: '123' } }),
    headers: {
      get: (name: string) => name === 'svix-signature' ? signature : null
    }
  } as unknown as Request);

  let res = await resendWebhookHandler(mockRequest(null));
  if (res.status !== 401) throw new Error('Failed to block missing signature');
  
  res = await resendWebhookHandler(mockRequest('invalid_signature'));
  if (res.status !== 400) throw new Error('Failed to block invalid signature');
  
  res = await resendWebhookHandler(mockRequest('test_signature'));
  if (res.status !== 200) throw new Error('Failed to process valid signature');
  
  console.log('✔ Webhook signature rejection active');
  
  // Cleanup
  process.env = { ...originalEnv };

  console.log('--- Tests Completed Successfully ---');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
