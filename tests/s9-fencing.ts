import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testS9Fencing() {
  console.log('--- Testing S9 Stale Worker Fencing ---');
  
  // Setup
  const node = await prisma.cCTVNode.create({
    data: { name: 'test-node-s9', webhookKeyId: 'test-key', webhookSecretRef: 'test-ref' }
  });
  
  const job = await prisma.recordingIngestionJob.create({
    data: {
      recordingNodeId: node.id,
      localFilePath: '/tmp/test.mp4',
      segmentId: 'seg-s9-1'
    }
  });

  // 1. Worker A claims the job but takes too long
  const workerA = 'worker-A';
  const claimedA = await prisma.recordingIngestionJob.update({
    where: { id: job.id },
    data: { status: 'PROCESSING', workerId: workerA, leaseExpiresAt: new Date(Date.now() - 1000) } // Already expired!
  });

  // 2. Worker B reclaims the job (because it's expired)
  const workerB = 'worker-B';
  const claimedB = await prisma.recordingIngestionJob.updateMany({
    where: { id: job.id, leaseExpiresAt: { lt: new Date() } },
    data: { status: 'PROCESSING', workerId: workerB, leaseExpiresAt: new Date(Date.now() + 60000) }
  });

  if (claimedB.count !== 1) {
    throw new Error('Worker B failed to reclaim the expired job');
  }

  // 3. Worker A tries to complete the job
  try {
    await prisma.$transaction(async (tx) => {
      const completion = await tx.recordingIngestionJob.updateMany({
        where: { id: job.id, workerId: workerA, status: 'PROCESSING', leaseExpiresAt: { gt: new Date() } },
        data: { status: 'COMPLETED', workerId: null, leaseExpiresAt: null }
      });
      if (completion.count !== 1) throw new Error('Lease lost before completion');
    });
    console.error('❌ Worker A successfully completed a stale job! FENCING FAILED.');
    process.exit(1);
  } catch (err: any) {
    if (err.message === 'Lease lost before completion') {
      console.log('✔ Worker A stale write rejected (transaction rolled back). FENCING PASSED.');
    } else {
      throw err;
    }
  }

  // Cleanup
  await prisma.recordingIngestionJob.delete({ where: { id: job.id } });
  await prisma.cCTVNode.delete({ where: { id: node.id } });
}

testS9Fencing().catch(console.error).finally(() => prisma.$disconnect());
