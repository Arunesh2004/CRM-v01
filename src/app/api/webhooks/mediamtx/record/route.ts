import { withApiContext } from '@/lib/observability/context';
import { Logger } from '@/lib/logger/logger';
/**
 * MediaMTX Recording Webhook (Phase C13.2)
 *
 * Security model:
 * 1. Node identifies itself via X-Node-Key-Id header (webhook key ID registered in DB).
 * 2. Full payload is verified with HMAC-SHA256 using the node-specific secret.
 * 3. Timestamp (X-Timestamp) is validated against a 5-minute window.
 * 4. Nonce (X-Nonce) + nodeId are checked against IdempotencyKey for replay protection.
 * 5. The recordingNodeId is set to the AUTHENTICATED node — NOT from the payload body.
 *
 * The webhook does NOT:
 * - Access the filesystem (fs.stat, fs.readdir, etc.)
 * - Process or upload recordings
 * - Wait on long-running operations
 *
 * Canonical segmentId = SHA-256 of: `nodeId:opaquePath:filename:recordingEventTimestamp`
 * using the timestamp supplied by the MediaMTX producer in the payload.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import path from 'path';
import globalPrisma from '@db/utils/prisma';
import { parseOpaquePath } from '@/modules/cctv/opaque-path.helper';

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

const original_POST = async function (req: NextRequest) {
  try {
    // ── Step 1: Identify node ─────────────────────────────────────────────────
    const nodeKeyId = req.headers.get('x-node-key-id');
    const hmacSignature = req.headers.get('x-hmac-signature');
    const timestampHeader = req.headers.get('x-timestamp');
    const nonce = req.headers.get('x-nonce');

    if (!nodeKeyId || !hmacSignature || !timestampHeader || !nonce) {
      return NextResponse.json({ error: 'Missing required security headers' }, { status: 401 });
    }

    // ── Step 2: Validate timestamp ────────────────────────────────────────────
    const requestTimestampMs = parseInt(timestampHeader, 10);
    if (isNaN(requestTimestampMs) || Math.abs(Date.now() - requestTimestampMs) > TIMESTAMP_TOLERANCE_MS) {
      return NextResponse.json({ error: 'Request timestamp out of window' }, { status: 401 });
    }

    // ── Step 3: Look up node by webhookKeyId ─────────────────────────────────
    const node = await globalPrisma.cCTVNode.findUnique({
      where: { webhookKeyId: nodeKeyId },
    });
    if (!node) {
      return NextResponse.json({ error: 'Unknown node key' }, { status: 401 });
    }
    if (node.status === 'DECOMMISSIONED') {
      return NextResponse.json({ error: 'Node is decommissioned' }, { status: 403 });
    }

    // ── Step 4: Verify HMAC ───────────────────────────────────────────────────
    // The raw body is read once. The HMAC covers the full raw body + timestamp + nonce.
    const rawBody = await req.text();
    const secretEnvVar = node.webhookSecretRef; // e.g. "MEDIAMTX_NODE_A_SECRET"
    const secret = process.env[secretEnvVar];
    if (!secret) {
      Logger.error(`[MediaMTX Webhook] Missing env secret: ${secretEnvVar}`);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const expectedHmac = crypto
      .createHmac('sha256', secret)
      .update(`${timestampHeader}.${nonce}.${rawBody}`)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(hmacSignature, 'hex'), Buffer.from(expectedHmac, 'hex'))) {
      return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
    }

    // ── Step 5: Parse and validate payload ───────────────────────────────────
    let body: { path?: string; file?: string; recordingEventTimestamp?: number };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { path: opaquePath, file: localFilePath, recordingEventTimestamp } = body;
    if (!opaquePath || !localFilePath || !recordingEventTimestamp) {
      return NextResponse.json({ error: 'Missing required fields: path, file, recordingEventTimestamp' }, { status: 400 });
    }

    // Canonical path validation — must be relative (no traversal)
    const filename = path.basename(localFilePath);
    const normalizedLocal = path.normalize(localFilePath);
    if (normalizedLocal !== localFilePath || path.isAbsolute(filename) || filename.includes('..')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
    }

    // ── Step 6: Parse tenant from opaque path ────────────────────────────────
    const { tenantId } = parseOpaquePath(opaquePath);

    // ── Step 7: Deterministic, collision-resistant segmentId ─────────────────
    // Canonical fields: nodeId + opaquePath + filename + recordingEventTimestamp (ms from producer).
    // This is stable across retries: MediaMTX retries the same event with the same timestamp.
    const canonicalIdentity = `${node.id}:${opaquePath}:${filename}:${recordingEventTimestamp}`;
    const segmentId = crypto.createHash('sha256').update(canonicalIdentity).digest('hex');

    // ── Step 8: Idempotency guard (nonce + nodeId prevents replay) ────────────
    const idempotencyKeyStr = `mediamtx_${node.id}_${nonce}`;

    try {
      await globalPrisma.$transaction(async (tx) => {
        // 8.1 Replay protection via nonce (short TTL: 10 minutes)
        const existing = await tx.idempotencyKey.findUnique({
          where: { tenantId_key: { tenantId, key: idempotencyKeyStr } },
        });
        if (existing) {
          // Duplicate delivery — idempotent no-op
          return;
        }
        await tx.idempotencyKey.create({
          data: {
            tenantId,
            key: idempotencyKeyStr,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10-minute nonce TTL
          },
        });

        // 8.2 Upsert job — segmentId uniqueness ensures duplicate recordings are ignored
        await tx.recordingIngestionJob.upsert({
          where: { segmentId },
          create: {
            localFilePath,
            segmentId,
            recordingNodeId: node.id, // AUTHENTICATED node identity — not from payload
            status: 'PENDING',
          },
          update: {}, // Already exists — no-op
        });
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        // Concurrent unique violation — idempotent success
        return NextResponse.json({ success: true, message: 'Job already exists' });
      }
      throw e;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    Logger.error('[Recording Webhook Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiContext(original_POST);
