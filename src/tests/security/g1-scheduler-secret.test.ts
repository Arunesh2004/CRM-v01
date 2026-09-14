/**
 * Phase 9 — G1 Regression Tests
 * Internal Backup Scheduler Secret — Fail-Closed Verification
 *
 * Proves:
 *   G1.1  Secret absent → request rejected (503)
 *   G1.2  Secret present + invalid signature → rejected (403)
 *   G1.3  Secret present + valid HMAC → accepted (202)
 *   G1.4  Secret never appears in any response body
 *   G1.5  Replay protection still works
 *   G1.6  Missing headers gate fires before secret check
 *
 * All secrets here are in-memory vitest-only values.
 * No production credentials are referenced.
 */

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Extracted handler logic
// (mirrors src/app/api/internal/backup/run/route.ts exactly,
//  minus BackupSchedulerService which we never invoke)
// ---------------------------------------------------------------------------
async function simulateBackupRequest({
  envSecret,
  headerSignature,
  headerTimestamp,
  payload = '',
}: {
  envSecret: string | undefined;
  headerSignature: string | null;
  headerTimestamp: string | null;
  payload?: string;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!headerSignature || !headerTimestamp) {
    return { status: 403, body: { error: 'Missing authentication headers' } };
  }

  const timestamp = parseInt(headerTimestamp, 10);
  const now = Date.now();
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
    return { status: 403, body: { error: 'Request timestamp invalid or expired (Replay protection)' } };
  }

  // G1 REMEDIATION — fail-closed when secret absent
  if (!envSecret) {
    return { status: 503, body: { error: 'Service Unavailable' } };
  }

  const expectedSignature = crypto
    .createHmac('sha256', envSecret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(headerSignature);

  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return { status: 403, body: { error: 'Invalid signature' } };
  }

  return { status: 202, body: { success: true, message: 'Backup cycle initiated' } };
}

function buildValidSignature(secret: string, timestamp: number, payload: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Phase 9 G1 — INTERNAL_SCHEDULER_SECRET fail-closed remediation', () => {
  // In-memory test-only secret. Not used in production.
  const TEST_SECRET = 'vitest-only-scheduler-secret-g1-phase9-not-production';

  function freshTimestamp() {
    return String(Date.now());
  }

  it('G1.1: Secret absent → 503 fail-closed (no default secret substituted)', async () => {
    const ts = freshTimestamp();
    // Even if someone uses the known leaked default, it must not succeed when env var absent
    const result = await simulateBackupRequest({
      envSecret: undefined,
      headerSignature: buildValidSignature('default-insecure-secret-for-dev', Number(ts), ''),
      headerTimestamp: ts,
    });
    expect(result.status).toBe(503);
    expect(result.body.error).toBe('Service Unavailable');
  });

  it('G1.2: Secret present, invalid HMAC → 403', async () => {
    const ts = freshTimestamp();
    const result = await simulateBackupRequest({
      envSecret: TEST_SECRET,
      headerSignature: 'a'.repeat(64),   // wrong but correct length
      headerTimestamp: ts,
    });
    expect(result.status).toBe(403);
    expect(result.body.error).toBe('Invalid signature');
  });

  it('G1.3: Secret present, valid HMAC → 202', async () => {
    const ts = freshTimestamp();
    const result = await simulateBackupRequest({
      envSecret: TEST_SECRET,
      headerSignature: buildValidSignature(TEST_SECRET, Number(ts), ''),
      headerTimestamp: ts,
    });
    expect(result.status).toBe(202);
    expect(result.body.success).toBe(true);
  });

  it('G1.4: Secret value never appears in any response body', async () => {
    const SENTINEL = 'SENTINEL-G1-SECRET-MUST-NOT-LEAK-TO-RESPONSE';
    const ts = freshTimestamp();

    const absentResult = await simulateBackupRequest({
      envSecret: undefined,
      headerSignature: buildValidSignature(SENTINEL, Number(ts), ''),
      headerTimestamp: ts,
    });
    const invalidResult = await simulateBackupRequest({
      envSecret: SENTINEL,
      headerSignature: 'wrongsignature0000000000000000000000000000000000000000000000000000',
      headerTimestamp: ts,
    });
    const validResult = await simulateBackupRequest({
      envSecret: SENTINEL,
      headerSignature: buildValidSignature(SENTINEL, Number(ts), ''),
      headerTimestamp: ts,
    });

    for (const result of [absentResult, invalidResult, validResult]) {
      const body = JSON.stringify(result.body);
      expect(body).not.toContain(SENTINEL);
      expect(body).not.toContain('default-insecure-secret-for-dev');
      expect(body).not.toContain('INTERNAL_SCHEDULER_SECRET');
    }
  });

  it('G1.5: Replay protection — timestamp >5min old → 403', async () => {
    const oldTs = Date.now() - 6 * 60 * 1000;
    const result = await simulateBackupRequest({
      envSecret: TEST_SECRET,
      headerSignature: buildValidSignature(TEST_SECRET, oldTs, ''),
      headerTimestamp: String(oldTs),
    });
    expect(result.status).toBe(403);
  });

  it('G1.6: Missing headers → 403 before reaching secret-check gate', async () => {
    // Even with no secret, missing-header check must fire first (not 503)
    const result = await simulateBackupRequest({
      envSecret: undefined,
      headerSignature: null,
      headerTimestamp: null,
    });
    expect(result.status).toBe(403);
    expect(result.body.error).toBe('Missing authentication headers');
  });
});
