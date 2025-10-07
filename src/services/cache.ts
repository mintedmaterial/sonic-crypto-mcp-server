// Cache service for KV and Durable Object operations

import { Env } from '../config/env';

export class CacheService {
  constructor(private env: Env) {}

  /**
   * Get data from KV cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const cached = await this.env.SONIC_CACHE.get(key, { type: 'json' });
      return cached as T | null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in KV cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      await this.env.SONIC_CACHE.put(key, JSON.stringify(value), {
        expirationTtl: ttlSeconds,
      });
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.env.SONIC_CACHE.delete(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Get data from Durable Object cache (more persistent)
   */
  async getDurableCache(key: string): Promise<any | null> {
    try {
      const id = this.env.CRYPTO_CACHE.idFromName('global');
      const stub = this.env.CRYPTO_CACHE.get(id);
      const response = await stub.fetch(`http://internal/cache?key=${encodeURIComponent(key)}`);
      const data = await response.json() as any;
      return data.value || null;
    } catch (error) {
      console.error(`Durable cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in Durable Object cache
   */
  async setDurableCache(key: string, value: any, ttl: number = 300): Promise<void> {
    try {
      const id = this.env.CRYPTO_CACHE.idFromName('global');
      const stub = this.env.CRYPTO_CACHE.get(id);
      await stub.fetch(`http://internal/cache?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        body: JSON.stringify({ value, ttl }),
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error(`Durable cache set error for key ${key}:`, error);
    }
  }

  /**
   * Generate cache key for price data
   */
  getPriceKey(market: string, instruments: string[]): string {
    return `price:${market}:${instruments.sort().join(',')}`;
  }

  /**
   * Generate cache key for sentiment data
   */
  getSentimentKey(instruments: string[], timeframe: string): string {
    return `sentiment:${instruments.sort().join(',')}:${timeframe}`;
  }

  /**
   * Generate cache key for historical data
   */
  getHistoricalKey(market: string, instrument: string, type: 'daily' | 'hourly' | 'minutes'): string {
    return `historical:${type}:${market}:${instrument}`;
  }
}
