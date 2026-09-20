import prisma from '@db/utils/prisma';
import { requirePermissionFast } from '@/lib/auth';
import { withTenantTransaction } from '@db/utils/prisma-tenant';
import { Resource, Action, Prisma } from '@prisma/client';
import { z } from 'zod';

export const priceBookEntryCreateSchema = z.object({
  priceBookId: z.string().uuid('Invalid PriceBook ID'),
  productId: z.string().uuid('Invalid Product ID'),
  unitPrice: z.string().regex(/^\d+(\.\d+)?$/, 'Invalid Unit Price').refine((val) => {
    try {
      const d = new Prisma.Decimal(val);
      return d.gte(0);
    } catch {
      return false;
    }
  }, 'Must be a valid positive decimal'),
  isActive: z.boolean().optional().default(true),
});

export const priceBookEntryUpdateSchema = z.object({
  unitPrice: z.string().regex(/^\d+(\.\d+)?$/, 'Invalid Unit Price').refine((val) => {
    try {
      const d = new Prisma.Decimal(val);
      return d.gte(0);
    } catch {
      return false;
    }
  }, 'Must be a valid positive decimal').optional(),
  isActive: z.boolean().optional(),
});

export class PriceBookEntryService {
  static async getPriceBookEntries(tenantId: string, userId: string, priceBookId: string) {
    await requirePermissionFast(userId, Resource.REVENUE, Action.READ);

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      
      // Verify PriceBook belongs to tenant
      const priceBook = await tx.priceBook.findFirst({
        where: { id: priceBookId, tenantId },
      });
      if (!priceBook) throw new Error('PriceBook not found');

      return tx.priceBookEntry.findMany({
        where: { priceBookId, tenantId },
        include: { product: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  static async createPriceBookEntry(tenantId: string, userId: string, data: z.infer<typeof priceBookEntryCreateSchema>) {
    await requirePermissionFast(userId, Resource.REVENUE, Action.UPDATE); // Modifying PriceBook contents

    const validData = priceBookEntryCreateSchema.parse(data);

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);

      // Verify PriceBook belongs to tenant
      const priceBook = await tx.priceBook.findFirst({
        where: { id: validData.priceBookId, tenantId },
      });
      if (!priceBook) throw new Error('PriceBook not found');

      // Verify Product belongs to tenant
      const product = await tx.product.findFirst({
        where: { id: validData.productId, tenantId },
      });
      if (!product) throw new Error('Product not found');

      try {
        const entry = await tx.priceBookEntry.create({
          data: {
            tenantId,
            priceBookId: validData.priceBookId,
            productId: validData.productId,
            unitPrice: new Prisma.Decimal(validData.unitPrice),
            isActive: validData.isActive,
          },
          include: { product: true }
        });
        return entry;
      } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new Error('This product is already in the PriceBook');
        }
        throw error;
      }
    });
  }

  static async updatePriceBookEntry(tenantId: string, userId: string, entryId: string, data: z.infer<typeof priceBookEntryUpdateSchema>) {
    await requirePermissionFast(userId, Resource.REVENUE, Action.UPDATE);

    const validData = priceBookEntryUpdateSchema.parse(data);

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      
      const entry = await tx.priceBookEntry.findFirst({
        where: { id: entryId, tenantId },
      });
      if (!entry) throw new Error('PriceBookEntry not found');

      const updateData: Prisma.PriceBookEntryUpdateInput = {};
      if (validData.unitPrice !== undefined) {
        updateData.unitPrice = new Prisma.Decimal(validData.unitPrice);
      }
      if (validData.isActive !== undefined) {
        updateData.isActive = validData.isActive;
      }

      return tx.priceBookEntry.update({
        where: { id: entryId },
        data: updateData,
        include: { product: true }
      });
    });
  }
}
