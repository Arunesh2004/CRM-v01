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
 * Requires `REDIS_URL` in environment variables.
 * Ready for implementation in Phase 9 or when Redis is provisioned.
 */
export class RedisRateLimiter implements RateLimiter {
  async check(identifier: string, limit = 10, windowMs = 60000): Promise<boolean> {
    if (!process.env.REDIS_URL) {
      console.warn("Redis URL missing, falling back to permissive mode (ALLOW ALL).");
      return true;
    }
    // Implementation placeholder:
    // const redis = new Redis(process.env.REDIS_URL);
    // const current = await redis.incr(identifier);
    // if (current === 1) await redis.pexpire(identifier, windowMs);
    // return current <= limit;
    return true;
  }
}

// Factory export for easy usage in server actions
export const rateLimiter = process.env.NODE_ENV === 'production' && process.env.REDIS_URL
  ? new RedisRateLimiter()
  : new MemoryRateLimiter();
