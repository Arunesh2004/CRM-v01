export interface IProviderCache {
  get(key: string): any;
  set(key: string, value: any, ttlSeconds?: number): void;
  invalidate(key: string): void;
}

// In-memory implementation that survives Next.js dev server reloads
class MemoryCache implements IProviderCache {
  private cache: Map<string, { value: any; expiresAt: number }>;

  constructor() {
    this.cache = new Map();
  }

  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  set(key: string, value: any, ttlSeconds: number = 3600): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }
}

// Ensure singleton instance
const globalForCache = globalThis as unknown as { providerCache: IProviderCache };

export const ProviderConfigCache = globalForCache.providerCache || new MemoryCache();

if (process.env.NODE_ENV !== 'production') {
  globalForCache.providerCache = ProviderConfigCache;
}
