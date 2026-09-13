/**
 * S14-B3 Security Tests: WebRTC Server-Relayed Signaling
 * 
 * Verifies the API endpoint src/app/api/communication/call/signaling/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mock State
// ---------------------------------------------------------------------------

const mockState = {
  authError: false,
  tenantError: false,
  authUser: { id: 'user-caller', email: 'test@example.com', role: 'EMPLOYEE' },
  tenantId: 'tenant-A',
  
  sessionData: null as unknown,
  
  publishToUser: null as null | ((...args: unknown[]) => Promise<void>),
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth', () => ({
  requireAuth: async () => {
    if (mockState.authError) throw new Error('Unauthenticated');
    return mockState.authUser;
  },
  requireTenant: async () => {
    if (mockState.tenantError) throw new Error('Unauthenticated');
    return mockState.tenantId;
  },
}));

vi.mock('@db/utils/prisma', () => ({
  default: {
    callSession: {
      findUnique: async (args: { where: { id: string } }) => {
        if (!mockState.sessionData || args.where.id !== (mockState.sessionData as { id: string }).id) return null;
        return mockState.sessionData;
      },
    },
  },
}));

vi.mock('@/modules/communication/adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../modules/communication/adapter')>();
  return {
    ...actual,
    realtime: {
      publishToUser: async (...args: unknown[]) => {
        if (mockState.publishToUser) return mockState.publishToUser(...args);
        return Promise.resolve();
      },
      publishToChannel: async () => Promise.resolve(),
    },
  };
});

// Import route AFTER mocks
import { POST } from '../../app/api/communication/call/signaling/route';
import { realtime } from '@/modules/communication/adapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    tenantId: 'tenant-A',
    callerId: 'user-caller',
    recipientId: 'user-recipient',
    status: 'RINGING',
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}

function makeRequest(body: unknown, overrides: Record<string, unknown> = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost/api/communication/call/signaling', {
    method: 'POST',
    body: text,
    ...overrides,
  });
}

function resetMockState() {
  mockState.authError = false;
  mockState.tenantError = false;
  mockState.authUser = { id: 'user-caller', email: 'test@example.com', role: 'EMPLOYEE' };
  mockState.tenantId = 'tenant-A';
  mockState.sessionData = makeSession();
  mockState.publishToUser = null;
  vi.clearAllMocks();
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe('(S14-B3) WebRTC Signaling Route', () => {
  beforeEach(resetMockState);

  describe('Authentication & Tenancy', () => {
    it('(1) unauthenticated request denied', async () => {
      mockState.authError = true;
      const req = makeRequest({ callId: 'session-1', type: 'offer', payload: {} });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('(2) same-tenant signaling allowed', async () => {
      const spy = vi.spyOn(realtime, 'publishToUser');
      const req = makeRequest({ callId: 'session-1', type: 'offer', payload: { sdp: 'test' } });
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(spy).toHaveBeenCalledWith('tenant-A', 'user-recipient', 'webrtc-offer', expect.any(Object));
    });

    it('(3) cross-tenant signaling denied (returns 404)', async () => {
      mockState.sessionData = makeSession({ tenantId: 'tenant-B' });
      const req = makeRequest({ callId: 'session-1', type: 'offer', payload: {} });
      const res = await POST(req);
      expect(res.status).toBe(404);
    });

    it('(4) forged tenant denied (uses server context)', async () => {
      mockState.tenantId = 'tenant-B'; // server resolves actor to B
      mockState.sessionData = makeSession({ tenantId: 'tenant-A' }); // session is A
      // The attacker tries to pass tenant-A in body? We don't even read it.
      const req = makeRequest({ callId: 'session-1', type: 'offer', payload: {} });
      const res = await POST(req);
      expect(res.status).toBe(404);
    });
  });

  describe('Identity & Participation', () => {
    it('(5) forged caller identity denied', async () => {
      // server resolves actor to 'user-attacker'
      mockState.authUser = { id: 'user-attacker', email: 'a@a.com', role: 'EMPLOYEE' };
      const req = makeRequest({ callId: 'session-1', type: 'offer', payload: {}, callerId: 'user-caller' }); // try to forge in body
      const res = await POST(req);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Unauthorized: not a call participant' });
    });

    it('(7) non-participant denied', async () => {
      mockState.authUser = { id: 'user-other', email: 'o@o.com', role: 'EMPLOYEE' };
      const req = makeRequest({ callId: 'session-1', type: 'offer', payload: {} });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  });

  describe('Call Lifecycle', () => {
    it('(8) active RINGING call valid signaling where appropriate', async () => {
      const req = makeRequest({ callId: 'session-1', type: 'offer', payload: {} });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it('(9) accepted call valid signaling', async () => {
      mockState.sessionData = makeSession({ status: 'ACCEPTED' });
      mockState.authUser = { id: 'user-recipient', email: '', role: 'EMPLOYEE' };
      const req = makeRequest({ callId: 'session-1', type: 'answer', payload: {} });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    const terminalCases = ['ENDED', 'REJECTED', 'EXPIRED', 'FAILED', 'MISSED'];
    terminalCases.forEach((status, idx) => {
      it(`(${10 + idx}) terminal ${status} call denied`, async () => {
        mockState.sessionData = makeSession({ status });
        const req = makeRequest({ callId: 'session-1', type: 'candidate', payload: {} });
        const res = await POST(req);
        expect(res.status).toBe(409);
        expect((await res.json()).error).toMatch(/Cannot signal on a terminal call/);
      });
    });

    it('(14b) strictly expired by timestamp denied', async () => {
      mockState.sessionData = makeSession({ expiresAt: new Date(Date.now() - 1000) });
      const req = makeRequest({ callId: 'session-1', type: 'candidate', payload: {} });
      const res = await POST(req);
      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe('Call session has expired');
    });
  });

  describe('Type & State Validation', () => {
    it('(15) offer accepted only from caller', async () => {
      mockState.authUser = { id: 'user-recipient', email: '', role: 'EMPLOYEE' };
      const req = makeRequest({ callId: 'session-1', type: 'offer', payload: {} });
      const res = await POST(req);
      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe('Only caller can send offer');
    });

    it('(16) answer accepted only from recipient, and not in RINGING', async () => {
      const req1 = makeRequest({ callId: 'session-1', type: 'answer', payload: {} });
      const res1 = await POST(req1);
      expect(res1.status).toBe(409);
      expect((await res1.json()).error).toBe('Only recipient can send answer');

      mockState.authUser = { id: 'user-recipient', email: '', role: 'EMPLOYEE' };
      mockState.sessionData = makeSession({ status: 'RINGING' });
      const req2 = makeRequest({ callId: 'session-1', type: 'answer', payload: {} });
      const res2 = await POST(req2);
      expect(res2.status).toBe(409);
      expect((await res2.json()).error).toBe('Cannot send answer before call is accepted');
    });

    it('(17) candidate accepted from either', async () => {
      const req1 = makeRequest({ callId: 'session-1', type: 'candidate', payload: {} });
      expect((await POST(req1)).status).toBe(200);

      mockState.authUser = { id: 'user-recipient', email: '', role: 'EMPLOYEE' };
      const req2 = makeRequest({ callId: 'session-1', type: 'candidate', payload: {} });
      expect((await POST(req2)).status).toBe(200);
    });

    it('(18) unknown type rejected', async () => {
      const req = makeRequest({ callId: 'session-1', type: 'magic', payload: {} });
      const res = await POST(req);
      expect(res.status).toBe(422);
    });
  });

  describe('Payload Validation', () => {
    it('(19) malformed payload rejected', async () => {
      const req = makeRequest('{ bad json');
      const res = await POST(req);
      expect(res.status).toBe(422);
    });

    it('(20) oversized payload rejected (>4KB)', async () => {
      const bigPayload = { sdp: 'a'.repeat(5000) };
      const req = makeRequest({ callId: 'session-1', type: 'offer', payload: bigPayload });
      const res = await POST(req);
      expect(res.status).toBe(413);
    });

    it('(21) missing or array payload rejected', async () => {
      const res1 = await POST(makeRequest({ callId: 'session-1', type: 'offer' }));
      expect(res1.status).toBe(422);

      const res2 = await POST(makeRequest({ callId: 'session-1', type: 'offer', payload: [] }));
      expect(res2.status).toBe(422);
      
      const res3 = await POST(makeRequest({ callId: 'session-1', type: 'offer', payload: 'string' }));
      expect(res3.status).toBe(422);
    });
  });

  describe('Target Derivation', () => {
    it('(22) caller -> recipient target, target spoofing ignored', async () => {
      const spy = vi.spyOn(realtime, 'publishToUser');
      const req = makeRequest({ callId: 'session-1', type: 'offer', payload: {}, targetUserId: 'user-attacker' });
      await POST(req);
      expect(spy).toHaveBeenCalledWith('tenant-A', 'user-recipient', 'webrtc-offer', expect.any(Object));
    });

    it('(23) recipient -> caller target', async () => {
      mockState.authUser = { id: 'user-recipient', email: '', role: 'EMPLOYEE' };
      const spy = vi.spyOn(realtime, 'publishToUser');
      const req = makeRequest({ callId: 'session-1', type: 'candidate', payload: {} });
      await POST(req);
      expect(spy).toHaveBeenCalledWith('tenant-A', 'user-caller', 'webrtc-candidate', expect.any(Object));
    });
  });

  describe('Provider Failures', () => {
    it('(25) explicit REALTIME_PROVIDER_NOT_CONFIGURED', async () => {
      mockState.publishToUser = async () => { throw new Error('REALTIME_PROVIDER_NOT_CONFIGURED'); };
      const req = makeRequest({ callId: 'session-1', type: 'offer', payload: {} });
      const res = await POST(req);
      expect(res.status).toBe(503);
      expect((await res.json()).error).toBe('REALTIME_PROVIDER_NOT_CONFIGURED');
    });

    it('(26) provider publish failure -> explicit failure', async () => {
      mockState.publishToUser = async () => { throw new Error('Network issue'); };
      const req = makeRequest({ callId: 'session-1', type: 'offer', payload: {} });
      const res = await POST(req);
      expect(res.status).toBe(503);
      expect((await res.json()).error).toBe('Signaling delivery failed');
    });
  });
});
