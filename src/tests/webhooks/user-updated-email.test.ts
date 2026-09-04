import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as clerkPost } from '../../app/api/webhooks/clerk/route';
import { NextRequest } from 'next/server';

// Mock the system execution to avoid needing a live database
let mockUpdateMany = vi.fn();
vi.mock('@db/utils/prisma-system', () => ({
  executeAsSystem: vi.fn(async (operation, callback) => {
    const tx = {
      user: {
        updateMany: mockUpdateMany
      }
    };
    return await callback(tx);
  }),
  SystemOperation: {
    CLERK_PROVISIONING: 'CLERK_PROVISIONING'
  }
}));

describe('PHASE 15: Clerk Webhook user.updated Primary Email Resolution', () => {
  const clerkUrl = 'http://localhost:3000/api/webhooks/clerk';
  const testClerkId = 'user_test_email_resolution_123';

  beforeEach(() => {
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_dGVzdC12YWxpZC1zZWNyZXQtZm9yLXN2aXg=';
    process.env.TEST_MODE = 'true';
    mockUpdateMany.mockClear();
  });

  const sendWebhook = async (payload: any) => {
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
    return await clerkPost(req);
  };

  const getUpdatedEmail = () => {
    if (mockUpdateMany.mock.calls.length === 0) return null;
    const lastCall = mockUpdateMany.mock.calls[mockUpdateMany.mock.calls.length - 1];
    return lastCall[0].data.email;
  };

  it('CASE A: One email address matching primary_email_address_id', async () => {
    const res = await sendWebhook({
      type: 'user.updated',
      data: {
        id: testClerkId,
        primary_email_address_id: 'idn_1',
        email_addresses: [
          { id: 'idn_1', email_address: 'case_a@example.com' }
        ]
      }
    });
    expect(res.status).toBe(200);
    expect(getUpdatedEmail()).toBe('case_a@example.com');
  });

  it('CASE B: Two email addresses, primary is index 0', async () => {
    const res = await sendWebhook({
      type: 'user.updated',
      data: {
        id: testClerkId,
        primary_email_address_id: 'idn_2',
        email_addresses: [
          { id: 'idn_2', email_address: 'case_b_primary@example.com' },
          { id: 'idn_3', email_address: 'case_b_secondary@example.com' }
        ]
      }
    });
    expect(res.status).toBe(200);
    expect(getUpdatedEmail()).toBe('case_b_primary@example.com');
  });

  it('CASE C: Two email addresses, primary is index 1', async () => {
    const res = await sendWebhook({
      type: 'user.updated',
      data: {
        id: testClerkId,
        primary_email_address_id: 'idn_5',
        email_addresses: [
          { id: 'idn_4', email_address: 'case_c_secondary@example.com' },
          { id: 'idn_5', email_address: 'case_c_primary@example.com' }
        ]
      }
    });
    expect(res.status).toBe(200);
    expect(getUpdatedEmail()).toBe('case_c_primary@example.com');
  });

  it('CASE D: Multiple email addresses, primary is non-first', async () => {
    const res = await sendWebhook({
      type: 'user.updated',
      data: {
        id: testClerkId,
        primary_email_address_id: 'idn_7',
        email_addresses: [
          { id: 'idn_6', email_address: 'other1@example.com' },
          { id: 'idn_7', email_address: 'case_d_primary@example.com' },
          { id: 'idn_8', email_address: 'other2@example.com' }
        ]
      }
    });
    expect(res.status).toBe(200);
    expect(getUpdatedEmail()).toBe('case_d_primary@example.com');
  });

  it('CASE E: primary_email_address_id does not match any ID (fails closed)', async () => {
    const res = await sendWebhook({
      type: 'user.updated',
      data: {
        id: testClerkId,
        primary_email_address_id: 'idn_missing',
        email_addresses: [
          { id: 'idn_9', email_address: 'case_e_wrong@example.com' }
        ]
      }
    });
    expect(res.status).toBe(400);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('CASE F: Duplicate webhook delivery (idempotency)', async () => {
    const payload = {
      type: 'user.updated',
      data: {
        id: testClerkId,
        primary_email_address_id: 'idn_10',
        email_addresses: [
          { id: 'idn_10', email_address: 'case_f@example.com' }
        ]
      }
    };
    
    let res = await sendWebhook(payload);
    expect(res.status).toBe(200);
    expect(getUpdatedEmail()).toBe('case_f@example.com');

    res = await sendWebhook(payload);
    expect(res.status).toBe(200);
    expect(mockUpdateMany).toHaveBeenCalledTimes(2); // Updates safely twice with same data
  });

  it('CASE G: Primary email changes between successive events', async () => {
    let res = await sendWebhook({
      type: 'user.updated',
      data: {
        id: testClerkId,
        primary_email_address_id: 'idn_11',
        email_addresses: [
          { id: 'idn_11', email_address: 'case_g_first@example.com' },
          { id: 'idn_12', email_address: 'case_g_second@example.com' }
        ]
      }
    });
    expect(res.status).toBe(200);
    expect(getUpdatedEmail()).toBe('case_g_first@example.com');

    res = await sendWebhook({
      type: 'user.updated',
      data: {
        id: testClerkId,
        primary_email_address_id: 'idn_12',
        email_addresses: [
          { id: 'idn_11', email_address: 'case_g_first@example.com' },
          { id: 'idn_12', email_address: 'case_g_second@example.com' }
        ]
      }
    });
    expect(res.status).toBe(200);
    expect(getUpdatedEmail()).toBe('case_g_second@example.com');
  });
  
  it('CASE H: Normalization (trim and lowercase)', async () => {
    const res = await sendWebhook({
      type: 'user.updated',
      data: {
        id: testClerkId,
        primary_email_address_id: 'idn_13',
        email_addresses: [
          { id: 'idn_13', email_address: '  CaSe_H@ExAmPlE.CoM  ' }
        ]
      }
    });
    expect(res.status).toBe(200);
    expect(getUpdatedEmail()).toBe('case_h@example.com');
  });
});
