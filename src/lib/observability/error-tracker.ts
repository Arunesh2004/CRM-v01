import { logger, LogContext } from './logger';

export interface ErrorTrackerOptions {
  tags?: Record<string, string>;
  user?: { id?: string; email?: string };
}

/**
 * Provider-agnostic Error Tracking Abstraction.
 * Currently pipes to the Structured Logger.
 * Future-proofed to accept SentryAdapter, DatadogAdapter, or NewRelicAdapter.
 */
export class ErrorTracker {
  captureException(error: Error | unknown, context?: LogContext, options?: ErrorTrackerOptions) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    
    // In the future:
    // Sentry.captureException(normalizedError, { tags: options?.tags, user: options?.user });
    
    logger.error(normalizedError.message, normalizedError, { 
      ...context, 
      tags: options?.tags,
      userId: options?.user?.id
    });
  }

  captureMessage(message: string, context?: LogContext, options?: ErrorTrackerOptions) {
    // Sentry.captureMessage(message);
    logger.warn(message, { 
      ...context, 
      tags: options?.tags,
      userId: options?.user?.id 
    });
  }
}

export const errorTracker = new ErrorTracker();
