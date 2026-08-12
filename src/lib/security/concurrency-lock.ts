import { getRedisClient } from '../redis/redis.client';
import { Logger } from '../logger/logger';
import { AIConfig } from '../config/ai.config';

export interface ConcurrencyLockResult {
  acquired: boolean;
  lockKey?: string;
}

export class DistributedConcurrencyLock {
  /**
   * Attempts to acquire a distributed lock for concurrency protection.
   * Uses Redis SET NX PX to safely acquire the lock atomically.
   */
  static async acquire(tenantId: string, userId: string, requestId: string): Promise<ConcurrencyLockResult> {
    try {
      const redis = getRedisClient();
      
      // Calculate absolute TTL (Execution max + buffer)
      const ttlMs = AIConfig.MAX_EXECUTION_MS + AIConfig.LOCK_TTL_BUFFER_MS;

      // 1. Check Tenant Concurrency
      const tenantKey = `concurrent:tenant:${tenantId}`;
      const tenantActive = await redis.scard(tenantKey);
      if (tenantActive >= AIConfig.MAX_CONCURRENT_PER_TENANT) {
        return { acquired: false };
      }

      // 2. Check User Concurrency
      const userKey = `concurrent:user:${userId}`;
      const userActive = await redis.scard(userKey);
      if (userActive >= AIConfig.MAX_CONCURRENT_PER_USER) {
        return { acquired: false };
      }

      // 3. Acquire individual lock for this specific request
      // We use a specific request key, and also add it to sets.
      // However, managing sets atomically with TTL is tricky in pure redis without lua.
      // Let's use a simpler approach: unique keys for each active slot.
      
      // We will loop from 0 to MAX_CONCURRENT_PER_USER - 1 and try to acquire a slot.
      // E.g. concurrent:user:123:slot:0, concurrent:user:123:slot:1
      let acquiredUserSlot: string | null = null;
      for (let i = 0; i < AIConfig.MAX_CONCURRENT_PER_USER; i++) {
        const slotKey = `concurrent:user:${userId}:slot:${i}`;
        const ok = await redis.set(slotKey, requestId, 'PX', ttlMs, 'NX');
        if (ok === 'OK') {
          acquiredUserSlot = slotKey;
          break;
        }
      }

      if (!acquiredUserSlot) {
        // No user slots available
        return { acquired: false };
      }

      // Try to acquire tenant slot
      let acquiredTenantSlot: string | null = null;
      for (let i = 0; i < AIConfig.MAX_CONCURRENT_PER_TENANT; i++) {
        const slotKey = `concurrent:tenant:${tenantId}:slot:${i}`;
        const ok = await redis.set(slotKey, requestId, 'PX', ttlMs, 'NX');
        if (ok === 'OK') {
          acquiredTenantSlot = slotKey;
          break;
        }
      }

      if (!acquiredTenantSlot) {
        // Failed to acquire tenant slot, must release user slot
        await redis.del(acquiredUserSlot);
        return { acquired: false };
      }

      // Both acquired successfully
      return { acquired: true, lockKey: requestId };
    } catch (err) {
      Logger.error('Redis Concurrency Lock Failed', err as Error, { event: 'REDIS_FAILURE', fallback: true });
      
      // BOUNDED IN-MEMORY FALLBACK
      return MemoryConcurrencyFallback.acquire(tenantId, userId, requestId);
    }
  }

  /**
   * Safely releases a previously acquired lock, ONLY if the requestId matches.
   * Uses a Lua script to ensure atomic check-and-delete.
   */
  static async release(tenantId: string, userId: string, requestId: string): Promise<void> {
    try {
      const redis = getRedisClient();

      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
      `;

      // Release user slots
      for (let i = 0; i < AIConfig.MAX_CONCURRENT_PER_USER; i++) {
        await redis.eval(luaScript, 1, `concurrent:user:${userId}:slot:${i}`, requestId);
      }

      // Release tenant slots
      for (let i = 0; i < AIConfig.MAX_CONCURRENT_PER_TENANT; i++) {
        await redis.eval(luaScript, 1, `concurrent:tenant:${tenantId}:slot:${i}`, requestId);
      }
    } catch (err) {
      Logger.error('Redis Concurrency Release Failed', err as Error, { event: 'REDIS_FAILURE', fallback: true });
      
      // Attempt fallback release
      MemoryConcurrencyFallback.release(tenantId, userId, requestId);
    }
  }
}

// ----------------------------------------------------------------------------
// EMERGENCY FALLBACK (Instance-Local ONLY)
// Active when Redis is completely down to preserve minimal availability.
// ----------------------------------------------------------------------------

class MemoryConcurrencyFallback {
  private static userActive = new Map<string, Set<string>>();
  private static tenantActive = new Map<string, Set<string>>();

  static acquire(tenantId: string, userId: string, requestId: string): ConcurrencyLockResult {
    let uSet = this.userActive.get(userId);
    if (!uSet) { uSet = new Set(); this.userActive.set(userId, uSet); }
    
    let tSet = this.tenantActive.get(tenantId);
    if (!tSet) { tSet = new Set(); this.tenantActive.set(tenantId, tSet); }

    // Use strictly bounded fallback limits
    if (uSet.size >= AIConfig.FALLBACK_MAX_CONCURRENT) return { acquired: false };
    if (tSet.size >= AIConfig.FALLBACK_MAX_CONCURRENT * 2) return { acquired: false };

    uSet.add(requestId);
    tSet.add(requestId);

    return { acquired: true, lockKey: requestId };
  }

  static release(tenantId: string, userId: string, requestId: string) {
    const uSet = this.userActive.get(userId);
    if (uSet) uSet.delete(requestId);

    const tSet = this.tenantActive.get(tenantId);
    if (tSet) tSet.delete(requestId);
  }
}
