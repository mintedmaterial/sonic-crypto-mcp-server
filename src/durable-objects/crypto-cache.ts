// Durable Object for persistent crypto data caching

export class CryptoDataCache {
  private state: DurableObjectState;
  private cache: Map<string, any> = new Map();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async get(key: string): Promise<any> {
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (cached.expires > Date.now()) {
        return cached.data;
      }
      this.cache.delete(key);
    }

    const stored: any = await this.state.storage.get(key);
    if (stored && stored.expires > Date.now()) {
      this.cache.set(key, stored);
      return stored.data;
    }

    return null;
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const expires = Date.now() + (ttlSeconds * 1000);
    const cacheItem = { data: value, expires };

    this.cache.set(key, cacheItem);
    await this.state.storage.put(key, cacheItem);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    await this.state.storage.delete(key);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return new Response('Key required', { status: 400 });
    }

    if (request.method === 'GET') {
      const value = await this.get(key);
      return Response.json({ value });
    }

    if (request.method === 'POST') {
      const { value, ttl } = await request.json() as any;
      await this.set(key, value, ttl);
      return Response.json({ success: true });
    }

    if (request.method === 'DELETE') {
      await this.delete(key);
      return Response.json({ success: true });
    }

    return new Response('Method not allowed', { status: 405 });
  }
}
