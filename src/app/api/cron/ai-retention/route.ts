import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/observability/context';
import { ConversationRetentionService } from '@/modules/ai/conversation-retention.service';
import { Logger } from '@/lib/logger/logger';
import { DistributedConcurrencyLock } from '@/lib/security/concurrency-lock';

function verifyCronSecret(req: Request): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    Logger.error('[Cron] CRON_SECRET environment variable is not set. Denying request.', new Error('Missing CRON_SECRET'), { category: 'auth' });
    return false;
  }

  const token = authHeader.replace('Bearer ', '');
  if (token.length !== cronSecret.length) return false;

  // Safe timing comparison
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ cronSecret.charCodeAt(i);
  }
  return mismatch === 0;
}

const _orig_GET = async function (req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jobId = 'cron_' + Date.now();
  const lockKey = await DistributedConcurrencyLock.acquire('SYSTEM', 'CRON_RETENTION', jobId);
  
  if (!lockKey.acquired) {
    Logger.warn('Retention cron is already running on another instance.', { category: 'internal' });
    return NextResponse.json({ ok: false, error: 'Job already running' }, { status: 429 });
  }

  try {
    const start = Date.now();
    const result = await ConversationRetentionService.runRetentionCycle();
    const durationMs = Date.now() - start;
    
    Logger.info('AI Retention Job Result', {
      jobId,
      durationMs,
      archivedCount: result.archived,
      deletedCount: result.deleted,
      dryRun: result.dryRun,
      category: 'internal'
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    Logger.error('AI Retention Cycle Failed', err instanceof Error ? err : new Error(String(err?.message ?? 'unknown')), { event: 'AI_RETENTION_FAILED', jobId });
    return NextResponse.json({ ok: false, error: 'Internal failure' }, { status: 500 });
  } finally {
    if (lockKey.lockKey) {
      await DistributedConcurrencyLock.release('SYSTEM', 'CRON_RETENTION', lockKey.lockKey);
    }
  }
}

export const GET = withApiContext(_orig_GET);
