import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { JobPayload, JobQueueProvider } from './JobQueueProvider';

export class BullMQProvider implements JobQueueProvider {
  private queue: Queue;
  private connection: Redis;
  private worker: Worker | null = null;

  constructor(redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379') {
    this.connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required by bullmq
      lazyConnect: true // only connect when used
    });
    this.queue = new Queue('dr-jobs-queue', { connection: this.connection });
  }

  async enqueue(payload: JobPayload): Promise<string> {
    const jobOptions = {
      jobId: payload.metadata?.chunkId || payload.jobId, // determinism for idempotency
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
    };
    
    const addedJob = await this.queue.add('recovery-job', payload, jobOptions);
    return addedJob.id || 'unknown';
  }

  consume(workerFn: (payload: JobPayload) => Promise<void>, concurrency: number = 5): void {
    this.worker = new Worker('dr-jobs-queue', async (job: Job) => {
      await workerFn(job.data as JobPayload);
    }, {
      connection: this.connection,
      concurrency,
      lockDuration: 60000 // 60s processing lock
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err.message);
    });
  }

  async retry(queueJobId: string): Promise<boolean> {
    const job = await this.queue.getJob(queueJobId);
    if (!job) return false;
    await job.retry('failed');
    return true;
  }

  async cancel(queueJobId: string): Promise<boolean> {
    const job = await this.queue.getJob(queueJobId);
    if (!job) return false;
    await job.remove();
    return true;
  }

  async deadLetter(queueJobId: string): Promise<void> {
    const job = await this.queue.getJob(queueJobId);
    if (!job) return;
    await job.moveToFailed(new Error('Manually sent to Dead Letter'), 'manual_dlq');
  }

  async close() {
    if (this.worker) await this.worker.close();
    await this.queue.close();
    this.connection.disconnect();
  }
}
