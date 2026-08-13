'use server';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';


import { CallService } from '@/modules/communication/services/call.service';

export async function initiateCallAction({ customerId, to }: { customerId: string, to: string }) {
  try {
    const result = await CallService.initiateCustomerCall(to, customerId);
    return { success: true, providerCallId: result.id };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
