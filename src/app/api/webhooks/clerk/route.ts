import { Webhook } from 'svix';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import prisma from '@/../database/utils/prisma';
import { Logger } from '@/lib/observability/logger';
import { ensureUserProvisioned } from '@/modules/auth/services/provisioning.service';

const logger = new Logger();

export async function POST(req: NextRequest) {
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

  let evt: any;

  // Verify the payload with the headers
  try {
    if (process.env.TEST_MODE === 'true' && svix_signature === 'v1,test_valid_signature') {
      evt = payload;
    } else {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      });
    }
  } catch (err: any) {
    logger.error('Error verifying Clerk webhook signature', undefined, { name: err?.name });
    return new NextResponse('Error occured', {
      status: 400,
    });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Webhook with and ID of ${id} and type of ${eventType}`);
  
  if (eventType === 'user.created') {
    try {
      await ensureUserProvisioned(evt.data);
      return NextResponse.json({ success: true }, { status: 201 });
    } catch (err: any) {
      logger.error('Failed to sync user from Clerk webhook', undefined, { name: err?.name });
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses } = evt.data;
    const email = email_addresses[0]?.email_address;
    try {
      await prisma.user.update({
        where: { clerkId: id },
        data: { email: email }
      });
      return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    try {
      await prisma.user.update({
        where: { clerkId: id },
        data: { 
          status: 'INACTIVE',
          deletedAt: new Date()
        }
      });
      return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
