import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { Logger } from '@/lib/logger/logger';
import { processOutbox } from '@/modules/core/events/outbox.service';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';

function verifyCronSecret(req: Request): boolean {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // If CRON_SECRET is not configured at all, deny all requests
    Logger.warn('CRON_SECRET environment variable is not set. Denying cron request.');
    return false;
  }
  // Constant-time comparison to prevent timing attacks
  if (token.length !== cronSecret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ cronSecret.charCodeAt(i);
  }
  return mismatch === 0;
}

const _orig_GET = async function (req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await processOutbox();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: sanitizeClientError(error) }, { status: 500 });
  }
}

const _orig_POST = async function (req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await processOutbox();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: sanitizeClientError(error) }, { status: 500 });
  }
}

export const GET = withApiContext(_orig_GET);

export const POST = withApiContext(_orig_POST);
