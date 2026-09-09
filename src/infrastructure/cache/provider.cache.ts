export interface IProviderCache {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  get(key: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  set(key: string, value: any, ttlSeconds?: number): void;
  invalidate(key: string): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
// In-memory implementation that survives Next.js dev server reloads
class MemoryCache implements IProviderCache {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  private cache: Map<string, { value: any; expiresAt: number }>;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    this.cache = new Map();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    
    return item.value;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
