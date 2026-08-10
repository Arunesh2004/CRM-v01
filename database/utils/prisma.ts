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
            // Check if it's a read query
            if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate'].includes(operation)) {
              
              // Ensure args is an object
              let mutableArgs = (args as any) || {};
              if (!mutableArgs.where) mutableArgs.where = {};

              // Apply automatic soft delete filter
              mutableArgs.where.deletedAt = null;

              // If it's findUnique and we added deletedAt, we must convert to findFirst
              // because deletedAt is not part of the unique index.
              if (operation === 'findUnique') {
                return (basePrismaClient as any)[model as string].findFirst(mutableArgs);
              }
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
