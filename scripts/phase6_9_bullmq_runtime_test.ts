import { BullMQProvider } from '../src/lib/queue/BullMQProvider';
import { prismaAdmin } from '../database/utils/prisma';
import crypto from 'crypto';
import { JobPayload } from '../src/lib/queue/JobQueueProvider';

async function testBullMQ() {
  console.log('--- BULLMQ RUNTIME VERIFICATION ---');
  process.env.REDIS_URL = 'redis://localhost:6380';
  const provider = new BullMQProvider();

  const jobId = crypto.randomUUID();
  const chunkId = `chunk_${jobId}`;
  const tenantId = crypto.randomUUID(); // Mock isolated tenant for test
  
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

  console.log('[2] CONSUMING JOB...');
  let processed = false;
  provider.consume(async (payload: JobPayload) => {
    console.log(`Worker processing chunk ${payload.metadata.chunkId}...`);
    // mock heavy work
    await new Promise(r => setTimeout(r, 1000));
    console.log('Worker finished chunk processing.');
    processed = true;
  }, 1);

  // Wait for processing
  for(let i = 0; i < 10; i++) {
    if (processed) break;
    await new Promise(r => setTimeout(r, 1000));
  }

  if (processed) {
    console.log('[3] RESULT: PASS - WORKER CONSUMED QUEUE PAYLOAD SUCCESSFULLY');
  } else {
    console.log('[3] RESULT: FAIL - WORKER DID NOT CONSUME PAYLOAD');
  }

  await provider.close();
  await prismaAdmin.$disconnect();
  process.exit(0);
}

testBullMQ().catch(err => {
  console.error(err);
  process.exit(1);
});
