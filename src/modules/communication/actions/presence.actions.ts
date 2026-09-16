'use server';

import { requireAuth } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { DistributedRateLimiter } from '@/lib/rate-limit/rate-limiter';
import { realtime } from '../adapter';

export async function heartbeatAction(status: 'ONLINE' | 'AWAY' | 'BUSY' = 'ONLINE') {
  const user = await requireAuth();

  // Bounded heartbeat frequency (max 10 per minute per user)
  const rl = await DistributedRateLimiter.checkLimit(user.tenantId, 'PRESENCE', 'HEARTBEAT', 10, 60, undefined, user.id);
  if (!rl.allowed) throw new Error('Too many requests');

  const prisma = withTenant(user.tenantId);

  // Upsert presence record securely using authenticated context
  const presence = await prisma.userPresence.upsert({
    where: { userId: user.id },
    create: {
      tenantId: user.tenantId,
      userId: user.id,
      status,
      lastSeenAt: new Date(),
    },
    update: {
      status,
      lastSeenAt: new Date(),
    }
  });

  // Publish presence update (Pusher presence channel handles connected clients natively,
  // but we can also broadcast a generic status update for graceful offline tracking).
  // E.g., broadcast to a tenant-wide presence observer channel if architected.
  
  return { success: true, data: presence };
}

export async function getPresenceAction(userIds: string[]) {
  const user = await requireAuth();

  // Rate limit
  const rl = await DistributedRateLimiter.checkLimit(user.tenantId, 'PRESENCE', 'GET_PRESENCE', 100, 60, undefined, user.id);
  if (!rl.allowed) throw new Error('Too many requests');

  const prisma = withTenant(user.tenantId);

  const presences = await prisma.userPresence.findMany({
    where: {
      userId: { in: userIds }
    }
  });

  return { success: true, data: presences };
}
