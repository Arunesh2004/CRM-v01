import { withApiContext } from '@/lib/observability/context';
import { Logger } from '@/lib/logger/logger';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { ENV } from '@/lib/config/env';
import globalPrisma from '@db/utils/prisma';
import { deriveOpaquePath } from '@/modules/cctv/stream.service';

const original_POST = async function (req: NextRequest) {
  try {
    // 1. Read the internal secret configured in the environment
    const internalSecret = ENV.mediamtxWebhookSecret;
    if (!internalSecret) {
      Logger.error('[MediaMTX Webhook] Missing MEDIAMTX_WEBHOOK_SECRET environment variable.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 2. Extract the secret sent by MediaMTX in the query parameters
    const url = new URL(req.url);
    const providedSecret = url.searchParams.get('secret');

    // 3. Compare it safely
    if (!providedSecret) {
      Logger.warn('[MediaMTX Webhook] Unauthorized request. Invalid or missing secret.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const providedBuffer = Buffer.from(providedSecret);
    const expectedBuffer = Buffer.from(internalSecret);

    if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
      Logger.warn('[MediaMTX Webhook] Unauthorized request. Invalid or missing secret.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 4. Parse the JSON payload sent by MediaMTX
    const body = await req.json().catch(() => ({}));
    const { action, protocol, path, ip, query } = body;

    // 5. Extract JWT from query string passed by MediaMTX payload
    // The query looks like: "token=eyJ..."
    const parsedQuery = new URLSearchParams(query || '');
    const token = parsedQuery.get('token');

    if (!token) {
      Logger.warn('[MediaMTX Webhook] Missing JWT token in request.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 6. Strict JWT Verification
    let decoded: any;
    try {
      decoded = jwt.verify(token, ENV.cctvStreamJwtSecret, {
        algorithms: ['HS256']
      });
    } catch (err: any) {
      Logger.warn('[MediaMTX Webhook] JWT verification failed:', err.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 7. Independent Database Verification (Layer 1 Security)
    if (!decoded.cameraId || !decoded.tenantId || typeof decoded.streamVersion !== 'number') {
      Logger.warn('[MediaMTX Webhook] Missing required claims in JWT.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let camera;
    try {
      camera = await globalPrisma.camera.findUnique({ where: { id: decoded.cameraId } });
    } catch (err) {
      Logger.error('[MediaMTX Webhook] Database query failed. Failing closed.', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); // Fail closed
    }

    if (!camera || camera.tenantId !== decoded.tenantId || camera.deletedAt !== null) {
      Logger.warn('[MediaMTX Webhook] Camera not found, soft-deleted, or tenant mismatch.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (camera.streamVersion !== decoded.streamVersion) {
      Logger.warn(`[MediaMTX Webhook] Stale JWT streamVersion. Expected ${camera.streamVersion}, got ${decoded.streamVersion}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 8. Independently derive the expected opaque path
    const expectedPath = deriveOpaquePath(camera.tenantId, camera.id, camera.streamVersion);

    if (path !== expectedPath) {
      Logger.warn(`[MediaMTX Webhook] Path mismatch. Requested: ${path}, Expected: ${expectedPath}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Explicitly disallow publish access via these JWTs
    if (action !== 'read') {
      Logger.warn(`[MediaMTX Webhook] Attempted forbidden action: ${action}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    Logger.info(`[MediaMTX Webhook] Authorized stream access for path: ${path}`);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    Logger.error('[MediaMTX Webhook] Unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiContext(original_POST);
