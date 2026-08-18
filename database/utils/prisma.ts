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
             if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate'].includes(operation)) {
              let mutableArgs = (args as any) || {};
              if (!mutableArgs.where) mutableArgs.where = {};
              mutableArgs.where.deletedAt = null;
              
              const result = await query(mutableArgs);
              if (model === 'AIProviderConfig') {
                if (Array.isArray(result)) {
                  result.forEach((r: any) => { if (r) delete r.encryptedApiKey; });
                } else if (result && typeof result === 'object') {
                  delete (result as any).encryptedApiKey;
                }
              }
              return result;
            }
          }
          
          const result = await query(args);
          if (model === 'AIProviderConfig') {
            if (Array.isArray(result)) {
              result.forEach((r: any) => { if (r) delete r.encryptedApiKey; });
            } else if (result && typeof result === 'object') {
              delete (result as any).encryptedApiKey;
            }
          }
          return result;
        }
      }
    }
  });
};

declare global {
  var prismaGlobal: undefined | PrismaClient;
  var prismaAdminGlobal: undefined | PrismaClient;
}

const prisma = (globalThis.prismaGlobal ?? prismaClientSingleton()) as unknown as PrismaClient;

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
