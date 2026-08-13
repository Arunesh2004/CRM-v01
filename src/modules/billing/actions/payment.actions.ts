'use server';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';

import { z } from 'zod';
import { CreatePaymentSchema, HandlePaymentSuccessSchema } from '../validators/payment.schema';
import * as paymentService from '../payment/payment.service';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';

export async function createPaymentAction(payload: z.infer<typeof CreatePaymentSchema>) {
  try {
    const validatedData = CreatePaymentSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    await requirePermission('PAYMENT', 'CREATE');
    
    const result = await paymentService.createPaymentRecord(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function handlePaymentSuccessAction(payload: z.infer<typeof HandlePaymentSuccessSchema>) {
  try {
    const validatedData = HandlePaymentSuccessSchema.parse(payload);
    // Usually a webhook action, but wrapped if triggered by frontend SDK completion
    await requireAuth();
    await requireTenant();
    await requirePermission('PAYMENT', 'UPDATE');
    
    const result = await paymentService.handlePaymentSuccess(validatedData.transactionId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
