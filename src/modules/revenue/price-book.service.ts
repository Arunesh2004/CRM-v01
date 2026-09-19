import prisma from '@db/utils/prisma';
import { requirePermissionFast } from '@/lib/auth';
import { withTenantTransaction } from '@db/utils/prisma-tenant';
import { Resource, Action } from '@prisma/client';
import { z } from 'zod';

export const priceBookCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  description: z.string().optional().nullable(),
  currencyCode: z.string().min(3).max(3).optional().default('USD'),
  isActive: z.boolean().optional().default(true),
});

export const priceBookUpdateSchema = priceBookCreateSchema.partial();

export class PriceBookService {
  static async getPriceBooks(tenantId: string, userId: string) {
    await requirePermissionFast(userId, Resource.REVENUE, Action.READ);

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      return tx.priceBook.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
      });
    });
  }

  static async getPriceBook(tenantId: string, userId: string, priceBookId: string) {
    await requirePermissionFast(userId, Resource.REVENUE, Action.READ);

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      const priceBook = await tx.priceBook.findFirst({
        where: { id: priceBookId, tenantId },
      });

      if (!priceBook) {
        throw new Error('PriceBook not found');
      }

      return priceBook;
    });
  }

  static async createPriceBook(tenantId: string, userId: string, data: z.infer<typeof priceBookCreateSchema>) {
    await requirePermissionFast(userId, Resource.REVENUE, Action.CREATE);

    const validData = priceBookCreateSchema.parse(data);

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      return tx.priceBook.create({
        data: {
          tenantId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Matches existing conventions
          ...(validData as any),
        },
      });
    });
  }

  static async updatePriceBook(tenantId: string, userId: string, priceBookId: string, data: z.infer<typeof priceBookUpdateSchema>) {
    await requirePermissionFast(userId, Resource.REVENUE, Action.UPDATE);

    const validData = priceBookUpdateSchema.parse(data);

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      const priceBook = await tx.priceBook.findFirst({
        where: { id: priceBookId, tenantId },
      });

      if (!priceBook) {
        throw new Error('PriceBook not found');
      }

      return tx.priceBook.update({
        where: { id: priceBookId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Matches existing conventions
        data: validData as any,
      });
    });
  }

  static async deactivatePriceBook(tenantId: string, userId: string, priceBookId: string) {
    await requirePermissionFast(userId, Resource.REVENUE, Action.DELETE);

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      const priceBook = await tx.priceBook.findFirst({
        where: { id: priceBookId, tenantId },
      });

      if (!priceBook) {
        throw new Error('PriceBook not found');
      }

      return tx.priceBook.update({
        where: { id: priceBookId },
        data: { isActive: false },
      });
    });
  }
}
