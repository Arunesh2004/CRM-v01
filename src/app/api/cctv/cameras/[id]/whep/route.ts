import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ENV } from '@/lib/config/env';
import { Logger } from '@/lib/logger/logger';
import { deriveOpaquePath } from '@/modules/cctv/stream.service';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { withApiContext } from '@/lib/observability/context';

async function verifyTokenAndCamera(req: NextRequest, cameraId: string) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or malformed Authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    throw new Error('Empty token');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt
  let decoded: any;
  try {
    decoded = jwt.verify(token, ENV.cctvStreamJwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw new Error('Invalid or expired token');
  }

  if (decoded.cameraId !== cameraId || !decoded.tenantId || typeof decoded.streamVersion !== 'number') {
    throw new Error('Token camera mismatch or missing claims');
  }

  if (decoded.action !== 'read') {
    throw new Error('Invalid action');
  }

  // Server-side validation
  const camera = await executeAsSystem(SystemOperation.EXTERNAL_WEBHOOK_PROCESS, async (tx) => {
    return tx.camera.findUnique({ where: { id: decoded.cameraId } });
  });

  if (!camera || camera.tenantId !== decoded.tenantId || camera.deletedAt !== null) {
    throw new Error('Camera not found or tenant mismatch');
  }

  if (camera.streamVersion !== decoded.streamVersion) {
    throw new Error('Stale JWT streamVersion');
  }

  const expectedPath = deriveOpaquePath(camera.tenantId, camera.id, camera.streamVersion);
  if (decoded.path !== expectedPath) {
    throw new Error('Path mismatch');
  }

  return { token, expectedPath };
}

const original_POST = async function (req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { token, expectedPath } = await verifyTokenAndCamera(req, resolvedParams.id);
    
    // We only proxy WHEP requests. WHEP POST bodies are SDP.
    const bodyText = await req.text();
    
    // Internal server->MediaMTX request MUST append ?token= to satisfy MediaMTX webhook body.query contract.
    const mediamtxUrl = ENV.mediamtxApiUrl || 'http://localhost:8889';
    const internalUrl = `${mediamtxUrl}/${expectedPath}/whep?token=${token}`;
    
    const mediamtxRes = await fetch(internalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp'
      },
      body: bodyText
    });
    
    const resBody = await mediamtxRes.text();
    const headers = new Headers();
    headers.set('Content-Type', 'application/sdp');
    
    const location = mediamtxRes.headers.get('Location');
    if (location) {
      // Rewrite the location header to point back to our proxy
      const sessionId = location.split('/').pop();
      if (sessionId) {
         headers.set('Location', `/api/cctv/cameras/${resolvedParams.id}/whep?sessionId=${sessionId}`);
      }
    }
    
    return new NextResponse(resBody, {
      status: mediamtxRes.status,
      headers
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    Logger.warn(`[WHEP Proxy POST] Unauthorized: ${msg}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

const original_DELETE = async function (req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { token, expectedPath } = await verifyTokenAndCamera(req, resolvedParams.id);
    
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    if (!sessionId || !/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 });
    }
    
    const mediamtxUrl = ENV.mediamtxApiUrl || 'http://localhost:8889';
    const internalUrl = `${mediamtxUrl}/${expectedPath}/whep/session/${sessionId}?token=${token}`;
    
    const mediamtxRes = await fetch(internalUrl, {
      method: 'DELETE'
    });
    
    return new NextResponse(null, {
      status: mediamtxRes.status
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    Logger.warn(`[WHEP Proxy DELETE] Unauthorized: ${msg}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

const original_PATCH = async function (req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { token, expectedPath } = await verifyTokenAndCamera(req, resolvedParams.id);
    
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    if (!sessionId || !/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 });
    }
    
    const bodyText = await req.text();
    const mediamtxUrl = ENV.mediamtxApiUrl || 'http://localhost:8889';
    const internalUrl = `${mediamtxUrl}/${expectedPath}/whep/session/${sessionId}?token=${token}`;
    
    const mediamtxRes = await fetch(internalUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/trickle-ice-sdpfrag'
      },
      body: bodyText
    });
    
    return new NextResponse(null, {
      status: mediamtxRes.status
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    Logger.warn(`[WHEP Proxy PATCH] Unauthorized: ${msg}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export const POST = withApiContext(original_POST);
export const DELETE = withApiContext(original_DELETE);
export const PATCH = withApiContext(original_PATCH);

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'POST, DELETE, PATCH, OPTIONS'
    }
  });
}
