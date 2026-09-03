import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import twilio from 'twilio';
import { POST as statusWebhook } from '../../app/api/webhooks/twilio/status/route';
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

describe('PHASE 13.1A: Twilio Status Webhook Security Remediation', () => {
  const SECRET = 'test_secret_123';
  let victimTenantId: string;
  let attackerTenantId: string;
  const callSid: string = 'CA_test_call_sid_123';
  let callLogId: string;

  beforeAll(async () => {
    process.env.TWILIO_WEBHOOK_SECRET = SECRET;

    await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      const victim = await tx.tenant.create({
        data: { name: 'Victim Tenant', status: 'ACTIVE' }
      });
      victimTenantId = victim.id;

      const attacker = await tx.tenant.create({
        data: { name: 'Attacker Tenant', status: 'ACTIVE' }
      });
      attackerTenantId = attacker.id;

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
      await tx.callLog.deleteMany({ where: { providerCallId: callSid } });
      await tx.tenant.deleteMany({ where: { id: victimTenantId } });
      await tx.tenant.deleteMany({ where: { id: attackerTenantId } });
    });
    await prisma.$disconnect();
  });

  it('TEST 1: Unsigned request -> rejected', async () => {
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

  it('TEST 2: Correctly structured request with forged signature -> rejected', async () => {
    const url = 'http://localhost:3000/api/webhooks/twilio/status';
    const params = { CallStatus: 'completed', CallSid: callSid };
    const payload = new URLSearchParams(params).toString();
    const forgedSignature = generateTestSignature(url, params, 'WRONG_SECRET');

    const req = new NextRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-twilio-signature': forgedSignature
      },
      body: payload
    });

    const res = await statusWebhook(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid signature');
  });

  it('TEST 3 & 6 & 7: Correct Twilio signature + forged tenantId -> forged tenantId is ignored', async () => {
    // Attempting to inject attackerTenantId via URL query
    const url = `http://localhost:3000/api/webhooks/twilio/status?tenantId=${attackerTenantId}`;
    const params = { CallStatus: 'completed', CallSid: callSid };
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
    expect(res.status).toBe(200);

    // Verify it updated the victim's call log, NOT an attacker's context
    const updatedCall = await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      return tx.callLog.findUnique({ where: { id: callLogId } });
    });
    
    expect(updatedCall?.status).toBe('COMPLETED');
    expect(updatedCall?.tenantId).toBe(victimTenantId); // Proves it didn't mutate as attacker
  });

  it('TEST 4: Correct signature + valid CallSid -> tenantId is obtained from CallLog', async () => {
    const url = 'http://localhost:3000/api/webhooks/twilio/status';
    const params = { CallStatus: 'in-progress', CallSid: callSid };
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
    expect(res.status).toBe(200);

    const updatedCall = await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      return tx.callLog.findUnique({ where: { id: callLogId } });
    });
    expect(updatedCall?.status).toBe('IN_PROGRESS');
  });

  it('TEST 5: Correct signature + unknown CallSid -> safely rejected/no mutation', async () => {
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
});
