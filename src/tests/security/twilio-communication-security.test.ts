import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import twilio from 'twilio';
import { POST as inboundWebhook } from '../../app/api/webhooks/twilio/inbound/route';
import { POST as recordingWebhook } from '../../app/api/webhooks/twilio/recording/route';
import { POST as statusWebhook } from '../../app/api/webhooks/twilio/route';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import prisma from '@db/utils/prisma';

// Helper to generate real Twilio signatures for tests
function generateTestSignature(url: string, params: Record<string, string>, secret: string): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);

  return crypto
    .createHmac('sha1', secret)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64');
}

describe('PHASE 12.3: Twilio Communication Security', () => {
  const SECRET = 'test_secret_123';
  let victimTenantId: string;
  let callLogId: string;
  const callSid: string = 'CA_test_call_sid_123';

  beforeAll(async () => {
    process.env.TWILIO_WEBHOOK_SECRET = SECRET;

    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const victim = await tx.tenant.create({
        data: { name: 'Twilio Victim Tenant', status: 'ACTIVE' }
      });
      victimTenantId = victim.id;

      const call = await tx.callLog.create({
        data: {
          tenantId: victimTenantId,
          providerCallId: callSid,
          status: 'RINGING',
          provider: 'EXTERNAL'
        }
      });
      callLogId = call.id;
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      await tx.callLog.deleteMany({ where: { tenantId: victimTenantId } });
      await tx.tenant.deleteMany({ where: { id: victimTenantId } });
    });
    await prisma.$disconnect();
  });

  describe('Webhook Signature Verification', () => {
    it('TEST 1 & 2: Rejects unsigned or poorly signed inbound webhook', async () => {
      const payload = 'From=+1234&To=+5678&CallSid=CA123';
      const req = new NextRequest('http://localhost:3000/api/webhooks/twilio/inbound', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-twilio-signature': 'bad_signature'
        },
        body: payload
      });

      const res = await inboundWebhook(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid signature');
    });

    it('TEST 3: Rejects forged signature on inbound webhook', async () => {
      const payload = 'From=+1234&To=+5678&CallSid=CA123';
      const signature = generateTestSignature('http://localhost:3000/api/webhooks/twilio/inbound', { From: '+1234', To: '+5678', CallSid: 'CA123' }, 'WRONG_SECRET');
      
      const req = new NextRequest('http://localhost:3000/api/webhooks/twilio/inbound', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-twilio-signature': signature
        },
        body: payload
      });

      const res = await inboundWebhook(req);
      expect(res.status).toBe(400);
    });
  });

  describe('Recording Webhook Security', () => {
    it('TEST 6: Recording webhook ignores forged URL tenantId if missing/unknown CallSid', async () => {
      const url = 'http://localhost:3000/api/webhooks/twilio/recording?tenantId=FORGED_TENANT_ID';
      const params = { RecordingUrl: 'http://twilio.com', CallSid: 'UNKNOWN_CALL_SID' };
      const payload = new URLSearchParams(params).toString();
      const signature = generateTestSignature(url, params, SECRET);

      const req = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-twilio-signature': signature
        },
        body: payload
      });

      const res = await recordingWebhook(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Unknown CallSid'); // Failed safe internal lookup!
    });

    it('TEST 7: Recording webhook securely resolves tenant from trusted CallSid', async () => {
      const url = 'http://localhost:3000/api/webhooks/twilio/recording';
      const params = { RecordingUrl: 'http://twilio.com', CallSid: callSid, RecordingDuration: '60' };
      const payload = new URLSearchParams(params).toString();
      const signature = generateTestSignature(url, params, SECRET);

      const req = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-twilio-signature': signature
        },
        body: payload
      });

      const res = await recordingWebhook(req);
      expect(res.status).toBe(200); // Successfully resolved tenant internally and processed
    });
  });

  describe('Status Callback Security', () => {
    it('TEST 10: Unknown CallSid provides no fallback for status webhook', async () => {
      const url = 'http://localhost:3000/api/webhooks/twilio/status';
      const params = { CallStatus: 'completed', CallSid: 'UNKNOWN_CALL' };
      const payload = new URLSearchParams(params).toString();
      const signature = generateTestSignature(url, params, SECRET);

      const req = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-twilio-signature': signature
        },
        body: payload
      });

      const res = await statusWebhook(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Unknown CallSid');
    });

    it('TEST 11 & 12: Rejects unsigned status callback', async () => {
      const url = 'http://localhost:3000/api/webhooks/twilio/status';
      const params = { CallStatus: 'completed', CallSid: callSid };
      const payload = new URLSearchParams(params).toString();

      const req = new NextRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: payload
      });

      const res = await statusWebhook(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid signature');
    });
  });
});
