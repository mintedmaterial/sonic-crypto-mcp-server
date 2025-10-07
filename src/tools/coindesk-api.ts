// CoinDesk API interaction utilities

import { Env } from './types';

export async function fetchCoinDeskData(
  endpoint: string,
  params: Record<string, any>,
  env: Env
): Promise<any> {
  const url = new URL(`https://production.api.coindesk.com/v2${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      url.searchParams.append(key, value.join(','));
    } else if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${env.COINDESK_API_KEY}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`CoinDesk API error: ${response.status} - ${response.statusText}`);
  }

  return await response.json();
}

export async function getCachedData(
  key: string,
  env: Env,
  ttl: number = 60
): Promise<any | null> {
  const cached = await env.SONIC_CACHE.get(key, { type: 'json' });
  return cached;
}

export async function setCachedData(
  key: string,
  data: any,
  env: Env,
  ttl: number = 60
): Promise<void> {
  await env.SONIC_CACHE.put(key, JSON.stringify(data), {
    expirationTtl: ttl
  });
}
