import { withApiContext } from '@/lib/observability/context';
import { Logger } from '@/lib/logger/logger';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth, clerkClient } from '@clerk/nextjs/server';
import globalPrisma from '@db/utils/prisma';

const original_POST = async function (req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Look up the user's tenantId from the database using their Clerk ID
    const user = await globalPrisma.user.findFirst({
      where: { clerkId: userId },
      select: { id: true, tenantId: true },
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

    // Authorize private-tenant-{tenantId} — tenant isolation enforced here
    if (channelName.startsWith('private-tenant-')) {
      const requestedTenantId = channelName.replace('private-tenant-', '');
      if (user.tenantId !== requestedTenantId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (channelName.startsWith('private-user-')) {
      const requestedUserId = channelName.replace('private-user-', '');
      if (user.id !== requestedUserId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Unsupported channel type' }, { status: 403 });
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
