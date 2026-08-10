import { BullMQProvider } from '../src/lib/queue/BullMQProvider';
import { prismaAdmin } from '../database/utils/prisma';
import crypto from 'crypto';
import { JobPayload } from '../src/lib/queue/JobQueueProvider';
import { execSync } from 'child_process';

async function testRedisFailure() {
  console.log('--- PHASE 6.10 REDIS FAILURE SIMULATION ---');
  process.env.REDIS_URL = 'redis://localhost:6380';
  const provider = new BullMQProvider();

  const jobId = crypto.randomUUID();
  const chunkId = `chunk_redis_test_${jobId}`;
  const tenantId = crypto.randomUUID(); 
  
  console.log('[1] ENQUEUEING JOB...');
  const queueJobId = await provider.enqueue({
    jobId,
    type: 'RESTORE',
    tenantId,
    requestedBy: 'SYSTEM',
    metadata: {
      chunkId,
      phase: 'CRM_CORE',
      model: 'Customer',
      chunkIndex: 0
    }
  });

  console.log(`Job enqueued with queue ID: ${queueJobId}`);

  console.log('[2] CONSUMING JOB & KILLING REDIS...');
  let processed = false;
  provider.consume(async (payload: JobPayload) => {
    console.log(`Worker processing chunk ${payload.metadata.chunkId}...`);
    // mock heavy work
    await new Promise(r => setTimeout(r, 2000));
    console.log('Worker finished chunk processing. Acknowledging...');
    processed = true;
  }, 1);

  // Kill redis immediately after consumer starts processing
  setTimeout(() => {
    console.log('[!] SIMULATING REDIS CRASH (docker stop redis-8)...');
    try {
      execSync('docker stop redis-8');
      console.log('Redis stopped.');
    } catch(e) {
      console.error('Failed to stop redis', e);
    }
  }, 500);

  // Restart redis after 5 seconds
  setTimeout(() => {
    console.log('[!] RESTARTING REDIS (docker start redis-8)...');
    try {
      execSync('docker start redis-8');
      console.log('Redis started.');
    } catch(e) {
      console.error('Failed to start redis', e);
    }
  }, 5000);

  // Wait up to 15 seconds for processing to succeed after restart
  for(let i = 0; i < 15; i++) {
    if (processed) break;
    await new Promise(r => setTimeout(r, 1000));
  }

  if (processed) {
    console.log('[3] RESULT: PASS - WORKER RECONNECTED AND COMPLETED JOB');
  } else {
    console.log('[3] RESULT: FAIL - WORKER LOST CONNECTION FOREVER');
  }

  await provider.close();
  await prismaAdmin.$disconnect();
  process.exit(0);
}

testRedisFailure().catch(err => {
  console.error(err);
  process.exit(1);
});
