import { describe, it, expect } from 'vitest';
import { canonicalHash, isIdempotencyKeyConflict } from '@/lib/idempotency';
import { Prisma } from '@prisma/client';

describe('Idempotency Unit Tests', () => {
  describe('canonicalHash', () => {
    it('1. should strip idempotencyKey from payload before hashing', () => {
      const hash1 = canonicalHash({ a: 1, idempotencyKey: 'key1' });
      const hash2 = canonicalHash({ a: 1 });
      expect(hash1).toBe(hash2);
    });

    it('2. should sort keys alphabetically to produce consistent hash regardless of key order', () => {
      const hash1 = canonicalHash({ a: 1, b: 2, c: 3 });
      const hash2 = canonicalHash({ c: 3, a: 1, b: 2 });
      expect(hash1).toBe(hash2);
    });

    it('3. should strip undefined values but preserve explicit nulls', () => {
      const hash1 = canonicalHash({ a: 1, b: undefined, c: null });
      const hash2 = canonicalHash({ a: 1, c: null });
      expect(hash1).toBe(hash2);
      
      const hash3 = canonicalHash({ a: 1, c: 'null' });
      expect(hash1).not.toBe(hash3);
    });

    it('4. should correctly canonicalize recursive nested objects and arrays', () => {
      const hash1 = canonicalHash({ 
        nested: { b: 2, a: 1 }, 
        arr: [{ z: 9, y: 8 }, null] 
      });
      const hash2 = canonicalHash({ 
        arr: [{ y: 8, z: 9 }, null], 
        nested: { a: 1, b: 2 } 
      });
      expect(hash1).toBe(hash2);
    });

    it('5. should produce deterministic SHA-256 hex string outputs', () => {
      const hash = canonicalHash({ test: true });
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('isIdempotencyKeyConflict', () => {
    it('6. should return true for Prisma P2002 on IdempotencyKey model', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { modelName: 'IdempotencyKey', target: ['tenantId', 'key'] }
      });
      expect(isIdempotencyKeyConflict(error)).toBe(true);
    });

    it('7. should return false for Prisma P2002 on other business models (e.g., Task, Permission)', () => {
      const error1 = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { modelName: 'Task', target: ['id'] }
      });
      expect(isIdempotencyKeyConflict(error1)).toBe(false);

      const error2 = new Error('Random error');
      expect(isIdempotencyKeyConflict(error2)).toBe(false);
    });
  });
});
