import { PrismaClient, Prisma } from '@prisma/client';

if (!process.env.ADMIN_DATABASE_URL) {
  throw new Error('SECURITY_ERROR: ADMIN_DATABASE_URL must be strictly defined for system execution.');
}

const globalSystemPrisma = new PrismaClient({
  datasources: { db: { url: process.env.ADMIN_DATABASE_URL } }
});
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
  context?: any
): Promise<T> {
  console.log(JSON.stringify({
    level: 'warn',
    message: 'System RLS Bypass Invoked',
    operation,
    timestamp: new Date().toISOString(),
    context,
    environment: process.env.NODE_ENV
  }));

  return await globalSystemPrisma.$transaction(async (tx) => {
    return await handler(tx);
  }, {
    maxWait: 25000,
    timeout: 25000
  });
}
