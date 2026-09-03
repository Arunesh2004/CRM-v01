import crypto from 'crypto';
import { ENV } from '@/lib/config/env';

/**
 * Derives the canonical opaque path for a given camera stream generation.
 * This is the sole source of truth for path identity generation.
 * 
 * Format: c_{tenantId}_{cameraId}_v{streamVersion}_{mac}
 */
export function deriveOpaquePath(tenantId: string, cameraId: string, streamVersion: number): string {
  const hmac = crypto.createHmac('sha256', ENV.cctvOpaquePathSecret);
  hmac.update(`${tenantId}:${cameraId}:${streamVersion}`);
  const hash = hmac.digest('base64url').substring(0, 32);
  return `c_${tenantId}_${cameraId}_v${streamVersion}_${hash}`;
}

/**
 * Validates and extracts identifiers from an opaque path.
 * Supports fallback to previous rotation secrets and legacy C10.5 JWT secret.
 */
export function parseOpaquePath(opaquePath: string): { tenantId: string; cameraId: string; streamVersion: number } {
  // Regex validation: c_{tenantId}_{cameraId}_v{streamVersion}_{mac}
  const match = opaquePath.match(/^c_([a-zA-Z0-9\-]+)_([a-zA-Z0-9\-]+)_v(\d+)_([a-zA-Z0-9\-_]{32})$/);
  
  if (!match) {
    throw new Error('Invalid opaque path format');
  }

  const [, tenantId, cameraId, streamVersionStr, providedMac] = match;
  const streamVersion = parseInt(streamVersionStr, 10);

  const payload = `${tenantId}:${cameraId}:${streamVersion}`;
  
  // Use Buffer.alloc(32) to ensure it's exactly 32 bytes for timingSafeEqual, avoiding length mismatch errors
  // Actually, providedMac is base64url encoded. Let's decode it, or just pad it/enforce 32 chars length which we do with the regex.
  // Wait, crypto.timingSafeEqual requires buffers of the EXACT SAME LENGTH.
  const providedMacBuffer = Buffer.from(providedMac, 'utf-8');

  // Attempt current secret
  const currentMac = crypto.createHmac('sha256', ENV.cctvOpaquePathSecret).update(payload).digest('base64url').substring(0, 32);
  const currentMacBuffer = Buffer.from(currentMac, 'utf-8');
  if (crypto.timingSafeEqual(providedMacBuffer, currentMacBuffer)) {
    return { tenantId, cameraId, streamVersion };
  }

  // Attempt previous secret if configured and valid
  if (ENV.cctvOpaquePathSecretPrevious) {
    const validUntil = ENV.cctvOpaquePathSecretPreviousValidUntil;
    if (!validUntil || new Date() <= validUntil) {
      const prevMac = crypto.createHmac('sha256', ENV.cctvOpaquePathSecretPrevious).update(payload).digest('base64url').substring(0, 32);
      if (crypto.timingSafeEqual(providedMacBuffer, Buffer.from(prevMac, 'utf-8'))) {
        return { tenantId, cameraId, streamVersion };
      }
    }
  }

  // Attempt legacy C10.5 backward compatibility (using JWT secret)
  const legacyMac = crypto.createHmac('sha256', ENV.cctvStreamJwtSecret).update(payload).digest('base64url').substring(0, 32);
  if (crypto.timingSafeEqual(providedMacBuffer, Buffer.from(legacyMac, 'utf-8'))) {
    return { tenantId, cameraId, streamVersion };
  }

  throw new Error('Opaque path HMAC validation failed (tamper or rotation error)');
}
