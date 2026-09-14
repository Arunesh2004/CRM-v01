import { NextResponse } from 'next/server';
import { NotificationService } from '@/modules/notifications/notification.service';
import { requireAuth } from '@/lib/auth';
import { Logger } from '@/lib/logger/logger';

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    // Tenant is verified by requireAuth/withTenant middleware pattern implicitly,
    // but the query only returns notifications for the authenticated user anyway.
    
    // We get the limit from URL params
    const { searchParams } = new URL(req.url);
    const limitRaw = searchParams.get('limit') || '50';
    const limit = parseInt(limitRaw, 10);

    if (isNaN(limit) || limit <= 0 || limit > 100) {
      return NextResponse.json({ error: 'Invalid limit parameter. Must be between 1 and 100.' }, { status: 400 });
    }

    const notifications = await NotificationService.getNotifications({
      userId: user.id,
      limit
    });

    return NextResponse.json({ notifications });
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    Logger.error('Failed to get notifications', { error: error.message });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
