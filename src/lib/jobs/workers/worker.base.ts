import { JobContext } from '../queue.interface';
import { Logger } from '../../logger/logger';

export abstract class BaseWorker<T extends JobContext> {
  protected queueName: string;
  protected isShuttingDown: boolean = false;

  constructor(queueName: string) {
    this.queueName = queueName;
  }

  /**
   * Main processing implementation. Must be implemented by concrete workers.
   */
  protected abstract processJob(jobId: string, data: T): Promise<void>;

  /**
   * Simulates the BullMQ Worker runtime wrapper.
   */
  async execute(jobId: string, data: T, attempt: number = 1): Promise<void> {
    if (this.isShuttingDown) {
      Logger.warn(`Worker for ${this.queueName} is shutting down, rejecting job ${jobId}`);
      throw new Error('Worker shutting down');
    }

    if (!data.tenantId) {
      const err = new Error('CRITICAL: Job attempted execution without tenant context');
      Logger.fatal(`Tenant Isolation Violation in ${this.queueName}`, err, { jobId });
      throw err;
    }

    const endTimer = Logger.time(`job_${jobId}`);
    
    try {
      Logger.info(`Starting job ${jobId} (Attempt ${attempt})`, { tenantId: data.tenantId, queue: this.queueName, jobId });
      
      // Execute the concrete logic
      await this.processJob(jobId, data);
      
      const durationMs = endTimer();
      Logger.info(`Completed job ${jobId}`, { tenantId: data.tenantId, queue: this.queueName, jobId, durationMs });
    } catch (err: any) {
      const durationMs = endTimer();
      Logger.error(`Job ${jobId} failed on attempt ${attempt}`, err, { 
        tenantId: data.tenantId, 
        queue: this.queueName, 
        jobId, 
        durationMs,
        category: 'internal'
      });
      
      // Throw to BullMQ to trigger retry / DLQ logic
      throw err;
    }
  }

  async gracefulShutdown(): Promise<void> {
    Logger.info(`Initiating graceful shutdown for worker ${this.queueName}...`);
    this.isShuttingDown = true;
    // Real implementation would await worker.close()
  }
}
