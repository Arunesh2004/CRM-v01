import { PrismaClient, Prisma } from '@prisma/client';
import { Logger } from '../../src/lib/logger/logger';

let globalSystemPrisma: PrismaClient | null = null;

function getSystemPrisma(): PrismaClient {
  let url = process.env.ADMIN_DATABASE_URL;
  if (!url) {
    throw new Error('SECURITY_ERROR: ADMIN_DATABASE_URL must be strictly defined for system execution.');
  }
  
  // Safely ensure PgBouncer compatibility for Vercel/Supabase transaction pooler
  if (!url.includes('pgbouncer=true')) {
    url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }
  
  if (!globalSystemPrisma) {
    globalSystemPrisma = new PrismaClient({
      datasources: { db: { url } }
    });
  }
  
  return globalSystemPrisma;
}
export enum SystemOperation {
  AUTH_BOOTSTRAP = 'AUTH_BOOTSTRAP',
  CLERK_PROVISIONING = 'CLERK_PROVISIONING',
  DEMO_SEED = 'DEMO_SEED',
  PLATFORM_CRON = 'PLATFORM_CRON',
  SECURITY_AUDIT = 'SECURITY_AUDIT',
  MIGRATION_TASK = 'MIGRATION_TASK',
  EXTERNAL_WEBHOOK_PROCESS = 'EXTERNAL_WEBHOOK_PROCESS',
  DISASTER_RECOVERY = 'DISASTER_RECOVERY'
}

export async function executeAsSystem<T>(
  operation: SystemOperation,
  handler: (tx: Prisma.TransactionClient) => Promise<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: System context allows arbitrary types
  context?: any
): Promise<T> {
  const startTime = Date.now();
  
  // Safe categorical logging without dumping the raw execution context
  Logger.warn('System RLS Bypass Invoked', {
    operation,
    environment: process.env.NODE_ENV,
    hasContext: !!context
  });

  try {
    const prisma = getSystemPrisma();
    const result = await prisma.$transaction(async (tx) => {
      return await handler(tx);
    }, {
      maxWait: 25000,
      timeout: 25000
    });
    
    Logger.info('System RLS Bypass Completed', {
      operation,
      durationMs: Date.now() - startTime
    });
    
    return result;
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    Logger.error('System RLS Bypass Failed', {
      operation,
      durationMs: Date.now() - startTime,
      error: error.message
    });
    throw error;
  }
}
