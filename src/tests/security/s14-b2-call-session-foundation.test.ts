/**
 * S14-B2 Security + Concurrency Foundation Tests
 *
 * Tests CallSessionService (state machine, terminal protection, expiry, concurrency)
 * and provider/factory behaviour (degradation, no fake success).
 *
 * Mock design: Vitest hoists vi.mock() calls to the top of the file.
 * Variables declared with `let` at module scope cannot be referenced inside
 * vi.mock() factory functions (temporal dead zone). Instead we use module-level
 * objects with mutable properties to allow per-test reconfiguration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DegradedRealtimeAdapter, PusherRealtimeAdapter } from '../../lib/providers/realtime/pusher.provider';

// ---------------------------------------------------------------------------
// Shared mutable mock state — safe to reference inside vi.mock() factories
// ---------------------------------------------------------------------------

const mockState = {
  findFirst: null as null | (() => Promise<unknown>),
  findUnique: null as null | (() => Promise<unknown>),
  create: null as null | ((args: unknown) => Promise<unknown>),
  updateMany: null as null | (() => Promise<{ count: number }>),
  update: null as null | (() => Promise<unknown>),
  upsert: null as null | (() => Promise<unknown>),
  publishToUser: null as null | (() => Promise<void>),
  publishToChannel: null as null | (() => Promise<void>),
  // transaction can be overridden per-test for concurrency scenarios
  transactionOverride: null as null | ((fn: (tx: unknown) => unknown) => Promise<unknown>),
};

// ---------------------------------------------------------------------------
// vi.mock() factories — use mockState (initialized before module import)
// ---------------------------------------------------------------------------

vi.mock('@db/utils/prisma', () => {
  const makeDefaultTx = () => ({
    callSession: {
      findFirst: () => (mockState.findFirst ? mockState.findFirst() : Promise.resolve(null)),
      create: (args: unknown) => (mockState.create ? mockState.create(args) : Promise.resolve({ id: 'session-1' })),
    },
  });

  const prismaMock = {
    $transaction: (fn: (tx: unknown) => unknown, _opts?: unknown) => {
      if (mockState.transactionOverride) return mockState.transactionOverride(fn);
      return fn(makeDefaultTx());
    },
    callSession: {
      findFirst: () => (mockState.findFirst ? mockState.findFirst() : Promise.resolve(null)),
      findUnique: () => (mockState.findUnique ? mockState.findUnique() : Promise.resolve(null)),
      create: (args: unknown) => (mockState.create ? mockState.create(args) : Promise.resolve({ id: 'session-1' })),
      update: () => (mockState.update ? mockState.update() : Promise.resolve({})),
      updateMany: () => (mockState.updateMany ? mockState.updateMany() : Promise.resolve({ count: 1 })),
    },
    callLog: {
      upsert: () => (mockState.upsert ? mockState.upsert() : Promise.resolve({})),
    },
  };

  return { default: prismaMock };
});

vi.mock('@/modules/communication/adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../modules/communication/adapter')>();
  return {
    ...actual,
    realtime: {
      publishToUser: (..._args: unknown[]) =>
        mockState.publishToUser ? mockState.publishToUser() : Promise.resolve(),
      publishToChannel: (..._args: unknown[]) =>
        mockState.publishToChannel ? mockState.publishToChannel() : Promise.resolve(),
    },
  };
});

// Import service AFTER mocks
import { CallSessionService } from '../../modules/communication/call-session.service';

// ---------------------------------------------------------------------------
// Vitest spy refs (set after import)
// ---------------------------------------------------------------------------

// We need to track call counts and arguments — wrap with vi.fn on the mock object directly
import prismaDefault from '@db/utils/prisma';
import { realtime } from '@/modules/communication/adapter';

// ---------------------------------------------------------------------------
// Helper factory
// ---------------------------------------------------------------------------

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    tenantId: 'tenant-A',
    callerId: 'user-caller',
    recipientId: 'user-recipient',
    status: 'RINGING',
    expiresAt: new Date(Date.now() + 60_000),
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    failureReason: null,
    acceptedAt: null,
    connectedAt: null,
    endedAt: null,
    ...overrides,
  };
}

function defaultSession() {
  return Promise.resolve(makeSession());
}

function defaultCreate(args: unknown) {
  const a = args as { data: Record<string, unknown> };
  return Promise.resolve({ id: 'session-1', ...a.data, version: 0 });
}

function resetMockState() {
  mockState.findFirst = () => Promise.resolve(null);
  mockState.findUnique = () => Promise.resolve(null);
  mockState.create = (args) => defaultCreate(args);
  mockState.updateMany = () => Promise.resolve({ count: 1 });
  mockState.update = () => Promise.resolve({});
  mockState.upsert = () => Promise.resolve({});
  mockState.publishToUser = () => Promise.resolve();
  mockState.publishToChannel = () => Promise.resolve();
  mockState.transactionOverride = null;
}

// ---------------------------------------------------------------------------
// SECTION 1 — initiateCall
// ---------------------------------------------------------------------------

describe('(S14-B2) CallSessionService.initiateCall', () => {
  beforeEach(resetMockState);

  it('(01) valid creation returns RINGING session', async () => {
    const session = await CallSessionService.initiateCall('tenant-A', 'user-caller', 'user-recipient');
    expect(session.status).toBe('RINGING');
    expect(session.id).toBe('session-1');
  });

  it('(02) blocks if caller already has active call', async () => {
    mockState.findFirst = () => Promise.resolve(makeSession({ callerId: 'user-caller' }));
    await expect(
      CallSessionService.initiateCall('tenant-A', 'user-caller', 'user-other')
    ).rejects.toThrow('already in an active call');
  });

  it('(03) blocks if recipient already has active call', async () => {
    mockState.findFirst = () => Promise.resolve(makeSession({ recipientId: 'user-recipient' }));
    await expect(
      CallSessionService.initiateCall('tenant-A', 'user-other', 'user-recipient')
    ).rejects.toThrow('already in an active call');
  });

  it('(04) realtime publish failure → session FAILED, no ghost ringing', async () => {
    const updateSpy = vi.spyOn(prismaDefault.callSession, 'update');
    mockState.publishToUser = () => Promise.reject(new Error('Pusher down'));

    await expect(
      CallSessionService.initiateCall('tenant-A', 'user-caller', 'user-recipient')
    ).rejects.toThrow('realtime publish error');

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) })
    );
    updateSpy.mockRestore();
  });

  it('(05) self-call is rejected immediately', async () => {
    await expect(
      CallSessionService.initiateCall('tenant-A', 'user-1', 'user-1')
    ).rejects.toThrow('Cannot call yourself');
  });
});

// ---------------------------------------------------------------------------
// SECTION 2 — Concurrency policy
// ---------------------------------------------------------------------------

describe('(S14-B2) Active-call concurrency policy', () => {
  beforeEach(resetMockState);

  it('(06) concurrent same-caller → exactly one succeeds', async () => {
    let callCount = 0;
    mockState.transactionOverride = async (fn: (tx: unknown) => unknown) => {
      const index = callCount++;
      const tx = {
        callSession: {
          findFirst: () => (index === 0 ? Promise.resolve(null) : Promise.resolve(makeSession())),
          create: (args: unknown) => defaultCreate(args),
        },
      };
      return fn(tx);
    };

    const results = await Promise.allSettled([
      CallSessionService.initiateCall('tenant-A', 'user-caller', 'user-r1'),
      CallSessionService.initiateCall('tenant-A', 'user-caller', 'user-r2'),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect((failures[0] as PromiseRejectedResult).reason.message).toMatch('already in an active call');
  });

  it('(07) concurrent same-recipient → exactly one succeeds', async () => {
    let callCount = 0;
    mockState.transactionOverride = async (fn: (tx: unknown) => unknown) => {
      const index = callCount++;
      const tx = {
        callSession: {
          findFirst: () =>
            index === 0
              ? Promise.resolve(null)
              : Promise.resolve(makeSession({ recipientId: 'user-recipient' })),
          create: (args: unknown) => defaultCreate(args),
        },
      };
      return fn(tx);
    };

    const results = await Promise.allSettled([
      CallSessionService.initiateCall('tenant-A', 'user-c1', 'user-recipient'),
      CallSessionService.initiateCall('tenant-A', 'user-c2', 'user-recipient'),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled').length).toBe(1);
    expect(results.filter((r) => r.status === 'rejected').length).toBe(1);
  });

  it('(08) P2034 serialization failure → treated as active-call policy violation', async () => {
    mockState.transactionOverride = () =>
      Promise.reject(Object.assign(new Error('TX conflict'), { code: 'P2034' }));

    await expect(
      CallSessionService.initiateCall('tenant-A', 'user-caller', 'user-recipient')
    ).rejects.toThrow('already in an active call');
  });

  it('(09) after terminal call, a new call is permitted', async () => {
    // No active call exists
    mockState.findFirst = () => Promise.resolve(null);
    const session = await CallSessionService.initiateCall('tenant-A', 'user-caller', 'user-recipient');
    expect(session.id).toBe('session-1');
  });
});

// ---------------------------------------------------------------------------
// SECTION 3 — acceptCall
// ---------------------------------------------------------------------------

describe('(S14-B2) CallSessionService.acceptCall', () => {
  beforeEach(resetMockState);

  it('(10) recipient accepts ringing call', async () => {
    mockState.findUnique = defaultSession;
    await expect(
      CallSessionService.acceptCall('tenant-A', 'user-recipient', 'session-1', 0)
    ).resolves.toBeUndefined();
  });

  it('(11) caller cannot accept — not recipient', async () => {
    mockState.findUnique = defaultSession;
    await expect(
      CallSessionService.acceptCall('tenant-A', 'user-caller', 'session-1', 0)
    ).rejects.toThrow('only recipient can accept');
  });

  it('(12) cross-tenant access rejected', async () => {
    mockState.findUnique = () => Promise.resolve(makeSession({ tenantId: 'tenant-B' }));
    await expect(
      CallSessionService.acceptCall('tenant-A', 'user-recipient', 'session-1', 0)
    ).rejects.toThrow('Call not found');
  });

  it('(13) stale version → transition fails', async () => {
    mockState.findUnique = () => Promise.resolve(makeSession({ version: 5 }));
    mockState.updateMany = () => Promise.resolve({ count: 0 }); // WHERE version=0 AND status=RINGING → miss
    await expect(
      CallSessionService.acceptCall('tenant-A', 'user-recipient', 'session-1', 0)
    ).rejects.toThrow('Concurrent modification');
  });

  it('(14) expired session cannot be accepted', async () => {
    mockState.findUnique = () =>
      Promise.resolve(makeSession({ expiresAt: new Date(Date.now() - 1000) }));
    await expect(
      CallSessionService.acceptCall('tenant-A', 'user-recipient', 'session-1', 0)
    ).rejects.toThrow('expired');
  });

  it('(15) terminal sessions cannot be accepted', async () => {
    for (const status of ['ENDED', 'REJECTED', 'MISSED', 'FAILED', 'EXPIRED']) {
      mockState.findUnique = () =>
        Promise.resolve(makeSession({ status, expiresAt: new Date(Date.now() + 60_000) }));
      await expect(
        CallSessionService.acceptCall('tenant-A', 'user-recipient', 'session-1', 0)
      ).rejects.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// SECTION 4 — endCall + terminal protection
// ---------------------------------------------------------------------------

describe('(S14-B2) CallSessionService.endCall', () => {
  beforeEach(resetMockState);

  it('(16) caller can end active call + CallLog created', async () => {
    const upsertSpy = vi.spyOn(prismaDefault.callLog, 'upsert');
    mockState.findUnique = () => Promise.resolve(makeSession({ status: 'CONNECTED' }));

    await expect(
      CallSessionService.endCall('tenant-A', 'user-caller', 'session-1', 0)
    ).resolves.toBeUndefined();

    expect(upsertSpy).toHaveBeenCalledOnce();
    upsertSpy.mockRestore();
  });

  it('(17) recipient can end active call', async () => {
    mockState.findUnique = () => Promise.resolve(makeSession({ status: 'CONNECTED' }));
    await expect(
      CallSessionService.endCall('tenant-A', 'user-recipient', 'session-1', 0)
    ).resolves.toBeUndefined();
  });

  it('(18) non-participant cannot end call', async () => {
    mockState.findUnique = () => Promise.resolve(makeSession({ status: 'CONNECTED' }));
    await expect(
      CallSessionService.endCall('tenant-A', 'user-stranger', 'session-1', 0)
    ).rejects.toThrow('not a call participant');
  });

  it('(19) terminal call cannot be ended again', async () => {
    for (const status of ['ENDED', 'REJECTED', 'MISSED', 'FAILED', 'EXPIRED']) {
      mockState.findUnique = () => Promise.resolve(makeSession({ status }));
      await expect(
        CallSessionService.endCall('tenant-A', 'user-caller', 'session-1', 0)
      ).rejects.toThrow('terminal');
    }
  });
});

// ---------------------------------------------------------------------------
// SECTION 5 — CallLog idempotency
// ---------------------------------------------------------------------------

describe('(S14-B2) CallLog upsert idempotency', () => {
  beforeEach(resetMockState);

  it('(20) upsert uses providerCallId = sessionId as stable key', async () => {
    const upsertSpy = vi.spyOn(prismaDefault.callLog, 'upsert');
    mockState.findUnique = () => Promise.resolve(makeSession({ status: 'CONNECTED' }));
    await CallSessionService.endCall('tenant-A', 'user-caller', 'session-1', 0);

    expect(upsertSpy).toHaveBeenCalledOnce();
    const [call] = upsertSpy.mock.calls;
    expect((call[0] as any).where.tenantId_providerCallId.providerCallId).toBe('session-1');
    expect((call[0] as any).update).toEqual({}); // no-op on re-run
    upsertSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// SECTION 6 — Provider degradation
// ---------------------------------------------------------------------------

describe('(S14-B2) Provider degradation — no silent success', () => {
  it('(21) DegradedAdapter throws on incoming-call signaling', async () => {
    const adapter = new DegradedRealtimeAdapter();
    await expect(
      adapter.publishToUser('tenant-A', 'user-1', 'incoming-call', {})
    ).rejects.toThrow('REALTIME_PROVIDER_NOT_CONFIGURED');
  });

  it('(22) DegradedAdapter throws on webrtc-* events', async () => {
    const adapter = new DegradedRealtimeAdapter();
    await expect(
      adapter.publishToUser('tenant-A', 'user-1', 'webrtc-offer', {})
    ).rejects.toThrow('REALTIME_PROVIDER_NOT_CONFIGURED');
  });

  it('(23) DegradedAdapter does NOT silently return success for critical events', async () => {
    const adapter = new DegradedRealtimeAdapter();
    let threw = false;
    try {
      await adapter.publishToUser('tenant-A', 'user-1', 'incoming-call', {});
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it('(24) DegradedAdapter silently skips non-critical channel events', async () => {
    const adapter = new DegradedRealtimeAdapter();
    await expect(
      adapter.publishToChannel('tenant-A', 'notifications', 'new-message', {})
    ).resolves.toBeUndefined();
  });

  it('(25) ProviderFactory → DegradedAdapter when credentials absent', async () => {
    const saved = {
      id: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
    };
    delete process.env.PUSHER_APP_ID;
    delete process.env.PUSHER_KEY;
    delete process.env.PUSHER_SECRET;
    delete process.env.PUSHER_CLUSTER;

    vi.resetModules();
    const { ProviderFactory } = await import('../../lib/providers/provider.factory');
    const adapter = ProviderFactory.getRealtimeProvider();
    expect(adapter.constructor.name).toBe('DegradedRealtimeAdapter');

    if (saved.id) process.env.PUSHER_APP_ID = saved.id;
    if (saved.key) process.env.PUSHER_KEY = saved.key;
    if (saved.secret) process.env.PUSHER_SECRET = saved.secret;
    if (saved.cluster) process.env.PUSHER_CLUSTER = saved.cluster;
  });

  it('(26) ProviderFactory → PusherAdapter when credentials present', async () => {
    process.env.PUSHER_APP_ID = 'test-app-id';
    process.env.PUSHER_KEY = 'test-key';
    process.env.PUSHER_SECRET = 'test-secret';
    process.env.PUSHER_CLUSTER = 'us2';

    vi.resetModules();
    const { ProviderFactory } = await import('../../lib/providers/provider.factory');
    const adapter = ProviderFactory.getRealtimeProvider();
    expect(adapter.constructor.name).toBe('PusherRealtimeAdapter');

    delete process.env.PUSHER_APP_ID;
    delete process.env.PUSHER_KEY;
    delete process.env.PUSHER_SECRET;
    delete process.env.PUSHER_CLUSTER;
  });
});

// ---------------------------------------------------------------------------
// SECTION 7 — markConnected
// ---------------------------------------------------------------------------

describe('(S14-B2) CallSessionService.markConnected', () => {
  beforeEach(resetMockState);

  it('(27) participant confirms CONNECTED after ACCEPTED', async () => {
    mockState.findUnique = () => Promise.resolve(makeSession({ status: 'ACCEPTED' }));
    await expect(
      CallSessionService.markConnected('tenant-A', 'user-caller', 'session-1', 0)
    ).resolves.toBeUndefined();
  });

  it('(28) non-participant cannot confirm CONNECTED', async () => {
    mockState.findUnique = () => Promise.resolve(makeSession({ status: 'ACCEPTED' }));
    await expect(
      CallSessionService.markConnected('tenant-A', 'user-stranger', 'session-1', 0)
    ).rejects.toThrow('not a call participant');
  });

  it('(29) terminal call cannot be marked CONNECTED', async () => {
    mockState.findUnique = () => Promise.resolve(makeSession({ status: 'ENDED' }));
    await expect(
      CallSessionService.markConnected('tenant-A', 'user-caller', 'session-1', 0)
    ).rejects.toThrow('terminal');
  });
});
