import { ProviderFactory } from '../../src/lib/providers/provider.factory';
import crypto from 'crypto';

async function runProfileE() {
  console.log('--- Phase 11 Profile E (Realtime Mock Auth) ---');
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const concurrency = parseInt(process.env.CONCURRENCY || '50');
  const iterations = parseInt(process.env.ITERATIONS || '10');

  const provider = ProviderFactory.getRealtimeProvider();

  const start = Date.now();
  let errors = 0;
  const latencies: number[] = [];

  const workers = Array.from({ length: concurrency }).map(async () => {
    for (let i = 0; i < iterations; i++) {
      const socketId = `${crypto.randomUUID()}`;
      const channelName = `private-tenant-${tenantId}-updates`;
      try {
        const opStart = Date.now();
        await provider.authenticateChannel(socketId, channelName, {
          user_id: crypto.randomUUID(),
          user_info: { tenantId }
        });
        latencies.push(Date.now() - opStart);
      } catch (e) {
        if (errors === 0) console.error('Sample Error:', e);
        errors++;
      }
    }
  });

  await Promise.all(workers);
  const duration = Date.now() - start;

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  console.log(`Duration: ${duration}ms`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Total Ops: ${concurrency * iterations}`);
  console.log(`Errors: ${errors}`);
  console.log(`P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`);
  console.log(`Auth Throughput: ${((concurrency * iterations) / (duration / 1000)).toFixed(2)} ops/sec`);
}

runProfileE().catch(console.error);
