import { NextResponse } from 'next/server';
import { revokeCurrentSession } from '@/lib/auth/session';
import { Logger } from '@/lib/logger/logger';
import { getCurrentUserIdentity } from '@/lib/auth';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const reqHeaders = await headers();
  const ip = reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // 1. CSRF Origin Validation
  const origin = reqHeaders.get('origin');
  const host = reqHeaders.get('host');
  if (process.env.NODE_ENV === 'production' && origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        Logger.warn('CSRF Origin mismatch on logout', { origin, host, ip });
        return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid origin format' }, { status: 403 });
    }
  }

  try {
    const user = await getCurrentUserIdentity();
    
    // Revoke server-side AuthSession and delete cookie
    await revokeCurrentSession();

    if (user) {
      // Log the event securely
      await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
        await tx.securityEvent.create({
          data: {
            tenantId: user.tenantId || 'SYSTEM',
            userId: user.id,
            eventType: 'LOGOUT' as any,
            severity: 'INFO' as any,
            source: 'Logout route',
            ipAddress: ip,
            userAgent: reqHeaders.get('user-agent') || 'N/A'
          }
        });
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    Logger.error('Logout error:', err instanceof Error ? err.message : String(err));
    // Fail safely without exposing internal state
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
