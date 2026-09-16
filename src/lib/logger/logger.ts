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
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  static info(msg: string, ...args: any[]) { logger.info({ args: redact(args), ...injectContext() }, redact(msg)); }
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  static error(msg: string, ...args: any[]) { logger.error({ args: redact(args), ...injectContext() }, redact(msg)); }
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  static warn(msg: string, ...args: any[]) { logger.warn({ args: redact(args), ...injectContext() }, redact(msg)); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  static debug(msg: string, ...args: any[]) { logger.debug({ args: redact(args), ...injectContext() }, redact(msg)); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  static fatal(msg: string, ...args: any[]) { logger.fatal({ args: redact(args), ...injectContext() }, redact(msg)); }
   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
  static time(label: string): () => number { 
     
    const start = Date.now();
     
    return () => Date.now() - start;
   
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  info(msg: string, ...args: any[]) { logger.info({ args: redact(args), ...injectContext() }, redact(msg)); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  error(msg: string, ...args: any[]) { logger.error({ args: redact(args), ...injectContext() }, redact(msg)); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  warn(msg: string, ...args: any[]) { logger.warn({ args: redact(args), ...injectContext() }, redact(msg)); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  debug(msg: string, ...args: any[]) { logger.debug({ args: redact(args), ...injectContext() }, redact(msg)); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  fatal(msg: string, ...args: any[]) { logger.fatal({ args: redact(args), ...injectContext() }, redact(msg)); }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
  time(label: string): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }
}
