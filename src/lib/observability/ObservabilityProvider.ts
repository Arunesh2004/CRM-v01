export interface MetricTags {
  tenantId?: string;
  jobId?: string;
  [key: string]: string | undefined;
}

export interface ObservabilityProvider {
  /**
   * Record a numerical metric (e.g., duration, size)
   */
  gauge(metricName: string, value: number, tags?: MetricTags): void;

  /**
   * Increment a counter (e.g., backup_success, unauthorized_attempt)
   */
  increment(metricName: string, value?: number, tags?: MetricTags): void;

  /**
   * Emit an error log that triggers an alert workflow.
   */
  error(message: string, error?: Error, tags?: MetricTags): void;

  /**
   * Traces an asynchronous workflow.
   */
  trace<T>(operationName: string, tags: MetricTags, fn: () => Promise<T>): Promise<T>;
}
