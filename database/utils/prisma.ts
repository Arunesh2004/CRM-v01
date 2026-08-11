import { PrismaClient } from "@prisma/client";

const softDeleteModels = [
  'Tenant', 'User', 'Role', 'Message', 'Conversation', 'Call', 'CallRecording', 
  'CallTranscript', 'AISummary', 'Incident', 'Camera', 'AIEvent', 
  'Subscription', 'Invoice', 'Payment', 'Customer', 'Lead', 'Task', 'Location'
];

const connectionUrl = process.env.DATABASE_URL;

const basePrismaClient = new PrismaClient({
  log: process.env.NODE_ENV === 'production' 
    ? ['error', 'warn'] 
    : ['query', 'error', 'warn'],
});

const prismaClientSingleton = () => {
  return basePrismaClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (softDeleteModels.includes(model as string)) {
             // We do NOT intercept findUnique here because it breaks the extension chain
             // for dynamic extensions like withTenant.
             // withTenant handles converting findUnique to findFirst.
             if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate'].includes(operation)) {
              let mutableArgs = (args as any) || {};
              if (!mutableArgs.where) mutableArgs.where = {};
              mutableArgs.where.deletedAt = null;
              return query(mutableArgs);
            }
          }
          return query(args);
        }
      }
    }
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
  var prismaAdminGlobal: undefined | PrismaClient;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// Unfiltered client exclusively for Recovery / Admin / Background tasks
export const prismaAdmin = globalThis.prismaAdminGlobal ?? basePrismaClient;

export default prisma;

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
  globalThis.prismaAdminGlobal = prismaAdmin;
}

// Graceful shutdown handling for containerized environments
if (process.env.NODE_ENV === 'production') {
  process.on('SIGINT', async () => {
    await basePrismaClient.$disconnect();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await basePrismaClient.$disconnect();
    process.exit(0);
  });
}
