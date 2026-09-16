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
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  [key: string]: any;
}

export interface QueueProvider {
  enqueue(queueName: string, jobName: string, data: JobContext, options?: JobOptions): Promise<string>;
}
