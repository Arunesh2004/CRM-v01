import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { Logger } from '@/lib/logger/logger';
import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import prisma from '@db/utils/prisma';
import crypto from 'crypto';
import { inngest } from '@/lib/queue/inngest.client';

const _orig_POST = async function (req: Request) {
  try {
    const signature = req.headers.get('x-webhook-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const rawBody = await req.text();
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Identify tenant safely. If generic webhook cannot, it must be specified in query params.
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant mapping' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET || 'default_dev_secret')
      .update(rawBody)
      .digest('hex');

    const isValid = signature.length === expectedSignature.length && 
                    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

    const tenantPrisma = withTenant(tenantId);

    if (!isValid) {
      // SECURITY: Log unauthorized attempts to SecurityEvent
      await prisma.$transaction(async (baseTx) => {
        const tx = await withTenantTransaction(baseTx, tenantId);
        await tx.securityEvent.create({
          data: {
            tenantId,
            eventType: 'WEBHOOK_SIGNATURE_FAILURE',
            ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown',
            metadata: { provider: 'GENERIC', eventId: payload.id },
            severity: 'HIGH',
            source: 'API'
          }
        });
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    const eventId = payload.id || crypto.randomUUID();

    // Check for idempotency / replay and create securely
    const existingOrNew = await prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      const existing = await tx.webhookEvent.findFirst({
        where: { provider: 'GENERIC', eventId }
      });
      if (existing) return { existing: true, event: existing };

      const webhookEvent = await tx.webhookEvent.create({
        data: {
          tenantId,
          provider: 'GENERIC',
          eventId,
          eventType: payload.type || 'unknown',
          payloadHash,
          signatureVerified: true,
          status: 'PENDING'
        }
      });
      return { existing: false, event: webhookEvent };
    });

    if (existingOrNew.existing) {
      return NextResponse.json({ success: true, message: 'Already processed' }, { status: 200 });
    }
    
    const webhookEvent = existingOrNew.event;

    // Dispatch to async queue
    await inngest.send({
      name: 'webhook.ingested',
      data: {
        jobId: `wh-${webhookEvent.id}`,
        tenantId,
        actorType: 'SYSTEM',
        correlationId: webhookEvent.id,
        jobType: 'webhook.ingested',
        payload: { webhookEventId: webhookEvent.id },
        schemaVersion: '1.0'
      }
    });

    return NextResponse.json({ success: true, id: webhookEvent.id }, { status: 202 });
  } catch (error) {
    Logger.error('Webhook ingestion error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiContext(_orig_POST);
