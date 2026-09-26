import { NextResponse } from 'next/server';
import { getCurrentUserIdentity } from '@/lib/auth';
import { Logger } from '@/lib/logger/logger';

export async function GET() {
  try {
    // This calls requireAuth() essentially if we enforce existence
    const user = await getCurrentUserIdentity();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      tenantId: user.tenantId,
      status: user.status
    });
  } catch (error) {
    Logger.error('Error fetching current user profile', error as Error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
