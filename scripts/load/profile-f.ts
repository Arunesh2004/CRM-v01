import { NextRequest } from "next/server";
import { POST } from "../../src/app/api/webhooks/mediamtx/record/route";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const globalPrisma = new PrismaClient();

async function runProfileF() {
  console.log('--- Phase 11 Profile F (CCTV Mock Webhook) ---');
  
  // Create a mock node for testing
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const nodeKeyId = 'mock_node_key_' + Date.now();
  const secret = 'mock_secret_123';
  process.env.MOCK_CCTV_SECRET = secret;

  const node = await globalPrisma.cCTVNode.create({
    data: {
      name: 'Load Test Node',
      status: 'HEALTHY',
      webhookKeyId: nodeKeyId,
      webhookSecretRef: 'MOCK_CCTV_SECRET'
    }
  });

  const concurrency = parseInt(process.env.CONCURRENCY || '50');
  const iterations = parseInt(process.env.ITERATIONS || '10');

  const start = Date.now();
  let errors = 0;
  const latencies: number[] = [];

  const workers = Array.from({ length: concurrency }).map(async (_, workerId) => {
    for (let i = 0; i < iterations; i++) {
      const timestamp = Date.now();
      const nonce = crypto.randomUUID();
      // Opaque path must be valid base64 for tenantId
      const opaquePath = Buffer.from(JSON.stringify({ tenantId, locationId: 'l1', cameraId: 'c1' })).toString('base64');
      
      const payload = {
        path: opaquePath,
        file: `/var/recordings/${opaquePath}/video_${workerId}_${i}.mp4`,
        recordingEventTimestamp: timestamp
      };

      const rawBody = JSON.stringify(payload);
      const expectedHmac = crypto
        .createHmac("sha256", secret)
        .update(`${timestamp}.${nonce}.${rawBody}`)
        .digest("hex");

      // Inject adversarial request occasionally
      const isAdversarial = (i === iterations - 1 && workerId === 0);
      const testHmac = isAdversarial ? 'badhmac' : expectedHmac;

      const req = new NextRequest('http://localhost/api/webhooks/mediamtx/record', {
        method: 'POST',
        headers: {
          'x-node-key-id': nodeKeyId,
          'x-hmac-signature': testHmac,
          'x-timestamp': timestamp.toString(),
          'x-nonce': nonce
        },
        body: rawBody
      });

      try {
        const opStart = Date.now();
        const res = await POST(req);
        if (isAdversarial && res.status !== 401) {
          console.error('Adversarial request bypassed security!', res.status);
          errors++;
        }
        if (!isAdversarial && res.status !== 200) {
          const body = await res.text();
          console.error('Failed request:', res.status, body);
          errors++;
        }
        latencies.push(Date.now() - opStart);
      } catch (e) {
        errors++;
        console.error(e);
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
  console.log(`Webhook Throughput: ${((concurrency * iterations) / (duration / 1000)).toFixed(2)} ops/sec`);

  // Cleanup
  await globalPrisma.cCTVNode.delete({ where: { id: node.id } });
  await globalPrisma.$disconnect();
}

runProfileF().catch(console.error);
