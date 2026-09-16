import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { Logger } from '../../../../lib/logger/logger';
import crypto from 'crypto';

import { Webhook } from 'svix';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { Prisma } from '@prisma/client';

const _orig_POST = async function (req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('svix-signature');
    const secret = process.env.RESEND_WEBHOOK_SECRET;

    if (!secret || !signature) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload;
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
      try {
        const wh = new Webhook(secret);
         
        payload = wh.verify(rawBody, {
          'svix-id': req.headers.get('svix-id') as string,
          'svix-timestamp': req.headers.get('svix-timestamp') as string,
          'svix-signature': signature,
        }) as any;
      } catch (err) {
        Logger.warn('Invalid Resend Webhook Signature', { ip: req.headers.get('x-forwarded-for') });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    } else {
      payload = JSON.parse(rawBody);
    }

    const eventType = payload.type; // email.sent, email.delivered, email.bounced
    const emailId = payload.data?.email_id; // Resend's message ID

    if (!emailId) {
      return NextResponse.json({ error: 'Missing email_id' }, { status: 400 });
    }

    // Securely resolve tenantId and message via executeAsSystem (Authoritative correlation)
    const dbResult = await executeAsSystem(SystemOperation.PLATFORM_CRON, async (tx) => {
      // Find the MailMessage by providerMessageId stored in metadata
      // Prisma JSON filtering for PostgreSQL
      const messages = await tx.mailMessage.findMany({
        where: {
          metadata: {
            path: ['providerMessageId'],
            equals: emailId
          }
        },
        take: 1
      });

      if (messages.length === 0) return null;
      const message = messages[0];

      const statusMap: Record<string, string> = {
        'email.sent': 'SENT',
        'email.delivered': 'DELIVERED',
        'email.bounced': 'BOUNCED',
        'email.complained': 'COMPLAINED',
        'email.failed': 'FAILED'
      };
      const newStatus = statusMap[eventType] || 'UNKNOWN';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = (message.metadata as any) || {};
      
      // Idempotency: skip if already processed this status
      if (metadata.status === newStatus && newStatus !== 'UNKNOWN') {
        return { message, updated: false, newStatus };
      }

      const updateData: any = { ...metadata, status: newStatus };

      if (newStatus === 'SENT') updateData.sentAt = new Date().toISOString();
      if (newStatus === 'DELIVERED') updateData.deliveredAt = new Date().toISOString();
      if (newStatus === 'BOUNCED' || newStatus === 'FAILED') {
        updateData.failedAt = new Date().toISOString();
        updateData.bouncedAt = newStatus === 'BOUNCED' ? new Date().toISOString() : undefined;
        updateData.failureReason = payload.data?.reason || 'Unknown failure';
      }

      await tx.mailMessage.update({
        where: { id: message.id },
        data: { metadata: updateData }
      });

      return { message, updated: true, newStatus };
    });

    if (!dbResult) {
      Logger.warn(`Resend webhook received for unknown email_id: ${emailId}`);
      return NextResponse.json({ received: true });
    }

    Logger.info(`Received Resend webhook: ${eventType}`, { tenantId: dbResult.message.tenantId, emailId });

    if (dbResult.updated) {
      Logger.info(`Updated EmailMessage ${emailId} to status ${dbResult.newStatus}`, { tenantId: dbResult.message.tenantId, emailId });

      if (dbResult.newStatus === 'BOUNCED' || dbResult.newStatus === 'COMPLAINED') {
        Logger.warn(`Recipient marked unhealthy due to ${dbResult.newStatus}`, { tenantId: dbResult.message.tenantId, emailId, to: payload.data?.to });
      }
    }

    return NextResponse.json({ received: true });
  } catch (errRaw: unknown) {
    const err = errRaw instanceof Error ? errRaw : new Error(String(errRaw));
    Logger.error('Resend webhook processing failed', err, { category: 'external_api' });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiContext(_orig_POST);
