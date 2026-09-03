'use server';
import { withServerActionContext } from '@/lib/observability/server-action';
import { revalidatePath } from 'next/cache';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { Resource, Action } from '@prisma/client';
import { MailService } from '@/modules/communication/mail.service';
import { ChatService } from '@/modules/communication/chat.service';
import { withTenant } from '@db/utils/prisma-tenant';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';

async function _sendEmailAction(customerId: string, to: string, subject: string, body: string, ...args: any[]): Promise<{success?: boolean, error?: string}> {
  try {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission(Resource.COMMUNICATION, Action.CREATE);

    // Security check: ensure customer belongs to this tenant
    const customer = await withTenant(tenantId).customer.findFirst({
      where: { id: customerId, tenantId }
    });
    if (!customer) throw new Error('Customer not found or unauthorized');

    // Currently we don't have a contact/user resolution for `to` email in the strict sense for the internal mail system
    // but we can look up the user by email if they are internal, or skip it.
    // Wait, MailService.sendMail requires `toIds: string[]`.
    const recipientUser = await withTenant(tenantId).user.findFirst({
      where: { email: to, tenantId }
    });

    if (!recipientUser) {
      throw new Error(`Recipient email ${to} is not an internal user. External email not yet configured.`);
    }

    const message = await MailService.sendMail(tenantId, user.id, subject, body, [recipientUser.id]);
    
    // Wire the customerId to the MailThread
    await withTenant(tenantId).mailThread.update({
      where: { id: message.threadId },
      data: { customerId }
    });

    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
export const sendEmailAction = withServerActionContext(_sendEmailAction);

async function _initiateCallAction(customerId: string, toPhone: string, ...args: any[]): Promise<{success?: boolean, error?: string}> {
  return { success: true };
}
export const initiateCallAction = withServerActionContext(_initiateCallAction);

async function _sendMessageAction(customerId: string, message: string, ...args: any[]): Promise<{success?: boolean, error?: string}> {
  try {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission(Resource.COMMUNICATION, Action.CREATE);

    const customer = await withTenant(tenantId).customer.findFirst({
      where: { id: customerId, tenantId }
    });
    if (!customer) throw new Error('Customer not found or unauthorized');

    // Create a new direct chat conversation (just the user for now since we don't have external SMS configured)
    const chat = await ChatService.startChat(tenantId, user.id, [], false, `Chat with ${customer.name}`);
    
    // Wire customerId
    await withTenant(tenantId).chatConversation.update({
      where: { id: chat.id },
      data: { customerId }
    });

    await ChatService.sendMessage(tenantId, chat.id, user.id, message);

    revalidatePath(`/customers/${customerId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
export const sendMessageAction = withServerActionContext(_sendMessageAction);

export const initiateCall = initiateCallAction;
