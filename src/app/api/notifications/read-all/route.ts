import { NextResponse } from 'next/server';
import { requireAuth, requireTenant } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { Logger } from '@/lib/logger/logger';

export async function POST() {
  try {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    const prisma = withTenant(tenantId);
    
    await prisma.notification.updateMany({
      where: {
        tenantId,
        userId: user.id,
        isRead: false
      },
      data: { isRead: true }
    });

    return NextResponse.json({ success: true });
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    Logger.error('Failed to read all notifications', { error: error.message });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
