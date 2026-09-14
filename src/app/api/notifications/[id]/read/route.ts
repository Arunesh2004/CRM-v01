import { NextResponse } from 'next/server';
import { requireAuth, requireTenant } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { Logger } from '@/lib/logger/logger';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    const prisma = withTenant(tenantId);
    
    const resolvedParams = await params;
    
    // Ensure the notification belongs to the user and the tenant (IDOR prevention)
    const notification = await prisma.notification.findFirst({
      where: {
        id: resolvedParams.id,
        tenantId,
        userId: user.id
      }
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    await prisma.notification.update({
      where: { id: resolvedParams.id },
      data: { isRead: true }
    });

    return NextResponse.json({ success: true });
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    Logger.error('Failed to read notification', { error: error.message });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
