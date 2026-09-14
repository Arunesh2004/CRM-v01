import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { Logger } from '@/lib/logger/logger';
import crypto from 'crypto';
import { BackupSchedulerService } from '@/modules/recovery/scheduler/BackupSchedulerService';

const _orig_POST = async function (request: Request) {
  try {
    const signature = request.headers.get('X-Scheduler-Signature');
    const timestampStr = request.headers.get('X-Scheduler-Timestamp');
    
    if (!signature || !timestampStr) {
      return NextResponse.json({ error: 'Missing authentication headers' }, { status: 403 });
    }

    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();

    // Replay Protection: Reject if timestamp is older than 5 minutes or in the future
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Request timestamp invalid or expired (Replay protection)' }, { status: 403 });
    }

    // G1 REMEDIATION: Fail-closed when secret is absent.
    // Never substitute a default — that defeats HMAC verification entirely.
    // Matches the fail-closed pattern used by verifyCronSecret() in process-outbox.
    const secret = process.env.INTERNAL_SCHEDULER_SECRET;
    if (!secret) {
      Logger.warn('INTERNAL_SCHEDULER_SECRET is not configured. Denying scheduler request.');
      return NextResponse.json({ error: 'Service Unavailable' }, { status: 503 });
    }

    const payload = await request.text();

    // HMAC SHA256 Signature Verification
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    // Constant time comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature);
    const signatureBuffer = Buffer.from(signature);
    
    if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Authenticated! Trigger the backup cycle asynchronously (fire and forget)
    // We don't await the entire cycle to prevent HTTP timeout
    const scheduler = new BackupSchedulerService();
    scheduler.triggerBackupCycle().catch((error) => Logger.error('Backup cycle error:', error));

    return NextResponse.json({ success: true, message: 'Backup cycle initiated' }, { status: 202 });
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    Logger.error('Backup Trigger API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiContext(_orig_POST);
