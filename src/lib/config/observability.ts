import pino from 'pino';

// Centralized application logger
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'token',
      'secret',
      'apiKey',
    ],
    remove: true,
  },
});

// A placeholder for external APM (e.g. Sentry/Datadog)
export function captureException(error: unknown, context?: Record<string, any>) {
  logger.error({ err: error, context }, 'Unhandled Exception Caught');
  // if (process.env.NEXT_PUBLIC_SENTRY_DSN) Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, context?: Record<string, any>) {
  logger.info({ context }, message);
}
