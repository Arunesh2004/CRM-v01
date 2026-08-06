export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type ErrorCategory = 'network' | 'validation' | 'database' | 'auth' | 'internal' | 'external_api';

export interface LoggerContext {
  tenantId?: string;
  requestId?: string;
  correlationId?: string;
  userId?: string;
  durationMs?: number;
  [key: string]: any;
}

export interface ErrorContext extends LoggerContext {
  category?: ErrorCategory;
  isFatal?: boolean;
}

// Abstraction for future OTel/Sentry integrations
export interface ObservabilityProvider {
  captureException(error: Error, context?: ErrorContext): void;
  captureMessage(message: string, level: LogLevel, context?: LoggerContext): void;
}

export class DefaultObservabilityProvider implements ObservabilityProvider {
  captureException(error: Error, context?: ErrorContext): void {
    // Scaffold for Sentry.captureException
  }
  
  captureMessage(message: string, level: LogLevel, context?: LoggerContext): void {
    // Scaffold for Sentry.captureMessage or OTel traces
  }
}

export class Logger {
  private static observability: ObservabilityProvider = new DefaultObservabilityProvider();

  private static sanitize(context: any): any {
    if (!context) return undefined;
    const sanitized = { ...context };
    const secretKeys = ['password', 'token', 'secret', 'key', 'credential'];
    
    for (const key of Object.keys(sanitized)) {
      if (secretKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  private static log(level: LogLevel, message: string, context?: LoggerContext, error?: Error) {
    const sanitizedContext = this.sanitize(context);
    const logPayload: any = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...sanitizedContext
    };

    if (error) {
      logPayload.error = error.message;
      logPayload.stack = error.stack;
    }

    if (level === 'error' || level === 'fatal') {
      console.error(JSON.stringify(logPayload));
      if (error) this.observability.captureException(error, sanitizedContext);
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logPayload));
    } else {
      console.log(JSON.stringify(logPayload));
    }
    
    this.observability.captureMessage(message, level, sanitizedContext);
  }

  static debug(message: string, context?: LoggerContext) { this.log('debug', message, context); }
  static info(message: string, context?: LoggerContext) { this.log('info', message, context); }
  static warn(message: string, context?: LoggerContext) { this.log('warn', message, context); }
  static error(message: string, error: Error, context?: ErrorContext) { this.log('error', message, context, error); }
  static fatal(message: string, error: Error, context?: ErrorContext) { 
    this.log('fatal', message, { ...context, isFatal: true }, error); 
  }
  
  static time(operationName: string): () => number {
    const start = performance.now();
    return () => Math.round(performance.now() - start);
  }
}
