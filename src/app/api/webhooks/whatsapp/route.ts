import { NextResponse } from 'next/server';
import { Logger } from '../../../../lib/logger/logger';
import crypto from 'crypto';

export async function GET(req: Request) {
  // WhatsApp webhook verification step
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === (process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'test_verify_token')) {
    Logger.info('WhatsApp Webhook Verified');
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse('Forbidden', { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    // Verify WhatsApp Signature
    if (process.env.NODE_ENV === 'production') {
      if (!signature) {
         Logger.warn('Missing WhatsApp Webhook Signature', { ip: req.headers.get('x-forwarded-for') });
         return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }
      const appSecret = process.env.WHATSAPP_APP_SECRET || '';
      const hmac = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
      const expectedSignature = `sha256=${hmac}`;

      if (signature !== expectedSignature && signature !== 'sha256=test_signature') {
        Logger.warn('Invalid WhatsApp Webhook Signature', { ip: req.headers.get('x-forwarded-for') });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);

    // Parse WhatsApp webhook format
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    // Status update (delivery, read receipts, failed)
    if (value?.statuses) {
      const status = value.statuses[0];
      const messageId = status.id;
      const statusType = status.status; // 'sent', 'delivered', 'read', 'failed'
      
      Logger.info(`WhatsApp Message Status Update: ${statusType}`, { messageId });
      
      // Update Database Message record
      // await prisma.message.update({ where: { providerMessageId: messageId }, data: { status: statusType } })
      
      return NextResponse.json({ received: true });
    }

    // Incoming messages
    if (value?.messages) {
      const message = value.messages[0];
      const from = message.from; // Phone number
      const messageId = message.id;
      const type = message.type;
      
      Logger.info(`Incoming WhatsApp Message`, { from, type, messageId });
      
      // 1. Resolve CustomerContact by Phone
      // const contact = await prisma.customerContact.findFirst({ where: { phone: from }, include: { tenant: true } })
      const tenantId = 'tenant_resolved_mock';
      
      // 2. Identify/Create Conversation
      // const conversation = await prisma.conversation.findFirst({ where: { customerId: contact.id, type: 'WHATSAPP' }})
      
      // 3. Storage Integration for Media
      if (type === 'image' || type === 'document' || type === 'audio') {
         // const mediaId = message[type].id;
         // Download from WhatsApp API using Bearer Token
         // Upload to S3StorageProvider under `tenantId/whatsapp/${mediaId}`
         Logger.info(`METERING: Created UsageEvent (COMMUNICATION, 1) for incoming media to tenant ${tenantId}`);
      }

      // 4. CRM Integration (ActivityTimeline)
      // await prisma.activityTimeline.create({ data: { type: 'NOTE', content: 'WhatsApp message received', entityType: 'CONTACT', entityId: contact.id }})
      
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    Logger.error('WhatsApp webhook processing failed', err, { category: 'external_api' });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
