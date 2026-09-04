import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Redis only if the URL is provided. 
// This ensures safe failure behavior in local environments without Redis.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = redisUrl && redisToken && redisUrl.startsWith('http')
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

// Helper to create rate limiters safely
export function createRateLimiter(options: { tokens: number, window: string }) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(options.tokens, options.window as any),
    analytics: true,
  });
}

// Pre-configured rate limiters
export const rateLimiters = {
  auth: createRateLimiter({ tokens: 10, window: '1 m' }), // 10 requests per minute
  ai: createRateLimiter({ tokens: 50, window: '1 h' }),   // 50 requests per hour
  webhook: createRateLimiter({ tokens: 100, window: '1 m' }), // 100 requests per minute
  api: createRateLimiter({ tokens: 60, window: '1 m' }),  // 60 requests per minute
};
