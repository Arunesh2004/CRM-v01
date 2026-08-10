export interface JobPayload {
  jobId: string;
  type: 'BACKUP' | 'RESTORE';
  tenantId: string;
  requestedBy: string;
  metadata?: any;
}

export interface JobQueueProvider {
  /**
   * Pushes a new background job onto the queue.
   */
  enqueue(payload: JobPayload): Promise<string>;

  /**
   * Registers a worker function to consume jobs off the queue.
   * Concurrency is managed by the provider implementation.
   */
  consume(workerFn: (payload: JobPayload) => Promise<void>, concurrency?: number): void;

  /**
   * Forces a retry of a failed job.
   */
  retry(queueJobId: string): Promise<boolean>;

  /**
   * Cancels a pending job before it starts executing.
   */
  cancel(queueJobId: string): Promise<boolean>;

  /**
   * Moves an exhausted job to the Dead Letter Queue for manual inspection.
   */
  deadLetter(queueJobId: string): Promise<void>;
}
