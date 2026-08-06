import 'dotenv/config';
import { Webhook } from 'svix';
import { PrismaClient } from '@prisma/client';

async function run() {
  console.log('--- Simulating Clerk Webhook Delivery ---');
  
  const prisma = new PrismaClient();
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
      throw new Error('CLERK_WEBHOOK_SECRET not found in env');
  }

  const payload = {
    data: {
      id: 'user_2xyztest123',
      email_addresses: [{ email_address: 'test@example.com' }],
      primary_email_address_id: '123',
      first_name: 'John',
      last_name: 'Doe'
    },
    object: 'event',
    type: 'user.created'
  };

  const payloadString = JSON.stringify(payload);
  const wh = new Webhook(secret);
  const headers = wh.sign(payloadString) as Record<string, string>;

  console.log('[1] Firing signed webhook payload to http://localhost:3000/api/webhooks/clerk...');
  
  try {
    const response = await fetch('http://localhost:3000/api/webhooks/clerk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'svix-id': headers['svix-id'],
        'svix-timestamp': headers['svix-timestamp'],
        'svix-signature': headers['svix-signature'],
      },
      body: payloadString,
    });

    const status = response.status;
    console.log(`[2] Application responded with status: ${status}`);

    if (status !== 200) {
      const text = await response.text();
      throw new Error(`Webhook handler failed with status ${status}: ${text}`);
    }

    console.log('[3] Webhook accepted. Checking Prisma for synchronization...');
    
    // Check if user is in DB
    const user = await prisma.user.findUnique({
      where: { clerkId: 'user_2xyztest123' },
      include: { tenant: true }
    });

    if (!user) {
       console.log('⚠ User not found in DB. Did the webhook fail to process internally?');
    } else {
       console.log(`✔ Success! User ${user.firstName} created and bound to Tenant ID: ${user.tenantId}`);
    }

  } catch (error) {
    console.error('Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
