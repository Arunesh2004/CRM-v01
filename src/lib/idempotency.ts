import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import globalPrisma from '@db/utils/prisma';
import { IdempotencyConflictError } from '@/infrastructure/errors';

export const IdempotencyOperations = {
  CREATE_TASK: 'CREATE_TASK',
  CREATE_TICKET: 'CREATE_TICKET',
  CREATE_INCIDENT: 'CREATE_INCIDENT',
} as const;

export type IdempotencyOperation = typeof IdempotencyOperations[keyof typeof IdempotencyOperations];

export function isIdempotencyKeyConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    (error.meta as Record<string, unknown>)?.modelName === 'IdempotencyKey'
  );
}

function sortObjectKeys(obj: unknown): unknown {
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  if (typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((result: Record<string, unknown>, key) => {
        if ((obj as Record<string, unknown>)[key] !== undefined) {
          result[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
        }
        return result;
      }, {});
  }
  return obj;
}

export function canonicalHash(payload: object): string {
  const { idempotencyKey: _, ...rest } = payload as Record<string, unknown>;
  const sorted = sortObjectKeys(rest);
  const stringified = JSON.stringify(sorted);
  return crypto.createHash('sha256').update(stringified).digest('hex');
}

export async function withIdempotency<T extends { id: string }>(
  tenantId: string,
  userId: string,
  operation: IdempotencyOperation,
  idempotencyKey: string,
  validatedDto: object,
  businessFn: (tx: Prisma.TransactionClient) => Promise<T>,
  fetchResource: (tenantId: string, userId: string, resourceId: string) => Promise<T | null>
): Promise<T> {
  const reqHash = canonicalHash(validatedDto);
  const now = new Date();

  const existingKey = await globalPrisma.idempotencyKey.findUnique({
    where: { tenantId_key: { tenantId, key: idempotencyKey } },
  });

  if (existingKey) {
    if (existingKey.expiresAt > now) {
      if (existingKey.operation !== operation) {
        throw new IdempotencyConflictError();
      }
      if (existingKey.requestHash !== reqHash) {
        throw new IdempotencyConflictError();
      }
      
      if (existingKey.resourceId) {
        const resource = await fetchResource(tenantId, userId, existingKey.resourceId);
        if (!resource) {
          throw new Error('NotFound: The resource was previously created but is no longer accessible.');
        }
        return resource;
      } else {
        throw new IdempotencyConflictError();
      }
    }
  }

  try {
    const result = await globalPrisma.$transaction(async (tx) => {
      await tx.idempotencyKey.deleteMany({
        where: {
          tenantId,
          key: idempotencyKey,
          expiresAt: { lte: now }
        }
      });

      await tx.idempotencyKey.create({
        data: {
          tenantId,
          key: idempotencyKey,
          operation,
          requestHash: reqHash,
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000)
        }
      });

      const res = await businessFn(tx);
      
      await tx.idempotencyKey.update({
        where: { tenantId_key: { tenantId, key: idempotencyKey } },
        data: { resourceId: res.id }
      });

      return res;
    });

    return result;
  } catch (error) {
    if (isIdempotencyKeyConflict(error)) {
      const winner = await globalPrisma.idempotencyKey.findUnique({
        where: { tenantId_key: { tenantId, key: idempotencyKey } },
      });

      if (!winner || winner.expiresAt <= now) {
         throw new Error('CONCURRENCY_CONFLICT: Please try again.');
      }

      if (winner.operation !== operation || winner.requestHash !== reqHash) {
        throw new IdempotencyConflictError();
      }

      if (winner.resourceId) {
        const resource = await fetchResource(tenantId, userId, winner.resourceId);
        if (!resource) {
          throw new Error('NotFound: The resource was previously created but is no longer accessible.');
        }
        return resource;
      }
      
      throw new IdempotencyConflictError();
    }

    throw error;
  }
}
