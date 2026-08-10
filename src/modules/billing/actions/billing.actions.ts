'use server';

import { BillingService } from '../billing.service';

export async function createCheckoutSessionAction(planId: string) {
  try {
    const result = await BillingService.createCheckoutSession(planId);
    return { success: true, url: result.url };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
