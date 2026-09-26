import { NextResponse } from 'next/server';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { verifyPassword, verifyDummyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { Logger } from '@/lib/logger/logger';
import { DistributedRateLimiter } from '@/lib/rate-limit/rate-limiter';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const reqHeaders = await headers();
  const ip = reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  
  // 1. CSRF Origin Validation (API Route protection)
  const origin = reqHeaders.get('origin');
  const host = reqHeaders.get('host');
  // For production environments, Origin must exactly match our intended Host.
  if (process.env.NODE_ENV === 'production' && origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        Logger.warn('CSRF Origin mismatch', { origin, host, ip });
        return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid origin format' }, { status: 403 });
    }
  }

  // 2. Global IP Rate Limiting (Abuse Protection)
  const ipLimit = await DistributedRateLimiter.checkLimit('system', 'auth', 'login_ip', 20, 60, ip);
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 3. Account-Level Rate Limiting (Temporary Lockout)
    // 5 attempts per 5 minutes per email
    const emailLimit = await DistributedRateLimiter.checkLimit('system', 'auth', 'login_email', 5, 300, ip, normalizedEmail);
    if (!emailLimit.allowed) {
      await logSecurityEvent('RATE_LIMIT_TRIGGERED', 'MEDIUM', 'Login lockout triggered', ip, normalizedEmail);
      return NextResponse.json({ error: 'Account temporarily locked due to too many failed attempts. Please try again later.' }, { status: 429 });
    }

    const user = await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
      return tx.user.findFirst({
        where: { email: normalizedEmail },
        select: { id: true, status: true, passwordHash: true, tenantId: true }
      });
    });

    let isValid = false;
    let timingMitigated = false;

    if (!user || !user.passwordHash) {
      // 4. Timing-Attack Mitigation: Constant-time dummy verification
      await verifyDummyPassword(password);
      timingMitigated = true;
    } else {
      if (user.status !== 'ACTIVE') {
        await verifyDummyPassword(password);
        timingMitigated = true;
      } else {
        isValid = await verifyPassword(password, user.passwordHash);
      }
    }

    if (!isValid) {
      // Intentionally advance the email rate limiter again on failure if needed, 
      // but the initial checkLimit already incremented the counter.
      await logSecurityEvent('FAILED_LOGIN', 'LOW', 'Invalid credentials', ip, user?.id, user?.tenantId);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 5. Success Flow
    await createSession(user!.id);
    await logSecurityEvent('SUCCESSFUL_LOGIN', 'INFO', 'Native session established', ip, user!.id, user!.tenantId);

    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    Logger.error('Login error:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
}

async function logSecurityEvent(eventType: string, severity: string, source: string, ipAddress: string, userId?: string, tenantId?: string) {
  try {
    await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
      await tx.securityEvent.create({
        data: {
          tenantId: tenantId || 'SYSTEM',
          userId: userId || null,
          eventType: eventType as any,
          severity: severity as any,
          source,
          ipAddress,
          userAgent: 'N/A'
        }
      });
    });
  } catch (err) {
    Logger.error('Failed to log security event', err as Error);
  }
}
