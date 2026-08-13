export interface RateLimiter {
  /**
   * Checks if the given identifier has exceeded the rate limit.
   * @param identifier - Usually an IP address, tenant ID, or user ID.
   * @returns true if allowed, false if rate limited.
   */
  check(identifier: string, limit?: number, windowMs?: number): Promise<boolean>;
}

/**
 * DEVELOPMENT ONLY: In-memory rate limiter.
 * This does NOT scale horizontally across multiple Node.js instances (e.g. Vercel edges)
 * and state is lost on process restart.
 */
export class MemoryRateLimiter implements RateLimiter {
  private hits: Map<string, { count: number; expiresAt: number }> = new Map();

  async check(identifier: string, limit = 10, windowMs = 60000): Promise<boolean> {
    const now = Date.now();
    const record = this.hits.get(identifier);

    if (!record || record.expiresAt < now) {
      this.hits.set(identifier, { count: 1, expiresAt: now + windowMs });
      return true;
    }

    if (record.count >= limit) {
      return false; // Rate limited
    }

    record.count += 1;
    this.hits.set(identifier, record);
    return true;
  }
}

/**
 * PRODUCTION ABSTRACTION: Redis Rate Limiter.
 * Uses Lua script to atomically increment and expire.
 */
export class RedisRateLimiter implements RateLimiter {
  async check(identifier: string, limit = 10, windowMs = 60000): Promise<boolean> {
    if (!process.env.REDIS_URL) {
      console.warn("Redis URL missing, falling back to permissive mode (ALLOW ALL).");
      return true;
    }
    
    try {
      // Inline import to avoid circular dependencies or early init issues
      const { getRedisClient } = require('../redis/redis.client');
      const redis = getRedisClient();
      
      const luaScript = `
        local current = redis.call("INCR", KEYS[1])
        if tonumber(current) == 1 then
            redis.call("PEXPIRE", KEYS[1], ARGV[1])
        end
        return current
      `;
      
      const currentRaw = await redis.eval(luaScript, 1, \`ratelimit:v2:\${identifier}\`, windowMs);
      return Number(currentRaw) <= limit;
    } catch (e) {
      console.error("Redis Rate Limiter Error:", e);
      // Fail open if Redis is down, or implement memory fallback here
      return true;
    }
  }
}

// Factory export for easy usage in server actions
export const rateLimiter = process.env.NODE_ENV === 'production' && process.env.REDIS_URL
  ? new RedisRateLimiter()
  : new MemoryRateLimiter();
