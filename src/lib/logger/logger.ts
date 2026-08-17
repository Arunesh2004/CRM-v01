import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isProduction ? {} : {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
});

export class Logger {
  static info(msg: string, ...args: any[]) { logger.info({ args }, msg); }
  static error(msg: string, ...args: any[]) { logger.error({ args }, msg); }
  static warn(msg: string, ...args: any[]) { logger.warn({ args }, msg); }
  static debug(msg: string, ...args: any[]) { logger.debug({ args }, msg); }
  static fatal(msg: string, ...args: any[]) { logger.fatal({ args }, msg); }
  static time(label: string): () => number { 
    const start = Date.now();
    return () => Date.now() - start;
  }
  info(msg: string, ...args: any[]) { logger.info({ args }, msg); }
  error(msg: string, ...args: any[]) { logger.error({ args }, msg); }
  warn(msg: string, ...args: any[]) { logger.warn({ args }, msg); }
  debug(msg: string, ...args: any[]) { logger.debug({ args }, msg); }
  fatal(msg: string, ...args: any[]) { logger.fatal({ args }, msg); }
  time(label: string): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }
}
