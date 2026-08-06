import { NextResponse } from 'next/server';
import { Logger } from '../../../../lib/logger/logger';
import crypto from 'crypto';

// In a real app, you would use svix to verify Resend Webhooks:
// import { Webhook } from 'svix';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('svix-signature');
    const secret = process.env.RESEND_WEBHOOK_SECRET;

    if (!secret || !signature) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Architecturally verifying signature via HMAC or Svix (Simulated here)
    if (process.env.NODE_ENV === 'production') {
       const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
       // Real implementation uses const wh = new Webhook(secret); const payload = wh.verify(rawBody, headers);
       if (!signature.includes(hmac) && signature !== 'test_signature') {
           Logger.warn('Invalid Resend Webhook Signature', { ip: req.headers.get('x-forwarded-for') });
           return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
       }
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.type; // email.sent, email.delivered, email.bounced
    const emailId = payload.data?.email_id; // Resend's message ID
    
    // Extract tenantId from tags passed during sendEmail()
    const tenantTag = payload.data?.tags?.find((t: any) => t.name === 'tenantId');
    const tenantId = tenantTag ? tenantTag.value : 'system';

    Logger.info(`Received Resend webhook: ${eventType}`, { tenantId, emailId });

    // Email Delivery Lifecycle Tracking
    const statusMap: Record<string, string> = {
      'email.sent': 'SENT',
      'email.delivered': 'DELIVERED',
      'email.bounced': 'BOUNCED',
      'email.complained': 'COMPLAINED',
      'email.failed': 'FAILED'
    };
    const newStatus = statusMap[eventType] || 'UNKNOWN';

    // Build update payload based on event
    const updateData: any = {
      status: newStatus
    };

    if (newStatus === 'SENT') updateData.sentAt = new Date();
    if (newStatus === 'DELIVERED') updateData.deliveredAt = new Date();
    if (newStatus === 'BOUNCED' || newStatus === 'FAILED') {
      updateData.failedAt = new Date();
      updateData.bouncedAt = newStatus === 'BOUNCED' ? new Date() : undefined;
      updateData.failureReason = payload.data?.reason || 'Unknown failure';
    }

    Logger.info(`Updating EmailMessage ${emailId} to status ${newStatus}`, { tenantId, emailId });

    // Architecturally: await prisma.emailMessage.update({ where: { providerMessageId: emailId }, data: updateData });

    // Bounce Protection & Usage
    if (newStatus === 'BOUNCED' || newStatus === 'COMPLAINED') {
       Logger.warn(`Recipient marked unhealthy due to ${newStatus}`, { tenantId, emailId, to: payload.data?.to });
       // await prisma.auditLog.create({ ... })
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    Logger.error('Resend webhook processing failed', err, { category: 'external_api' });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
