export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogContext {
  tenantId?: string;
  requestId?: string;
  userId?: string;
  [key: string]: any;
}

/**
 * Enterprise Structured JSON Logger.
 * Outputs parseable JSON for seamless Datadog / CloudWatch ingestion.
 */
export class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
      ...(error && {
        error: {
          message: error.message,
          name: error.name,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
        }
      })
    };
    return JSON.stringify(payload);
  }

  info(message: string, context?: LogContext) {
    console.log(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error, context?: LogContext) {
    console.error(this.formatMessage('error', message, context, error));
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }
}

export const logger = new Logger();
