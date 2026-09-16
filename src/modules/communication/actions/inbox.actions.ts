'use server';

import { requireAuth } from '@/lib/auth';
import { MailService } from '../mail.service';
import { DistributedRateLimiter } from '@/lib/rate-limit/rate-limiter';
import { z } from 'zod';
import { withServerActionContext } from '@/lib/observability/server-action';

const SendInternalMailSchema = z.object({
  subject: z.string().min(1).max(255),
  bodyHtml: z.string().min(1).max(20000), // Max 20KB to prevent abuse
  toIds: z.array(z.string()).min(1).max(50),
  ccIds: z.array(z.string()).max(50).optional(),
  bccIds: z.array(z.string()).max(50).optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
});

export async function _sendInternalMailAction(data: z.infer<typeof SendInternalMailSchema>) {
  const user = await requireAuth();
  const parsed = SendInternalMailSchema.parse(data);

  // Rate Limiting: Max 20 internal emails per minute per user
  const rl = await DistributedRateLimiter.checkLimit(user.tenantId, 'MAIL', 'SEND', 20, 60, undefined, user.id);
  if (!rl.allowed) throw new Error('Too many requests');

  const message = await MailService.sendMail(
    user.tenantId,
    user.id,
    parsed.subject,
    parsed.bodyHtml,
    parsed.toIds,
    parsed.ccIds || [],
    parsed.bccIds || []
  );

  return { success: true, data: message };
}

export async function _getInboxAction(cursor?: string) {
  const user = await requireAuth();
  
  const rl = await DistributedRateLimiter.checkLimit(user.tenantId, 'MAIL', 'GET_INBOX', 100, 60, undefined, user.id);
  if (!rl.allowed) throw new Error('Too many requests');

  const inbox = await MailService.getInbox(user.tenantId, user.id, cursor);
  return { success: true, data: inbox };
}

export async function _archiveMailAction(messageId: string) {
  const user = await requireAuth();
  
  const rl = await DistributedRateLimiter.checkLimit(user.tenantId, 'MAIL', 'ARCHIVE', 100, 60, undefined, user.id);
  if (!rl.allowed) throw new Error('Too many requests');

  const result = await MailService.archiveMail(user.tenantId, messageId, user.id);
  return { success: true, data: result };
}

export const sendInternalMailAction = withServerActionContext(_sendInternalMailAction);
export const getInboxAction = withServerActionContext(_getInboxAction);
export const archiveMailAction = withServerActionContext(_archiveMailAction);
