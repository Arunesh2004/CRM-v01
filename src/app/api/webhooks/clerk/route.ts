import { Webhook } from 'svix';
import { withApiContext } from '@/lib/observability/context';
import { NextRequest, NextResponse } from 'next/server';
import { WebhookEvent } from '@clerk/nextjs/server';
import prisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { Logger } from '@/lib/observability/logger';
import { ensureUserProvisioned } from '@/modules/auth/services/provisioning.service';

const logger = new Logger();

const _orig_POST = async function (req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  // Get the headers
  const svix_id = req.headers.get('svix-id');
  const svix_timestamp = req.headers.get('svix-timestamp');
  const svix_signature = req.headers.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    const isTestMode = process.env.TEST_MODE === 'true';
    const isSafeEnvironment = process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production';

    if (isTestMode && isSafeEnvironment && svix_signature === 'v1,test_valid_signature') {
      evt = payload;
    } else {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent;
    }
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('Error verifying Clerk webhook signature', undefined, { name: error?.name });
    return new NextResponse('Error occured', {
      status: 400,
    });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  logger.info(`Webhook with and ID of ${id} and type of ${eventType}`);
  
  if (eventType === 'user.created') {
    try {
      await ensureUserProvisioned(evt.data);
      return NextResponse.json({ success: true }, { status: 201 });
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to sync user from Clerk webhook', undefined, { name: error?.name });
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, primary_email_address_id } = evt.data;
    const primaryEmailObj = email_addresses.find(e => e.id === primary_email_address_id);
    const email = primaryEmailObj?.email_address?.toLowerCase()?.trim();
    if (!email) return NextResponse.json({ error: 'No email' }, { status: 400 });
    try {
      await executeAsSystem(SystemOperation.CLERK_PROVISIONING, async (tx) => {
        await tx.user.updateMany({
          where: { clerkId: id },
          data: { email: email }
        });
      });
      return NextResponse.json({ success: true }, { status: 200 });
    } catch {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 });
    try {
      await executeAsSystem(SystemOperation.CLERK_PROVISIONING, async (tx) => {
        await tx.user.updateMany({
          where: { clerkId: id },
          data: { 
            status: 'INACTIVE',
            deletedAt: new Date()
          }
        });
      });
      return NextResponse.json({ success: true }, { status: 200 });
    } catch {
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

export const POST = withApiContext(_orig_POST);
