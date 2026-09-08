import { Prisma } from '@prisma/client';
import prisma from '@db/utils/prisma';
import { requirePermissionFast } from '@/lib/auth';
import { withTenantTransaction } from '@db/utils/prisma-tenant';
import { Resource, Action } from '@prisma/client';
import { z } from 'zod';

export const productCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  familyId: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  metadata: z.any().optional().nullable(),
});

export const productUpdateSchema = productCreateSchema.partial();

export class ProductService {
  static async getProducts(tenantId: string, userId: string) {
    await requirePermissionFast(userId, Resource.PRODUCT, Action.READ);

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      return tx.product.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
      });
    });
  }

  static async getProduct(tenantId: string, userId: string, productId: string) {
    await requirePermissionFast(userId, Resource.PRODUCT, Action.READ);

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      const product = await tx.product.findFirst({
        where: { id: productId, tenantId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      return product;
    });
  }

  static async createProduct(tenantId: string, userId: string, data: z.infer<typeof productCreateSchema>) {
    await requirePermissionFast(userId, Resource.PRODUCT, Action.CREATE);

    const validData = productCreateSchema.parse(data);

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      return tx.product.create({
        data: {
          tenantId,
          ...(validData as any),
        },
      });
    });
  }

  static async updateProduct(tenantId: string, userId: string, productId: string, data: z.infer<typeof productUpdateSchema>) {
    await requirePermissionFast(userId, Resource.PRODUCT, Action.UPDATE);

    const validData = productUpdateSchema.parse(data);

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      const product = await tx.product.findFirst({
        where: { id: productId, tenantId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      return tx.product.update({
        where: { id: productId },
        data: validData as any,
      });
    });
  }

  static async deactivateProduct(tenantId: string, userId: string, productId: string) {
    await requirePermissionFast(userId, Resource.PRODUCT, Action.DELETE);

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      const product = await tx.product.findFirst({
        where: { id: productId, tenantId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      // Safe deactivation, NEVER hard delete
      return tx.product.update({
        where: { id: productId },
        data: { isActive: false },
      });
    });
  }
}
