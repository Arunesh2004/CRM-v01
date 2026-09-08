import { Prisma } from '@prisma/client';

/**
 * Deeply clones an object, converting any Prisma.Decimal instances to strings.
 * This is safe to use at the Server Action / RSC boundary.
 */
export function serializeDecimal<T>(obj: T): any {
  if (obj === null || obj === undefined) return obj;

  if (Prisma.Decimal.isDecimal(obj)) {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeDecimal(item));
  }

  if (typeof obj === 'object') {
    if (obj instanceof Date) {
      return obj; // Let Next.js handle Date objects
    }
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = serializeDecimal((obj as any)[key]);
      }
    }
    return result;
  }

  return obj;
}
