import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenant } from '@/lib/auth';
import { PusherRealtimeAdapter } from '@/lib/providers/realtime/pusher.provider';
import { ProviderFactory } from '@/lib/providers/provider.factory';
import Pusher from 'pusher';
import { Logger } from '@/lib/logger/logger';

export async function POST(req: NextRequest) {
  try {
    // Identity and tenant derived entirely server-side — never trusted from request body
    const user = await requireAuth();
    const tenantId = await requireTenant();

    // Parse form data (Pusher sends socket_id and channel_name as URL-encoded form)
    const data = await req.formData();
    const socketId = data.get('socket_id')?.toString();
    const channelName = data.get('channel_name')?.toString();

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
    }

    // Exact Structural Validation (G4 Remediation)
    const isValidTenantUserChannel = channelName === `private-tenant_${tenantId}_user_${user.id}`;
    // E.g. call channels or generic tenant channels: private-tenant_{tenantId}_{channelId}
    const isGenericTenantChannel = channelName.startsWith(`private-tenant_${tenantId}_`) && !channelName.includes('_user_');
    const isValidPresenceChannel = channelName === `presence-tenant-${tenantId}` || channelName === `presence-tenant_${tenantId}`;

    if (!isValidTenantUserChannel && !isGenericTenantChannel && !isValidPresenceChannel) {
      Logger.warn('Realtime Auth Failed: Invalid or unauthorized channel structure', { channelName, userId: user.id, tenantId });
      return NextResponse.json({ error: 'Forbidden channel access' }, { status: 403 });
    }

    const realtimeAdapter = ProviderFactory.getRealtimeProvider();

    if (!(realtimeAdapter instanceof PusherRealtimeAdapter)) {
      return NextResponse.json({ error: 'REALTIME_PROVIDER_NOT_CONFIGURED' }, { status: 503 });
    }

    // Initialize Pusher solely for the auth token signature — secret stays server-side
    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });

    let authResponse;

    if (channelName.startsWith('presence-')) {
      const presenceData = {
        user_id: user.id,
        user_info: { email: user.email }
      };
      authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);
    } else {
      authResponse = pusher.authorizeChannel(socketId, channelName);
    }

    return NextResponse.json(authResponse);
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    Logger.error('Realtime Auth Error', { error: error.message });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
