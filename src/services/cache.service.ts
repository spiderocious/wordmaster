import NodeCache from 'node-cache';
import { cacheConfig } from '@configs';

export type CacheFetchFunction<T> = () => Promise<T>;

export class CacheService {
  private static instance: CacheService;
  private cache: NodeCache;

  private constructor() {
    this.cache = new NodeCache(cacheConfig);
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get a value from cache
   */
  public get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  /**
   * Set a value in cache
   */
  public set<T>(key: string, value: T, ttl?: number): boolean {
    return this.cache.set(key, value, ttl || cacheConfig.stdTTL);
  }

  /**
   * Delete a value from cache
   */
  public delete(key: string): number {
    return this.cache.del(key);
  }

  /**
   * Delete multiple keys from cache
   */
  public deleteMultiple(keys: string[]): number {
    return this.cache.del(keys);
  }

  /**
   * Flush all cache
   */
  public flush(): void {
    this.cache.flushAll();
  }

  /**
   * Check if key exists in cache
   */
  public has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get all keys in cache
   */
  public keys(): string[] {
    return this.cache.keys();
  }

  /**
   * Read-Through Cache Pattern
   * Tries to get from cache first, if not found, fetches from source and caches it
   */
  public async readThrough<T>(
    key: string,
    fetchFunction: CacheFetchFunction<T>,
    ttl?: number
  ): Promise<T> {
    const cachedValue = this.get<T>(key);

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const freshValue = await fetchFunction();
    this.set(key, freshValue, ttl);
    return freshValue;
  }

  /**
   * Write-Through Cache Pattern
   * Writes to cache and returns the value (caller should also write to database)
   */
  public writeThrough<T>(key: string, value: T, ttl?: number): T {
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Write-Behind (Write-Back) Cache Pattern
   * Writes to cache immediately and schedules async write to database
   */
  public async writeBehind<T>(
    key: string,
    value: T,
    persistFunction: (value: T) => Promise<void>,
    ttl?: number
  ): Promise<T> {
    this.set(key, value, ttl);

    // Persist to database asynchronously without blocking
    setImmediate(async () => {
      try {
        await persistFunction(value);
      } catch (error) {
        console.error(`Write-behind failed for key ${key}:`, error);
        // Optionally: Remove from cache if persistence fails
        // this.delete(key);
      }
    });

    return value;
  }

  /**
   * Cache-Aside Pattern (Lazy Loading)
   * Application code is responsible for loading data into cache
   */
  public cacheAside<T>(key: string, value: T, ttl?: number): boolean {
    return this.set(key, value, ttl);
  }

  /**
   * Refresh-Ahead Cache Pattern
   * Proactively refresh cache before expiration
   */
  public async refreshAhead<T>(
    key: string,
    fetchFunction: CacheFetchFunction<T>,
    ttl?: number,
    refreshBeforeExpiry: number = 60 // seconds before expiry to refresh
  ): Promise<T> {
    const cachedValue = this.get<T>(key);

    if (cachedValue !== undefined) {
      const ttlRemaining = this.cache.getTtl(key);
      const now = Date.now();

      // If TTL is close to expiring, refresh in background
      if (ttlRemaining && (ttlRemaining - now) < refreshBeforeExpiry * 1000) {
        setImmediate(async () => {
          try {
            const freshValue = await fetchFunction();
            this.set(key, freshValue, ttl);
          } catch (error) {
            console.error(`Refresh-ahead failed for key ${key}:`, error);
          }
        });
      }

      return cachedValue;
    }

    const freshValue = await fetchFunction();
    this.set(key, freshValue, ttl);
    return freshValue;
  }

  /**
   * Get cache statistics
   */
  public getStats() {
    return this.cache.getStats();
  }

  /**
   * Get TTL for a key
   */
  public getTtl(key: string): number | undefined {
    return this.cache.getTtl(key);
  }
}

export const cacheService = CacheService.getInstance();
