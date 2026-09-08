import { PrismaClient } from "@prisma/client";

const softDeleteModels = [
  'Tenant', 'User', 'Role', 'Incident', 'Camera', 'AIEvent', 
  'Customer', 'Lead', 'Task', 'Location'
];

const connectionUrl = process.env.DATABASE_URL;

const getBasePrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' 
      ? ['error', 'warn'] 
      : ['query', 'error', 'warn'],
  });
};

const prismaClientSingleton = (baseClient: PrismaClient) => {
  return baseClient.$extends({
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

// Unfiltered client exclusively for Recovery / Admin / Background tasks
export const prismaAdmin = globalThis.prismaAdminGlobal ?? getBasePrismaClient();

const prisma = (globalThis.prismaGlobal ?? prismaClientSingleton(prismaAdmin)) as unknown as PrismaClient;

export default prisma;

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
  globalThis.prismaAdminGlobal = prismaAdmin;
}

// Graceful shutdown handling for containerized environments
if (process.env.NODE_ENV === 'production') {
  process.on('SIGINT', async () => {
    await prismaAdmin.$disconnect();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await prismaAdmin.$disconnect();
    process.exit(0);
  });
}
