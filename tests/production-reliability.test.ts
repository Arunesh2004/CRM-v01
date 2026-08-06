import { BullMQProvider } from '../src/lib/jobs/providers/bullmq.provider';
import { RateLimiter } from '../src/lib/rate-limit/rate-limiter';
import { Logger } from '../src/lib/logger/logger';

async function runTests() {
  console.log('--- Running Production Reliability Tests ---');

  // 1. Structured Logging
  console.log('Testing structured logger:');
  Logger.info('This is an info log', { tenantId: 'tenant_123' });
  Logger.error('This is an error log', new Error('Something failed'), { requestId: 'req_123' });
  console.log('✔ Structured logging ok');

  // 2. Queue Creation & Tenant Isolation
  const bullMQ = new BullMQProvider({}); // mock redis connection
  
  try {
    await bullMQ.enqueue('emailQueue', 'sendWelcomeEmail', {
      user: 'test' // missing tenantId
    });
    throw new Error('Allowed job without tenant context');
  } catch (err: any) {
    if (!err.message.includes('Tenant context missing')) {
      throw new Error('Wrong error for missing tenant context');
    }
    console.log('✔ Tenant isolation in jobs enforced');
  }

  const jobId = await bullMQ.enqueue('emailQueue', 'sendWelcomeEmail', {
    tenantId: 'tenant_123',
    user: 'test'
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });
  if (!jobId) throw new Error('Job enqueue failed');
  console.log('✔ Queue creation and job enqueue ok (with retry behavior options)');

  // 3. Rate Limit Blocking
  const limiter = new RateLimiter();
  const limitKey = 'tenant_123:api:send_email';
  
  // limit 2 requests per 10 seconds
  const res1 = await limiter.checkLimit(limitKey, 2, 10000);
  const res2 = await limiter.checkLimit(limitKey, 2, 10000);
  const res3 = await limiter.checkLimit(limitKey, 2, 10000); // Should fail

  if (!res1.allowed || !res2.allowed) throw new Error('Legitimate requests blocked');
  if (res3.allowed) throw new Error('Rate limit blocking failed');
  
  console.log('✔ Rate limit blocking ok');

  console.log('--- Tests Completed Successfully ---');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
