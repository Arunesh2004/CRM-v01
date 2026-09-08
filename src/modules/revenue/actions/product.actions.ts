'use server';
import { withServerActionContext } from '@/lib/observability/server-action';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant } from '@/lib/auth';
import { ProductService, productCreateSchema, productUpdateSchema } from '../product.service';
import { z } from 'zod';

async function _getProductsAction() {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    
    const products = await ProductService.getProducts(tenantId, user.id);
    return { success: true, data: products };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _createProductAction(data: z.infer<typeof productCreateSchema>) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    
    const product = await ProductService.createProduct(tenantId, user.id, data);
    return { success: true, data: product };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _updateProductAction(productId: string, data: z.infer<typeof productUpdateSchema>) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    
    const product = await ProductService.updateProduct(tenantId, user.id, productId, data);
    return { success: true, data: product };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _deactivateProductAction(productId: string) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    
    const product = await ProductService.deactivateProduct(tenantId, user.id, productId);
    return { success: true, data: product };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getProductsAction = withServerActionContext(_getProductsAction);
export const createProductAction = withServerActionContext(_createProductAction);
export const updateProductAction = withServerActionContext(_updateProductAction);
export const deactivateProductAction = withServerActionContext(_deactivateProductAction);
