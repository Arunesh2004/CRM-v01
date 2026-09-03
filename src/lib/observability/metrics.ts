import { logger, LogContext } from './logger';

export type MetricName = 
  | 'request_latency' 
  | 'database_error' 
  | 'auth_failure' 
  | 'action_failed' 
  | 'restore_failure'
  | 'backup_success';

export type MetricTags = {
  job_type?: string;
  operation?: string;
  status?: string;
  error_code?: string;
  dependency?: string;
  // High-cardinality tags are explicitly forbidden
  requestId?: never;
  userId?: never;
  tenantId?: never;
  url?: never;
};

/**
 * Lightweight Metrics Tracker.
 * Emits metrics into the structured log stream for ingestion by a time-series DB or APM.
 */
export class Metrics {
  increment(metric: MetricName, value: number = 1, tags?: MetricTags) {
    logger.info(`METRIC: ${metric}`, { metric_name: metric, value, metric_type: 'count', ...tags });
  }

  timing(metric: MetricName, durationMs: number, tags?: MetricTags) {
    logger.info(`METRIC: ${metric}`, { metric_name: metric, durationMs, metric_type: 'timing', ...tags });
  }

  gauge(metric: MetricName, value: number, tags?: MetricTags) {
    logger.info(`METRIC: ${metric}`, { metric_name: metric, value, metric_type: 'gauge', ...tags });
  }
}

export const metrics = new Metrics();
