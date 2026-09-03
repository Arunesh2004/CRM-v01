import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import globalPrisma from '@db/utils/prisma';
import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ENV } from '@/lib/config/env';
import { decrypt } from '@/lib/encryption';
import { validateAndResolveHostname } from '@/lib/security/ssrf';
import { Logger } from '@/lib/logger/logger';

import { deriveOpaquePath } from './opaque-path.helper';
export { deriveOpaquePath };

async function cleanupStalePaths(tenantId: string, cameraId: string, currentPath: string) {
  const prefix = `c_${tenantId}_${cameraId}_`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);
  
  try {
    const configRes = await fetch(`${ENV.mediamtxApiUrl}/v3/config/paths/list?search=${prefix}`, { signal: controller.signal });
    if (!configRes.ok) return;
    const configData = await configRes.json();
    
    if (!configData.items || configData.items.length === 0) return;
    
    const runtimeRes = await fetch(`${ENV.mediamtxApiUrl}/v3/paths/list?search=${prefix}`, { signal: controller.signal });
    if (!runtimeRes.ok) return;
    const runtimeData = await runtimeRes.json();
    
    const runtimeMap = new Map();
    if (runtimeData.items) {
      for (const item of runtimeData.items) {
        runtimeMap.set(item.name, item);
      }
    }
    
    for (const item of configData.items) {
      if (!item.name || !item.name.startsWith(prefix)) continue;
      if (item.name === currentPath) continue;
      
      const runtimeItem = runtimeMap.get(item.name);
      const activeReaders = runtimeItem?.readers?.length || 0;
      const isReady = runtimeItem?.ready === true;
      
      if (activeReaders === 0 && !isReady) {
        await fetch(`${ENV.mediamtxApiUrl}/v3/config/paths/delete/${item.name}`, { 
          method: 'DELETE',
          signal: controller.signal
        }).catch(() => {});
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function invalidateStreamAccess(tenantId: string, camera: any, credential?: any) {
  // Legacy invalidateStreamAccess logic - this should not be called directly.
  // Kept temporarily for backwards compatibility in other modules if any.
}

export async function generateStreamToken(cameraId: string) {
  const user = await requireAuth();
  const tenantId = await requireTenant();
  
  await requirePermission('CUSTOMER', 'READ');

  return await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    
    // Include credential in the query securely
    const camera = await tx.camera.findFirst({
      where: { id: cameraId, tenantId, deletedAt: null },
      include: { credential: true, location: true }
    });

    if (!camera) throw new Error('Camera not found');
    if (camera.authMode === 'PASSWORD' && !camera.credential) {
      throw new Error('Camera credentials not configured');
    }

    // Audit log before anything else (exclude credentials)
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'CAMERA_STREAM_ACCESSED',
        resource: 'CAMERA',
        resourceId: camera.id,
        metadata: { ipAddress: camera.ipAddress }
      }
    });

    const rawIpAddress = camera.ipAddress;
    
    // Fallback simple parsing for RTSP IP
    let hostname = rawIpAddress;
    let port = '554';
    let path = '/stream';
    if (rawIpAddress.includes('rtsp://')) {
       // if user passed a full URL, attempt to parse
       try {
         const parsed = new URL(rawIpAddress);
         hostname = parsed.hostname;
         port = parsed.port || '554';
         path = parsed.pathname + parsed.search;
       } catch {
         // ignore
       }
    } else if (rawIpAddress.includes(':')) {
       const parts = rawIpAddress.split(':');
       hostname = parts[0];
       port = parts[1].split('/')[0];
       path = '/' + (parts[1].split('/').slice(1).join('/') || 'stream');
    }

    // SSRF DNS Validation & Rebinding Protection
    const validatedIp = await validateAndResolveHostname(hostname);

    let rtspSource = '';
    if (camera.authMode === 'PASSWORD') {
      const username = decrypt(camera.credential!.encryptedUsername);
      const password = decrypt(camera.credential!.encryptedPassword);

      const encUser = encodeURIComponent(username);
      const encPass = encodeURIComponent(password);

      // Construct final safe RTSP URL using validated IP
      rtspSource = `rtsp://${encUser}:${encPass}@${validatedIp}:${port}${path.startsWith('/') ? path : '/' + path}`;
    } else {
      rtspSource = `rtsp://${validatedIp}:${port}${path.startsWith('/') ? path : '/' + path}`;
    }

    // Derive Opaque Path based on current streamVersion
    const initialStreamVersion = camera.streamVersion;
    const opaquePath = deriveOpaquePath(tenantId, camera.id, initialStreamVersion);

    // Provision MediaMTX Path
    try {
      const response = await fetch(`${ENV.mediamtxApiUrl}/v3/config/paths/add/${opaquePath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: rtspSource,
          sourceOnDemand: true,
          sourceOnDemandCloseAfter: '60s',
          record: true,
          recordPath: '/var/lib/mediamtx/recordings/%path/%Y-%m-%d_%H-%M-%S.mp4',
          recordFormat: 'fmp4',
          recordPartDuration: '15m',
          runOnRecordSegmentComplete: `curl -X POST http://app:3000/api/webhooks/mediamtx/record -H "Content-Type: application/json" -H "Authorization: Bearer ${ENV.mediamtxWebhookSecret}" -d "{\\"path\\":\\"$MTX_PATH\\",\\"file\\":\\"$MTX_SEGMENT_PATH\\"}"`
        }),
      });

      if (!response.ok) {
        if (response.status === 400) {
          let body;
          try {
            body = await response.json();
          } catch {
            throw new Error('MediaMTX API Error: HTTP 400 with non-JSON response');
          }
          
          if (!body || typeof body !== 'object' || !body.error) {
            throw new Error('MediaMTX API Error: HTTP 400 with missing error field');
          }
          
          if (body.error === 'path already exists') {
            // Intentional TOCTOU mitigation: Path already exists, safe to continue
          } else {
            Logger.error(`MediaMTX 400 error during path provisioning for camera`, new Error(String(body.error)), { cameraId: camera.id });
            throw new Error(`MediaMTX Config Error: ${body.error}`);
          }
        } else {
          throw new Error(`MediaMTX provisioning failed with status: ${response.status}`);
        }
      }
    } catch (err: any) {
      if (err.message && (err.message.startsWith('MediaMTX Config Error') || err.message.startsWith('MediaMTX API Error') || err.message.startsWith('MediaMTX provisioning failed'))) {
        throw err;
      }
      throw new Error('Internal stream provisioning error');
    }

    // Post-Provisioning Version Revalidation
    const currentCameraState = await tx.camera.findFirst({
      where: { id: camera.id, deletedAt: null },
      select: { streamVersion: true }
    });

    if (currentCameraState?.streamVersion !== initialStreamVersion) {
      // Race B mitigation: The streamVersion changed during MediaMTX provisioning.
      // 1. We must delete the newly provisioned stale path.
      await fetch(`${ENV.mediamtxApiUrl}/v3/config/paths/delete/${opaquePath}`, {
        method: 'DELETE'
      }).catch(() => {});
      // 2. We fail the request to prevent issuing a stale JWT.
      throw new Error('Camera configuration changed during stream provisioning. Please try again.');
    }

    // Lazy async cleanup (fail-soft)
    cleanupStalePaths(tenantId, camera.id, opaquePath).catch(err => {
      Logger.warn(`MediaMTX cleanup failed for camera`, { cameraId: camera.id, error: String(err?.message) });
    });

    // Generate JWT
    const jti = crypto.randomUUID();
    const payload = {
      sub: user.id,
      tenantId,
      cameraId: camera.id,
      streamVersion: initialStreamVersion,
      path: opaquePath,
      action: 'read'
    };

    const token = jwt.sign(payload, ENV.cctvStreamJwtSecret, {
      algorithm: 'HS256',
      expiresIn: '60s',
      jwtid: jti
    });

    // Public URL defaults to relative if empty. Returns explicitly defined WHEP endpoint.
    const baseUrl = ENV.publicAppUrl;

    return {
      streamUrl: `${baseUrl}/${opaquePath}/whep?token=${token}`
    };
  });
}
