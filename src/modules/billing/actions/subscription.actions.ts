'use server';
import { z } from 'zod';
import { CreateSubscriptionSchema, UpdateSubscriptionStatusSchema } from '../validators/subscription.schema';
import * as subscriptionService from '../subscription/subscription.service';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';

export async function createSubscriptionAction(payload: z.infer<typeof CreateSubscriptionSchema>) {
  try {
    const validatedData = CreateSubscriptionSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    await requirePermission('SUBSCRIPTION', 'CREATE');
    
    const result = await subscriptionService.createSubscription(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal error' };
  }
}

export async function updateSubscriptionStatusAction(payload: z.infer<typeof UpdateSubscriptionStatusSchema>) {
  try {
    const validatedData = UpdateSubscriptionStatusSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    await requirePermission('SUBSCRIPTION', 'UPDATE');
    
    const result = await subscriptionService.updateSubscriptionStatus(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal error' };
  }
}

export async function getCurrentSubscriptionAction() {
  try {
    const result = await subscriptionService.getCurrentSubscription();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal error' };
  }
}

export async function getPlansAction() {
  try {
    const result = await subscriptionService.getPlans();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal error' };
  }
}

export async function simulateCheckoutAction(planId: string) {
  try {
    const sessionId = `demo_session_${Date.now()}`;
    const result = await subscriptionService.processSuccessfulCheckout(planId, sessionId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Internal error' };
  }
}
