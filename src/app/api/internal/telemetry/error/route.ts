import { NextRequest, NextResponse } from 'next/server';
import { ClientTelemetryErrorSchema } from '@/lib/observability/client-telemetry';
import { DistributedRateLimiter } from '@/lib/rate-limit/rate-limiter';
import { getCurrentUserIdentity } from '@/lib/auth';
import { errorTracker } from '@/lib/observability/error-tracker';
import { redact } from '@/lib/observability/redact';

export async function POST(req: NextRequest) {
  try {
    // 1. IP Extraction & Trust
    // NextRequest.ip is not available in some versions, and x-forwarded-for can be spoofed.
    // We explicitly acknowledge this is NOT a cryptographically trusted boundary.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    
    // 2. Strict Payload Size Limit
    // Enforce 5KB limit BEFORE parsing JSON to prevent payload bloat attacks.
    const rawBody = await req.text();
    if (rawBody.length > 5120) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    // 3. Parse JSON
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 });
    }

    // 4. Authoritative Schema Enforcement
    const parsed = ClientTelemetryErrorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Schema validation failed' }, { status: 400 });
    }
    const data = parsed.data;

    // 5. Tenant & Authentication (Best-Effort)
    // Never accept client-provided tenantId. Resolve strictly from server.
    const user = await getCurrentUserIdentity();
    const userId = user?.id;
    const tenantId = user?.tenantId;

    // 6. Rate Limiting
    // Degrade semantics: When Redis is unavailable, 'degrade' falls back to MemoryRateLimitFallback.
    // This is explicitly an instance-local mitigation, not a distributed security guarantee.
    const rl = await DistributedRateLimiter.checkLimit('anonymous', 'TELEMETRY', 'ERROR', 20, 60, ip, userId, 'degrade');
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // 7. Server-Side Stack Truncation & Redaction
    let cleanStack: string | undefined = undefined;
    if (data.stack) {
      // Independent server-side truncation (max 2000 chars, 3 lines)
      const lines = data.stack.substring(0, 2000).split('\n');
      cleanStack = lines.slice(0, 3).map(line => line.replace(/webpack-internal:\/\/\/[^ ]+/g, 'webpack-internal://...')).join('\n');
      cleanStack = redact(cleanStack) as string;
    }

    const cleanMessage = redact(data.message || '') as string;

    // 8. Log the error to the existing ErrorTracker
    errorTracker.captureException(new Error(`[ClientError] ${data.name}: ${cleanMessage}`), {
      url: data.url,
      digest: data.digest,
      stack: cleanStack,
      tenantId, // Only from trusted source
      ip,       // Untrusted, but logged for diagnostics
    }, {
      user: { id: userId }
    });

    // 9. Exact HTTP Contract - Success
    return NextResponse.json({ accepted: true }, { status: 202 });

  } catch (err: unknown) {
    // 10. Internal Telemetry Failure
    // Log internally but do not leak to client. Client boundary swallows the 500 silently.
    console.error('Internal Telemetry Failure:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
