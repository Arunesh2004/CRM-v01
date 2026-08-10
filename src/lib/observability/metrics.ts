import { logger, LogContext } from './logger';

export type MetricName = 
  | 'request_latency' 
  | 'database_error' 
  | 'auth_failure' 
  | 'action_failed' 
  | 'restore_failure'
  | 'backup_success';

/**
 * Lightweight Metrics Tracker.
 * Emits metrics into the structured log stream for ingestion by a time-series DB or APM.
 */
export class Metrics {
  increment(metric: MetricName, value: number = 1, context?: LogContext) {
    logger.info(`METRIC: ${metric}`, { metric, value, type: 'count', ...context });
  }

  timing(metric: MetricName, durationMs: number, context?: LogContext) {
    logger.info(`METRIC: ${metric}`, { metric, durationMs, type: 'timing', ...context });
  }

  gauge(metric: MetricName, value: number, context?: LogContext) {
    logger.info(`METRIC: ${metric}`, { metric, value, type: 'gauge', ...context });
  }
}

export const metrics = new Metrics();
