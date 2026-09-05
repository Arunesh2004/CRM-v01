import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { redis } from '@/lib/cache/redis.client';
import twilio from 'twilio';
import { Logger } from '../../../../../lib/logger/logger';

import { RoutingEngine } from '../../../../../lib/telephony/routing';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { withTenant } from '@db/utils/prisma-tenant';
import { CallStatus } from '@prisma/client';


const _orig_POST = async function (req: Request) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('x-twilio-signature');
    
    const isValid = twilio.validateRequest(
      process.env.TWILIO_WEBHOOK_SECRET || '',
      signature || '',
      req.url,
      Object.fromEntries(new URLSearchParams(bodyText))
    );
    if (!isValid) {
      Logger.warn('Invalid Twilio Inbound Signature', { ip: req.headers.get('x-forwarded-for') });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const params = new URLSearchParams(bodyText);
    const from = params.get('From') || '';
    const to = params.get('To') || '';
    // CallSid originates exclusively from the verified Twilio webhook body.
    // It is never accepted from query parameters, headers, or caller-controlled input.
    const callSid = params.get('CallSid');

    // 4. Canonicalize the number using basic E.164 normalization
    const canonicalTo = to.trim().replace(/[^\d+]/g, '');

    if (!canonicalTo || !callSid) {
      Logger.warn('Invalid Twilio Inbound Payload: Missing To or CallSid', { canonicalTo, callSid });
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    // --- IDEMPOTENCY BOUNDARY (Fast-Path) ---
    if (redis) {
      const lockKey = `twilio_inbound:${callSid}`;
      const acquired = await redis.setnx(lockKey, '1');
      if (!acquired) {
        Logger.warn('Duplicate inbound webhook detected via Redis SETNX, ignoring safely', { callSid });
        return new NextResponse('<Response />', { headers: { 'Content-Type': 'text/xml' } });
      }
      await redis.expire(lockKey, 3600); // 1 hour TTL
    }

    Logger.info(`Inbound call received from ${from} to ${canonicalTo}`);

    // 5. Securely resolve tenantId from trusted TenantPhoneNumber using System context
    const tenantPhone = await executeAsSystem(SystemOperation.EXTERNAL_WEBHOOK_PROCESS, async (tx) => {
      return tx.tenantPhoneNumber.findUnique({
        where: { phoneNumber: canonicalTo }
      });
    });

    if (!tenantPhone) {
      Logger.warn('Inbound call received for unregistered or unknown number', { canonicalTo });
      // 7. Reject/unroute calls to unregistered numbers
      return new NextResponse('<Response><Reject /></Response>', { headers: { 'Content-Type': 'text/xml' } });
    }

    if (tenantPhone.status !== 'ACTIVE') {
      Logger.warn('Inbound call received for disabled number', { canonicalTo, tenantId: tenantPhone.tenantId });
      return new NextResponse('<Response><Reject reason="busy" /></Response>', { headers: { 'Content-Type': 'text/xml' } });
    }

    const tenantId = tenantPhone.tenantId;
    Logger.info(`Successfully routed inbound call to tenant`, { tenantId, canonicalTo, callSid });

    // 8. Establish tenant context AFTER the trusted mapping is resolved
    const tenantPrisma = withTenant(tenantId);
    
    await tenantPrisma.callLog.create({
      data: {
        tenantId,
        providerCallId: callSid,
        provider: 'EXTERNAL',
        status: CallStatus.RINGING, 
        callerEmployeeId: 'unknown', 
        receiverEmployeeId: 'system' 
      }
    });

    // 9. Continue through the existing routing architecture
    const twiml = await RoutingEngine.getInboundTwiML(tenantId, 'contactId_mock', { checkBusinessHours: true, strategy: 'ROUND_ROBIN' });
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });

  } catch (err: unknown) {
    Logger.error('Twilio inbound webhook failed', err, { category: 'external_api' });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiContext(_orig_POST);


