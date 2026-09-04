import pino from 'pino';
import { redact } from '../observability/redact';
import { getContext } from '../observability/context';

const isProduction = process.env.NODE_ENV === 'production';
const allowedLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
const rawLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const safeLevel = allowedLevels.includes(rawLevel) ? rawLevel : 'info';

export const logger = pino({
  level: safeLevel,
  ...(isProduction ? {} : {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
});

function injectContext() {
  const ctx = getContext();
  if (!ctx) return {};
  return { tenantId: ctx.tenantId, jobId: ctx.jobId, requestId: ctx.requestId };
}

export class Logger {
  static info(msg: string, ...args: any[]) { logger.info({ args: redact(args), ...injectContext() }, redact(msg)); }
  static error(msg: string, ...args: any[]) { logger.error({ args: redact(args), ...injectContext() }, redact(msg)); }
  static warn(msg: string, ...args: any[]) { logger.warn({ args: redact(args), ...injectContext() }, redact(msg)); }
  static debug(msg: string, ...args: any[]) { logger.debug({ args: redact(args), ...injectContext() }, redact(msg)); }
  static fatal(msg: string, ...args: any[]) { logger.fatal({ args: redact(args), ...injectContext() }, redact(msg)); }
  static time(label: string): () => number { 
    const start = Date.now();
    return () => Date.now() - start;
  }
  info(msg: string, ...args: any[]) { logger.info({ args: redact(args), ...injectContext() }, redact(msg)); }
  error(msg: string, ...args: any[]) { logger.error({ args: redact(args), ...injectContext() }, redact(msg)); }
  warn(msg: string, ...args: any[]) { logger.warn({ args: redact(args), ...injectContext() }, redact(msg)); }
  debug(msg: string, ...args: any[]) { logger.debug({ args: redact(args), ...injectContext() }, redact(msg)); }
  fatal(msg: string, ...args: any[]) { logger.fatal({ args: redact(args), ...injectContext() }, redact(msg)); }
  time(label: string): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }
}
