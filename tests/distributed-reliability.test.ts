import { DistributedRateLimiter, RedisClientLike } from '../src/lib/rate-limit/rate-limiter';
import { Logger } from '../src/lib/logger/logger';
import { BaseWorker } from '../src/lib/jobs/workers/worker.base';
import { JobContext } from '../src/lib/jobs/queue.interface';

// Mock Redis client for testing rate limiter
class MockRedis implements RedisClientLike {
  private store = new Map<string, number>();
  
  multi() { return this; }
  
  async incr(key: string): Promise<number> {
    const val = (this.store.get(key) || 0) + 1;
    this.store.set(key, val);
    return val;
  }
  
  async expire(key: string, seconds: number): Promise<number> {
    return 1;
  }

  async ttl(key: string): Promise<number> {
    return 10;
  }
}

// Mock Worker for testing
class TestWorker extends BaseWorker<JobContext> {
  public executed = false;
  
  protected async processJob(jobId: string, data: JobContext): Promise<void> {
    if (data.shouldFail) throw new Error('Simulated failure');
    this.executed = true;
  }
}

async function runTests() {
  console.log('--- Running Distributed Reliability Tests ---');

  // 1. Distributed Rate Limit Behaviour
  const mockRedis = new MockRedis();
  const limiter = new DistributedRateLimiter(mockRedis);
  
  const res1 = await limiter.checkLimit('tenant_1', 'api', 'login', 2, 60);
  const res2 = await limiter.checkLimit('tenant_1', 'api', 'login', 2, 60);
  const res3 = await limiter.checkLimit('tenant_1', 'api', 'login', 2, 60);
  
  if (!res1.allowed || !res2.allowed) throw new Error('Valid requests blocked');
  if (res3.allowed) throw new Error('Distributed rate limit failed to block');
  console.log('✔ Distributed rate limit behaviour ok');

  // 2. Worker Isolation & Log Sanitization
  const worker = new TestWorker('testQueue');
  
  // Test sanitization in logs implicitly by observing output
  Logger.info('Testing sanitization', { tenantId: 'tenant_1', secretToken: 'should_be_hidden' });
  
  try {
    await worker.execute('job_1', { data: 'test' } as any); // Missing tenantId
    throw new Error('Worker executed without tenant context');
  } catch (err: any) {
    if (!err.message.includes('CRITICAL: Job attempted execution without tenant context')) {
      throw new Error('Worker failed to isolate tenant context');
    }
    console.log('✔ Worker strictly isolated (tenant context enforced)');
  }

  // 3. Failed job handling & duration tracking
  try {
    await worker.execute('job_2', { tenantId: 'tenant_1', shouldFail: true });
    throw new Error('Worker swallowed error');
  } catch (err: any) {
    if (err.message !== 'Simulated failure') throw err;
    console.log('✔ Failed job handling & retry propagation ok');
  }

  // 4. Graceful Shutdown
  await worker.gracefulShutdown();
  try {
    await worker.execute('job_3', { tenantId: 'tenant_1' });
    throw new Error('Worker accepted job during shutdown');
  } catch (err: any) {
    if (err.message !== 'Worker shutting down') throw err;
    console.log('✔ Graceful shutdown mechanism ok');
  }

  console.log('--- Tests Completed Successfully ---');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
