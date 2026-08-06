'use server';
import { z } from 'zod';
import { CreateInvoiceSchema, UpdateInvoiceStatusSchema } from '../validators/invoice.schema';
import * as invoiceService from '../invoice/invoice.service';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';

export async function createInvoiceAction(payload: z.infer<typeof CreateInvoiceSchema>) {
  try {
    const validatedData = CreateInvoiceSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    await requirePermission('INVOICE', 'CREATE');
    
    const result = await invoiceService.createInvoice(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal error' };
  }
}

export async function updateInvoiceStatusAction(payload: z.infer<typeof UpdateInvoiceStatusSchema>) {
  try {
    const validatedData = UpdateInvoiceStatusSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    await requirePermission('INVOICE', 'UPDATE');
    
    const result = await invoiceService.updateInvoiceStatus(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal error' };
  }
}

export async function getInvoicesAction() {
  try {
    const result = await invoiceService.getInvoices();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal error' };
  }
}
