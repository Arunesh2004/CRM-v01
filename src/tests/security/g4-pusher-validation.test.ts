import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/realtime/auth/route';
import { NextRequest } from 'next/server';
import { PusherRealtimeAdapter } from '@/lib/providers/realtime/pusher.provider';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
  requireTenant: vi.fn().mockResolvedValue('tenant-1'),
}));

vi.mock('@/lib/providers/provider.factory', async () => {
  const actual = await vi.importActual<any>('@/lib/providers/realtime/pusher.provider');
  return {
    ProviderFactory: {
      getRealtimeProvider: vi.fn().mockReturnValue(Object.create(actual.PusherRealtimeAdapter.prototype)),
    },
  };
});

vi.mock('pusher', () => {
  return {
    default: class MockPusher {
      authorizeChannel() { return { auth: 'mocked_auth_token' }; }
    }
  };
});

vi.mock('@/lib/logger/logger', () => ({
  Logger: { error: vi.fn(), warn: vi.fn() }
}));

async function makeAuthRequest(channelName: string) {
  const formData = new FormData();
  formData.append('socket_id', '123.456');
  formData.append('channel_name', channelName);

  const req = new NextRequest('http://localhost/api/realtime/auth', {
    method: 'POST',
    body: formData,
  });

  return POST(req);
}

describe('G4: Strict Pusher Channel Validation', () => {
  it('accepts exact private tenant-user channel', async () => {
    const res = await makeAuthRequest('private-tenant_tenant-1_user_user-1');
    expect(res.status).toBe(200);
  });

  it('accepts generic private tenant channel', async () => {
    const res = await makeAuthRequest('private-tenant_tenant-1_call_999');
    expect(res.status).toBe(200);
  });

  it('accepts exact presence channel', async () => {
    const res = await makeAuthRequest('presence-tenant-tenant-1');
    expect(res.status).toBe(200);
  });

  it('rejects cross-tenant channel', async () => {
    const res = await makeAuthRequest('private-tenant_tenant-2_user_user-1');
    expect(res.status).toBe(403);
  });

  it('rejects cross-user channel', async () => {
    const res = await makeAuthRequest('private-tenant_tenant-1_user_user-2');
    expect(res.status).toBe(403);
  });

  it('rejects embedded valid channel string (substring bypass attack)', async () => {
    // Attack: appending extra user to the end of a valid channel
    const res = await makeAuthRequest('private-tenant_tenant-1_user_user-1-user-2');
    expect(res.status).toBe(403);
  });
});
