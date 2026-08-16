import { Logger } from '../logger/logger';
import { getRedisClient } from '../redis/redis.client';
import { AIConfig } from '../config/ai.config';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export class DistributedRateLimiter {
  /**
   * Generates a Redis key safely namespaced to prevent tenant bleed.
   */
  private static generateKey(tenantId: string, resource: string, action: string, ip?: string, userId?: string): string {
    const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
    const scope = ip ? `ip:${ip}` : (userId ? `user:${userId}` : `tenant:${tenantId}`);
    return `ratelimit:${env}:${scope}:${resource}:${action}`;
  }

  static async checkLimit(tenantId: string, resource: string, action: string, limit: number, windowSeconds: number, ip?: string, userId?: string): Promise<RateLimitResult> {
    const key = this.generateKey(tenantId, resource, action, ip, userId);
    
    try {
      const redis = getRedisClient();

      // Atomic INCR + EXPIRE via Lua
      // If it's the first hit (count == 1), set expiration
      const luaScript = `
        local current = redis.call("INCR", KEYS[1])
        if tonumber(current) == 1 then
            redis.call("EXPIRE", KEYS[1], ARGV[1])
        end
        return current
      `;

      const currentRaw = await redis.eval(luaScript, 1, key, windowSeconds);
      const current = Number(currentRaw);

      const allowed = current <= limit;
      const remaining = Math.max(0, limit - current);
      
      if (!allowed) {
        Logger.warn(`Rate limit exceeded for ${key}`, { tenantId, resource, action, ip, userId, correlationId: `rl_${Date.now()}` });
      }

      return { allowed, remaining };
    } catch (err: any) {
      Logger.error('Redis Rate Limiter Failed', err instanceof Error ? err : new Error(String(err?.message ?? 'unknown')), { event: 'REDIS_FAILURE', fallback: true });
      return MemoryRateLimitFallback.checkLimit(key, AIConfig.FALLBACK_REQUESTS_PER_MINUTE, windowSeconds);
    }
  }
}

// ----------------------------------------------------------------------------
// EMERGENCY FALLBACK (Instance-Local ONLY)
// Active when Redis is completely down to preserve minimal availability.
// ----------------------------------------------------------------------------
class MemoryRateLimitFallback {
  private static hits = new Map<string, { count: number; expiresAt: number }>();

  static checkLimit(key: string, fallbackLimit: number, windowSeconds: number): RateLimitResult {
    const now = Date.now();
    const record = this.hits.get(key);

    if (!record || record.expiresAt < now) {
      this.hits.set(key, { count: 1, expiresAt: now + (windowSeconds * 1000) });
      return { allowed: true, remaining: fallbackLimit - 1 };
    }

    if (record.count >= fallbackLimit) {
      return { allowed: false, remaining: 0 };
    }

    record.count += 1;
    this.hits.set(key, record);
    return { allowed: true, remaining: fallbackLimit - record.count };
  }
}
