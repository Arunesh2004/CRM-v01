import prisma from '@db/utils/prisma';
import { Logger } from '@/lib/observability/logger';
import { realtime } from '@/modules/communication/adapter';
import { CallSessionStatus, Prisma } from '@prisma/client';

const logger = new Logger();

const ACTIVE_STATUSES: CallSessionStatus[] = ['RINGING', 'ACCEPTED', 'CONNECTED'];
const TERMINAL_STATUSES: CallSessionStatus[] = ['REJECTED', 'MISSED', 'ENDED', 'FAILED', 'EXPIRED'];

export class CallSessionService {
  /**
   * Initiates a new internal call.
   * Caller identity MUST be derived from authenticated context — NOT from request body.
   * Uses a Serializable transaction to prevent concurrent double-initiation for the same participants.
   */
  static async initiateCall(tenantId: string, callerId: string, recipientId: string) {
    if (callerId === recipientId) throw new Error('Cannot call yourself');

    let session;
    try {
      session = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Inside Serializable TX: read then write is concurrency-safe.
        // Two concurrent TXs with overlapping participant sets will conflict and one will be rolled back (P2034).
        const existingCall = await tx.callSession.findFirst({
          where: {
            OR: [
              { callerId: { in: [callerId, recipientId] } },
              { recipientId: { in: [callerId, recipientId] } }
            ],
            status: { in: ACTIVE_STATUSES }
          }
        });

        if (existingCall) {
          throw new Error('ACTIVE_CALL_EXISTS');
        }

        const expiresAt = new Date(Date.now() + 60_000); // 60s ring timeout
        return tx.callSession.create({
          data: { tenantId, callerId, recipientId, status: 'RINGING', expiresAt }
        });
      }, { isolationLevel: 'Serializable' });
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      if (err.message === 'ACTIVE_CALL_EXISTS') {
        throw new Error('Participant is already in an active call');
      }
      // P2034 = Prisma serialization failure — treat as policy violation
      if (err.code === 'P2034') {
        throw new Error('Participant is already in an active call');
      }
      throw error;
    }

    // Publish incoming-call event. If this fails, mark session FAILED immediately.
    // No ghost ringing: client receives an explicit error.
    try {
      await realtime.publishToUser(tenantId, recipientId, 'incoming-call', {
        callId: session.id,
        callerId
      });
    } catch (e) {
      logger.error('Failed to publish incoming-call event', e instanceof Error ? e : undefined, { sessionId: session.id });
      await prisma.callSession.update({
        where: { id: session.id },
        data: { status: 'FAILED', failureReason: 'Signaling publish failed' }
      });
      throw new Error('Call initiation failed: realtime publish error');
    }

    return session;
  }

  /**
   * Accept a ringing call.
   * Only the authenticated RECIPIENT may accept.
   */
  static async acceptCall(tenantId: string, recipientId: string, sessionId: string, version: number) {
    const session = await prisma.callSession.findUnique({ where: { id: sessionId } });
    if (!session || session.tenantId !== tenantId) throw new Error('Call not found');
    if (session.recipientId !== recipientId) throw new Error('Unauthorized: only recipient can accept');

    // Eager expiry check
    if (session.expiresAt < new Date()) {
      await prisma.callSession.updateMany({
        where: { id: sessionId, version, status: 'RINGING' },
        data: { status: 'EXPIRED', version: { increment: 1 } }
      });
      throw new Error('Session expired');
    }

    if (TERMINAL_STATUSES.includes(session.status)) {
      throw new Error('Cannot accept a terminal call');
    }

    const updated = await prisma.callSession.updateMany({
      where: { id: sessionId, version, status: 'RINGING' },
      data: { status: 'ACCEPTED', acceptedAt: new Date(), version: { increment: 1 } }
    });
    if (updated.count === 0) throw new Error('Concurrent modification or invalid state transition');
  }

  /**
   * Reject a ringing call.
   * Only the authenticated RECIPIENT may reject.
   */
  static async rejectCall(tenantId: string, recipientId: string, sessionId: string, version: number) {
    const session = await prisma.callSession.findUnique({ where: { id: sessionId } });
    if (!session || session.tenantId !== tenantId) throw new Error('Call not found');
    if (session.recipientId !== recipientId) throw new Error('Unauthorized: only recipient can reject');
    if (TERMINAL_STATUSES.includes(session.status)) {
      throw new Error('Cannot reject a terminal call');
    }

    const updated = await prisma.callSession.updateMany({
      where: { id: sessionId, version, status: 'RINGING' },
      data: { status: 'REJECTED', version: { increment: 1 } }
    });
    if (updated.count === 0) throw new Error('Concurrent modification or invalid state transition');

    await CallSessionService._createCallLog(session.tenantId, sessionId, session.callerId, session.recipientId, 'MISSED');
  }

  /**
   * Mark a call CONNECTED.
   * Only an authorized participant (caller or recipient) may confirm connectivity.
   * This is a client-side confirmation of WebRTC peer connectivity — B3 will send this.
   */
  static async markConnected(tenantId: string, userId: string, sessionId: string, version: number) {
    const session = await prisma.callSession.findUnique({ where: { id: sessionId } });
    if (!session || session.tenantId !== tenantId) throw new Error('Call not found');
    if (session.callerId !== userId && session.recipientId !== userId) throw new Error('Unauthorized: not a call participant');
    if (TERMINAL_STATUSES.includes(session.status)) {
      throw new Error('Cannot connect a terminal call');
    }

    const updated = await prisma.callSession.updateMany({
      where: { id: sessionId, version, status: 'ACCEPTED' },
      data: { status: 'CONNECTED', connectedAt: new Date(), version: { increment: 1 } }
    });
    if (updated.count === 0) throw new Error('Concurrent modification or invalid state transition');
  }

  /**
   * End a call.
   * Either participant (caller or recipient) may end.
   */
  static async endCall(tenantId: string, userId: string, sessionId: string, version: number) {
    const session = await prisma.callSession.findUnique({ where: { id: sessionId } });
    if (!session || session.tenantId !== tenantId) throw new Error('Call not found');
    if (session.callerId !== userId && session.recipientId !== userId) throw new Error('Unauthorized: not a call participant');
    if (TERMINAL_STATUSES.includes(session.status)) {
      throw new Error('Cannot end a terminal call');
    }

    const updated = await prisma.callSession.updateMany({
      where: { id: sessionId, version, status: { in: ACTIVE_STATUSES } },
      data: { status: 'ENDED', endedAt: new Date(), version: { increment: 1 } }
    });
    if (updated.count === 0) throw new Error('Concurrent modification or invalid state transition');

    await CallSessionService._createCallLog(session.tenantId, sessionId, session.callerId, session.recipientId, 'COMPLETED');
  }

  /**
   * Mark expired — called by system/worker.
   * Not directly callable by browser clients.
   */
  static async markExpired(sessionId: string, version: number) {
    const updated = await prisma.callSession.updateMany({
      where: { id: sessionId, version, status: 'RINGING' },
      data: { status: 'EXPIRED', version: { increment: 1 } }
    });
    if (updated.count === 0) {
      logger.warn('Expiry transition ignored: already transitioned', { sessionId });
    }
    const session = await prisma.callSession.findUnique({ where: { id: sessionId } });
    if (session) {
      await CallSessionService._createCallLog(session.tenantId, sessionId, session.callerId, session.recipientId, 'MISSED');
    }
  }

  /**
   * Creates a durable CallLog entry from a terminal CallSession.
   * Idempotent via @@unique([tenantId, providerCallId]) + upsert.
   * A retry never creates a duplicate historical record.
   */
  private static async _createCallLog(
    tenantId: string,
    sessionId: string,
    callerId: string,
    recipientId: string,
    status: 'COMPLETED' | 'MISSED'
  ) {
    await prisma.callLog.upsert({
      where: { tenantId_providerCallId: { tenantId, providerCallId: sessionId } },
      create: {
        tenantId,
        providerCallId: sessionId,   // CallSession.id used as stable reference key
        provider: 'INTERNAL',
        status,
        callerEmployeeId: callerId,
        receiverEmployeeId: recipientId
      },
      update: {} // Idempotent — subsequent writes are no-ops
    });
  }
}
