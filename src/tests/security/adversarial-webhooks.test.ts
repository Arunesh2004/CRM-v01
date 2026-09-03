import { SystemOperation } from '@db/utils/prisma-system';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';

import { POST as clerkPost } from '../../app/api/webhooks/clerk/route';
import { POST as resendPost } from '../../app/api/webhooks/resend/route';
import { POST as twilioPost } from '../../app/api/webhooks/twilio/route';
import { POST as twilioInboundPost } from '../../app/api/webhooks/twilio/inbound/route';
import { NextRequest } from 'next/server';

describe('Adversarial Webhook Security (Stage 6)', () => {
  const clerkUrl = 'http://localhost:3000/api/webhooks/clerk';
  const resendUrl = 'http://localhost:3000/api/webhooks/resend';
  const twilioUrl = 'http://localhost:3000/api/webhooks/twilio';
  const twilioInboundUrl = 'http://localhost:3000/api/webhooks/twilio/inbound';

  it('ATTACK: Clerk Webhook - Missing Signature', async () => {
    const req = new NextRequest(clerkUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'user.created', data: { id: 'user_123' } })
    });
    
    const res = await clerkPost(req);
    expect(res.status).toBe(400);
  });



  it('ATTACK: Resend Webhook - Forged Event', async () => {
    const req = new NextRequest(resendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email.delivered', data: { email_id: 'fake_123' } })
    });
    
    const res = await resendPost(req);
    // Missing signature header results in 401 Unauthorized
    expect(res.status).toBe(401);
  });

  it('ATTACK: Twilio Webhook - Unsigned Request', async () => {
    const req = new NextRequest(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'CallStatus=completed&CallSid=CA123'
    });
    const res = await twilioPost(req);
    // Twilio webhook now correctly requires signature validation
    expect(res.status).toBe(400);
  });

  it('ATTACK: Twilio Inbound Webhook - Unsigned Request', async () => {
    const req = new NextRequest(twilioInboundUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'From=+1234&To=+5678&CallSid=CA123'
    });
    const res = await twilioInboundPost(req);
    // Twilio inbound webhook now correctly requires signature validation
    expect(res.status).toBe(400);
  });
});
