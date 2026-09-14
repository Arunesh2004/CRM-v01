import { requestContext } from '@/lib/observability/context';
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
      eventOutbox: {
        async $allOperations({ operation, args, query }) {
          if (['create', 'createMany', 'update', 'upsert'].includes(operation)) {
            const ctx = requestContext.getStore();
            const processData = (data: any) => {
              if (data && typeof data === 'object' && data.payload && typeof data.payload === 'object') {
                if (ctx?.requestId || ctx?.jobId) {
                  data.payload._sys_correlationId = ctx.requestId || ctx.jobId;
                } else {
                  // Aggressively remove any user-spoofed correlation ID if no trusted context exists
                  delete data.payload._sys_correlationId;
                }
              }
            };
            if (args && 'data' in args && args.data) {
              if (Array.isArray(args.data)) args.data.forEach(processData);
              else processData(args.data);
            }
          }
          return query(args);
        }
      },

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
      },
      cameraStream: {
        async $allOperations({ operation, args, query }) {
          if (['create', 'update', 'upsert', 'createMany', 'updateMany'].includes(operation)) {
            const checkStreamUrl = (urlStr: unknown) => {
              if (typeof urlStr === 'string' && urlStr) {
                try {
                  const parsed = new URL(urlStr);
                  if (parsed.username !== '' || parsed.password !== '') {
                    throw new Error('SECURITY VIOLATION: CameraStream.streamUrl cannot contain embedded credentials');
                  }
                } catch (e: unknown) {
                  if (e instanceof Error && e.message.startsWith('SECURITY VIOLATION')) throw e;
                  throw new Error('SECURITY VIOLATION: Malformed streamUrl is rejected');
                }
              }
            };

            const validateData = (item: unknown) => {
              if (!item || typeof item !== 'object') return;
              const obj = item as Record<string, unknown>;
              if (!obj.streamUrl) return;
              const streamUrlVal = obj.streamUrl;
              const urlVal = typeof streamUrlVal === 'string' ? streamUrlVal : (streamUrlVal && typeof streamUrlVal === 'object' && 'set' in streamUrlVal ? (streamUrlVal as Record<string, unknown>).set : undefined);
              checkStreamUrl(urlVal);
            };

            const dataArg = (args as { data?: unknown })?.data;
            if (dataArg) {
              if (Array.isArray(dataArg)) {
                dataArg.forEach(validateData);
              } else {
                validateData(dataArg);
              }
            }

            if (operation === 'upsert') {
              const upsertArgs = args as { create?: unknown; update?: unknown };
              validateData(upsertArgs.create);
              validateData(upsertArgs.update);
            }
          }
          return query(args);
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
