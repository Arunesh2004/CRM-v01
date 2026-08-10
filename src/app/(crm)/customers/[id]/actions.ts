'use server';

import { EmailService } from '@/modules/communication/services/email.service';
import { CallService } from '@/modules/communication/services/call.service';
import { MessageService } from '@/modules/communication/services/message.service';
import { revalidatePath } from 'next/cache';

export async function sendEmailAction(customerId: string, to: string, subject: string, body: string) {
  try {
    await EmailService.sendCustomerEmail(to, subject, body, body, customerId);
    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to send email' };
  }
}

export async function initiateCallAction(customerId: string, toPhone: string) {
  try {
    await CallService.initiateCustomerCall(toPhone, customerId);
    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to initiate call' };
  }
}

export async function sendMessageAction(customerId: string, toPhone: string, message: string) {
  try {
    await MessageService.sendCustomerSMS(toPhone, message);
    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to send message' };
  }
}
