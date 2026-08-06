import { Logger } from '../logger/logger';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export interface RedisClientLike {
  multi(): any;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
}

export class DistributedRateLimiter {
  constructor(private redis: RedisClientLike) {}

  /**
   * Generates a Redis key safely namespaced to prevent tenant bleed.
   */
  private generateKey(tenantId: string, resource: string, action: string, ip?: string): string {
    const scope = ip ? `ip:${ip}` : `tenant:${tenantId}`;
    return `ratelimit:${scope}:${resource}:${action}`;
  }

  async checkLimit(tenantId: string, resource: string, action: string, limit: number, windowSeconds: number, ip?: string): Promise<RateLimitResult> {
    const key = this.generateKey(tenantId, resource, action, ip);
    
    try {
      // Simulate distributed atomic INCR + EXPIRE
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.expire(key, windowSeconds);
      }

      const allowed = current <= limit;
      const remaining = Math.max(0, limit - current);
      
      if (!allowed) {
        Logger.warn(`Rate limit exceeded for ${key}`, { tenantId, resource, action, ip, correlationId: `rl_${Date.now()}` });
      }

      return { allowed, remaining };
    } catch (err: any) {
      Logger.error('Distributed rate limiter failed, falling back to permissive', err, { category: 'network' });
      // Fail open to avoid dropping traffic if Redis is down, but log the failure
      return { allowed: true, remaining: 1 };
    }
  }
}
