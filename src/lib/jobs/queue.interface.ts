export interface JobOptions {
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  priority?: number;
}

export interface JobContext {
  tenantId: string;
  [key: string]: any;
}

export interface QueueProvider {
  enqueue(queueName: string, jobName: string, data: JobContext, options?: JobOptions): Promise<string>;
}
