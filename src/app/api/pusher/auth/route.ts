import { withApiContext } from '@/lib/observability/context';
import { Logger } from '@/lib/logger/logger';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '@clerk/nextjs/server';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';

const original_POST = async function (req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Look up the user's tenantId from the database using their Clerk ID
    // We must bypass RLS because we don't know the tenant ID yet
    const user = await executeAsSystem(SystemOperation.CLERK_PROVISIONING, async (tx) => {
      return tx.user.findFirst({
        where: { clerkId: userId },
        select: { id: true, tenantId: true },
      });
    });
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const socketId = formData.get('socket_id') as string;
    const channelName = formData.get('channel_name') as string;

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
    }

    // Exact Structural Validation (G4)
    if (channelName === `private-tenant-${user.tenantId}`) {
      // Valid generic tenant channel
    } else if (channelName === `private-user-${user.id}`) {
      // Valid explicit user channel
    } else {
      Logger.warn('Pusher Auth Failed: Invalid or unauthorized channel structure', { channelName, userId: user.id, tenantId: user.tenantId });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const secret = process.env.PUSHER_SECRET;
    const key = process.env.PUSHER_KEY;

    if (!secret || !key) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const stringToSign = `${socketId}:${channelName}`;
    const signature = crypto.createHmac('sha256', secret).update(stringToSign).digest('hex');

    return NextResponse.json({
      auth: `${key}:${signature}`,
    });
  } catch (error) {
    Logger.error('Pusher Auth Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiContext(original_POST);
