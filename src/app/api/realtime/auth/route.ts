import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenant } from '@/lib/auth';
import { PusherRealtimeAdapter } from '@/lib/providers/realtime/pusher.provider';
import { ProviderFactory } from '@/lib/providers/provider.factory';
import Pusher from 'pusher';

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

    // Only private- and presence- channels are supported
    if (!channelName.startsWith('private-') && !channelName.startsWith('presence-')) {
      return NextResponse.json({ error: 'Invalid channel type' }, { status: 403 });
    }

    // All channels must be scoped to the authenticated tenant
    const tenantPrefix = `tenant_${tenantId}`;
    if (!channelName.includes(tenantPrefix)) {
      return NextResponse.json({ error: 'Cross-tenant access denied' }, { status: 403 });
    }

    // Private user channels must belong to the authenticated user
    if (channelName.startsWith('private-')) {
      const userPrefix = `user_${user.id}`;
      if (!channelName.includes(userPrefix)) {
        return NextResponse.json({ error: 'Unauthorized user channel access' }, { status: 403 });
      }
    }

    // Presence channels are authorized by tenant membership (already verified above)

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
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
