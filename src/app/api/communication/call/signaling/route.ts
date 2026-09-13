import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenant } from '@/lib/auth';
import prisma from '@db/utils/prisma';
import { realtime } from '@/modules/communication/adapter';
import { Logger } from '@/lib/observability/logger';
import { CallSessionStatus } from '@prisma/client';

const logger = new Logger();

const ACTIVE_STATUSES: CallSessionStatus[] = ['RINGING', 'ACCEPTED', 'CONNECTED'];
const TERMINAL_STATUSES: CallSessionStatus[] = ['REJECTED', 'MISSED', 'ENDED', 'FAILED', 'EXPIRED'];

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const tenantId = await requireTenant();

    let body;
    try {
      const rawText = await req.text();
      // Enforce 4KB payload limit
      if (rawText.length > 4096) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
      }
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 422 });
    }

    const { callId, type, payload } = body;

    if (!callId || typeof callId !== 'string' || callId.length > 100) {
      return NextResponse.json({ error: 'Invalid callId' }, { status: 422 });
    }

    if (!['offer', 'answer', 'candidate'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Allowed: offer, answer, candidate' }, { status: 422 });
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json({ error: 'Missing or invalid payload' }, { status: 422 });
    }

    const session = await prisma.callSession.findUnique({ where: { id: callId } });

    if (!session || session.tenantId !== tenantId) {
      // 404 to avoid leaking cross-tenant or hidden sessions
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    if (session.callerId !== user.id && session.recipientId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: not a call participant' }, { status: 403 });
    }

    if (TERMINAL_STATUSES.includes(session.status)) {
      return NextResponse.json({ error: `Cannot signal on a terminal call (${session.status})` }, { status: 409 });
    }

    if (session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Call session has expired' }, { status: 409 });
    }

    if (!ACTIVE_STATUSES.includes(session.status)) {
      return NextResponse.json({ error: 'Call is not active' }, { status: 409 });
    }

    const isCaller = session.callerId === user.id;
    const targetUserId = isCaller ? session.recipientId : session.callerId;

    // Strict state and direction rules
    if (type === 'offer') {
      if (!isCaller) {
        return NextResponse.json({ error: 'Only caller can send offer' }, { status: 409 });
      }
    } else if (type === 'answer') {
      if (isCaller) {
        return NextResponse.json({ error: 'Only recipient can send answer' }, { status: 409 });
      }
      if (session.status === 'RINGING') {
        return NextResponse.json({ error: 'Cannot send answer before call is accepted' }, { status: 409 });
      }
    }
    // candidates are allowed from both sides while active

    // Send the server-relayed event to the derived target
    try {
      await realtime.publishToUser(tenantId, targetUserId, `webrtc-${type}`, {
        event: 'webrtc-signal',
        callId: session.id,
        type,
        payload,
        senderId: user.id
      });
    } catch (error) {
      logger.error('Failed to relay WebRTC signaling', error instanceof Error ? error : undefined, { callId: session.id, type });
      // Translate provider failure into explicit 503
      if (error instanceof Error && error.message === 'REALTIME_PROVIDER_NOT_CONFIGURED') {
        return NextResponse.json({ error: 'REALTIME_PROVIDER_NOT_CONFIGURED' }, { status: 503 });
      }
      return NextResponse.json({ error: 'Signaling delivery failed' }, { status: 503 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Signaling error', error instanceof Error ? error : undefined);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
