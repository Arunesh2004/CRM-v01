import Redis from 'ioredis';
import { Logger } from '../logger/logger';

// Singleton instance to prevent creating multiple connections in serverless/dev
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL is not defined in the environment. Distributed rate-limiting and concurrency will fail.');
    }

    // Lazy connect is crucial for Next.js to not crash build processes
    // and correctly handle serverless function lifecycles
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        // Reconnect after
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    redisClient.on('error', (err) => {
      // Don't crash the process on transient errors, just log
      Logger.error('Redis client error in AI module', err, { category: 'network' });
    });

    redisClient.on('connect', () => {
      Logger.info('Redis client connected for AI module', { category: 'network' });
    });
  }

  return redisClient;
}
