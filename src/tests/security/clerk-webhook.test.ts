import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as clerkPost } from '../../app/api/webhooks/clerk/route';
import { NextRequest } from 'next/server';
import prisma from '@db/utils/prisma';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';

describe('PHASE 12.1: Clerk Webhook RLS Verification', () => {
  const clerkUrl = 'http://localhost:3000/api/webhooks/clerk';
  let tenantId: string;
  let userId: string;
  const testClerkId = 'user_test_clerk_123';
  const initialEmail = 'old@example.com';
  const updatedEmail = 'new@example.com';

  beforeAll(async () => {
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_dGVzdC12YWxpZC1zZWNyZXQtZm9yLXN2aXg=';
    
    // 1. Setup fixture using SYSTEM bypass
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: 'Clerk Webhook Test Tenant', status: 'ACTIVE' }
      });
      tenantId = tenant.id;

      const user = await tx.user.create({
        data: {
          clerkId: testClerkId,
          email: initialEmail,
          firstName: 'Clerk',
          lastName: 'Test',
          status: 'ACTIVE',
          tenantId: tenantId
        }
      });
      userId = user.id;
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.user.deleteMany({ where: { clerkId: testClerkId } });
      await tx.tenant.deleteMany({ where: { id: tenantId } });
    });
    await prisma.$disconnect();
  });

  it('ATTACK / BUG REPRODUCTION: user.updated fails silently due to RLS if not using executeAsSystem', async () => {
    const payload = {
      type: 'user.updated',
      data: {
        id: testClerkId,
        email_addresses: [{ email_address: updatedEmail }]
      }
    };

    const req = new NextRequest(clerkUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'svix-id': 'msg_123',
        'svix-timestamp': '1234567890',
        'svix-signature': 'v1,test_valid_signature'
      },
      body: JSON.stringify(payload)
    });

    // In a test environment, svix_signature = 'v1,test_valid_signature' bypasses actual crypto if TEST_MODE=true.
    process.env.TEST_MODE = 'true';
    
    const res = await clerkPost(req);
    expect(res.status).toBe(200);

    // Verify if the database actually updated. 
    // If bug exists, this will still be 'old@example.com' because RLS blocked it silently.
    const checkUser = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      return tx.user.findUnique({ where: { id: userId } });
    });

    // This expectation asserts the fix (we expect it to be updatedEmail AFTER the fix).
    // Before the fix, this expectation will fail because it's still initialEmail.
    expect(checkUser?.email).toBe(updatedEmail);
  });
  
  it('user.deleted correctly deactivates user (requires bypass)', async () => {
    const payload = {
      type: 'user.deleted',
      data: {
        id: testClerkId
      }
    };

    const req = new NextRequest(clerkUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'svix-id': 'msg_123',
        'svix-timestamp': '1234567890',
        'svix-signature': 'v1,test_valid_signature'
      },
      body: JSON.stringify(payload)
    });

    const res = await clerkPost(req);
    expect(res.status).toBe(200);

    const checkUser = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      return tx.user.findUnique({ where: { id: userId } });
    });

    expect(checkUser?.status).toBe('INACTIVE');
    expect(checkUser?.deletedAt).not.toBeNull();
  });
});
