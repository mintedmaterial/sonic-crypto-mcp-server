// CoinMarketCap API Integration Service - FREE PLAN OPTIMIZED
// Uses only free tier endpoints strategically:
// 
// FREE PLAN ENDPOINTS (333 credits/day):
// - /v1/cryptocurrency/listings/latest - Top 200 cryptos (1 credit per 200 results)
// - /v1/global-metrics/quotes/latest - Global market data (1 credit)
// - /v1/cryptocurrency/quotes/latest - Price quotes (1 credit per 100 symbols)
//
// STRATEGY:
// - Derive trending from listings/latest sorted by % change (1 credit every 15 min = 96/day)
// - Global metrics cached aggressively (1 credit every 30 min = 48/day)
// - Quotes batched up to 100 symbols (1 credit per batch, 5 min cache)
// - Total daily budget: ~150-200 credits with caching ✅

import { Env } from '../config/env';

export interface TrendingData {
  gainers: TrendingToken[];
  losers: TrendingToken[];
  timestamp: string;
}

export interface TrendingToken {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  price: number;
  percent_change_24h: number;
  percent_change_7d: number;
  market_cap: number;
  volume_24h: number;
}

export interface QuoteData {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  quote: {
    USD: {
      price: number;
      volume_24h: number;
      volume_change_24h: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      percent_change_30d: number;
      market_cap: number;
      market_cap_dominance: number;
      fully_diluted_market_cap: number;
      last_updated: string;
    };
  };
}

export interface GlobalMarketData {
  active_cryptocurrencies: number;
  total_cryptocurrencies: number;
  active_market_pairs: number;
  active_exchanges: number;
  total_exchanges: number;
  eth_dominance: number;
  btc_dominance: number;
  defi_volume_24h: number;
  defi_market_cap: number;
  stablecoin_volume_24h: number;
  stablecoin_market_cap: number;
  total_market_cap: number;
  total_volume_24h: number;
  last_updated: string;
}

export class CoinMarketCapService {
  private baseUrl = 'https://pro-api.coinmarketcap.com/v1';
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Get trending gainers and losers (FREE PLAN)
   * Uses listings/latest and derives trending from % changes
   * Credit: 1 per 200 results | Cache: 15 min | Priority: HIGH
   */
  async getTrendingGainersLosers(limit: number = 10): Promise<TrendingData> {
    const cacheKey = `cmc:trending:${limit}`;
    
    // Try cache first
    const cached = await this.env.SONIC_CACHE.get(cacheKey, { type: 'json' });
    if (cached) {
      console.log('✅ CMC trending from cache');
      return cached as TrendingData;
    }

    try {
      // FREE PLAN: Use listings/latest with sort by percent_change_24h
      // This gives us top 200 coins, we'll sort by % change
      const response = await fetch(
        `${this.baseUrl}/cryptocurrency/listings/latest?limit=200&sort=percent_change_24h&sort_dir=desc`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': this.env.COINMARKETCAP_API_KEY,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`CMC API error: ${response.status}`);
      }

      const data = await response.json() as any;

      // Sort by 24h change to get gainers and losers
      const sortedByChange = (data.data as any[]).sort((a: any, b: any) =>
        b.quote.USD.percent_change_24h - a.quote.USD.percent_change_24h
      );

      // Top gainers
      const gainers = sortedByChange
        .filter((token: any) => token.quote.USD.percent_change_24h > 0)
        .slice(0, limit)
        .map((token: any) => ({
          id: token.id,
          name: token.name,
          symbol: token.symbol,
          slug: token.slug,
          price: token.quote.USD.price,
          percent_change_24h: token.quote.USD.percent_change_24h,
          percent_change_7d: token.quote.USD.percent_change_7d,
          market_cap: token.quote.USD.market_cap,
          volume_24h: token.quote.USD.volume_24h
        }));

      // Top losers (reverse sort)
      const losers = sortedByChange
        .filter((token: any) => token.quote.USD.percent_change_24h < 0)
        .slice(-limit)
        .reverse()
        .map((token: any) => ({
          id: token.id,
          name: token.name,
          symbol: token.symbol,
          slug: token.slug,
          price: token.quote.USD.price,
          percent_change_24h: token.quote.USD.percent_change_24h,
          percent_change_7d: token.quote.USD.percent_change_7d,
          market_cap: token.quote.USD.market_cap,
          volume_24h: token.quote.USD.volume_24h
        }));

      const trendingData: TrendingData = {
        gainers,
        losers,
        timestamp: new Date().toISOString()
      };

      // Cache for 15 minutes
      await this.env.SONIC_CACHE.put(cacheKey, JSON.stringify(trendingData), {
        expirationTtl: 900 // 15 minutes
      });

      // Track credit usage (1 credit for listings/latest)
      await this.trackCreditUsage('listings_latest', 1);

      console.log(`✅ CMC trending derived: ${gainers.length} gainers, ${losers.length} losers`);
      return trendingData;

    } catch (error: any) {
      console.error('❌ CMC trending error:', error);
      throw error;
    }
  }

  /**
   * Get quotes for specific symbols (FREE PLAN)
   * Credit: 1 per 100 symbols | Cache: 5 min | Priority: HIGH
   */
  async getQuotes(symbols: string[]): Promise<Record<string, QuoteData>> {
    const cacheKey = `cmc:quotes:${symbols.sort().join(',')}`;
    
    // Try cache first
    const cached = await this.env.SONIC_CACHE.get(cacheKey, { type: 'json' });
    if (cached) {
      console.log('✅ CMC quotes from cache');
      return cached as Record<string, QuoteData>;
    }

    try {
      // FREE PLAN supports up to 100 symbols per request (1 credit)
      const symbolBatch = symbols.slice(0, 100); // Limit to 100
      
      const response = await fetch(
        `${this.baseUrl}/cryptocurrency/quotes/latest?symbol=${symbolBatch.join(',')}`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': this.env.COINMARKETCAP_API_KEY,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`CMC API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const quotes: Record<string, QuoteData> = {};

      // Transform to our format
      for (const symbol of symbolBatch) {
        if (data.data?.[symbol]) {
          quotes[symbol] = data.data[symbol];
        }
      }

      // Cache for 5 minutes
      await this.env.SONIC_CACHE.put(cacheKey, JSON.stringify(quotes), {
        expirationTtl: 300 // 5 minutes
      });

      // Track credit usage (1 credit per request, regardless of symbol count up to 100)
      await this.trackCreditUsage('quotes', 1);

      console.log(`✅ CMC quotes fetched: ${Object.keys(quotes).length} symbols`);
      return quotes;

    } catch (error: any) {
      console.error('❌ CMC quotes error:', error);
      throw error;
    }
  }

  /**
   * Get global market metrics
   * Credit: 1 | Cache: 30 min | Priority: MEDIUM
   */
  async getGlobalMetrics(): Promise<GlobalMarketData> {
    const cacheKey = 'cmc:global';
    
    // Try cache first
    const cached = await this.env.SONIC_CACHE.get(cacheKey, { type: 'json' });
    if (cached) {
      console.log('✅ CMC global metrics from cache');
      return cached as GlobalMarketData;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/global-metrics/quotes/latest`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': this.env.COINMARKETCAP_API_KEY,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`CMC API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const metrics: GlobalMarketData = {
        active_cryptocurrencies: data.data?.active_cryptocurrencies,
        total_cryptocurrencies: data.data?.total_cryptocurrencies,
        active_market_pairs: data.data?.active_market_pairs,
        active_exchanges: data.data?.active_exchanges,
        total_exchanges: data.data?.total_exchanges,
        eth_dominance: data.data?.eth_dominance,
        btc_dominance: data.data?.btc_dominance,
        defi_volume_24h: data.data?.defi_volume_24h,
        defi_market_cap: data.data?.defi_market_cap,
        stablecoin_volume_24h: data.data?.stablecoin_volume_24h,
        stablecoin_market_cap: data.data?.stablecoin_market_cap,
        total_market_cap: data.data?.quote?.USD?.total_market_cap,
        total_volume_24h: data.data?.quote?.USD?.total_volume_24h,
        last_updated: data.data?.last_updated
      };

      // Cache for 30 minutes
      await this.env.SONIC_CACHE.put(cacheKey, JSON.stringify(metrics), {
        expirationTtl: 1800 // 30 minutes
      });

      // Track credit usage
      await this.trackCreditUsage('global_metrics', 1);

      console.log(`✅ CMC global metrics fetched`);
      return metrics;

    } catch (error: any) {
      console.error('❌ CMC global metrics error:', error);
      throw error;
    }
  }

  /**
   * Track API credit usage in D1
   */
  private async trackCreditUsage(endpoint: string, credits: number): Promise<void> {
    try {
      // Skip if no CONFIG_DB
      if (!this.env.CONFIG_DB) {
        console.log('⚠️ CONFIG_DB not available, skipping credit tracking');
        return;
      }

      await this.env.CONFIG_DB.prepare(`
        INSERT INTO api_credit_usage (endpoint, credits_used, timestamp, date)
        VALUES (?, ?, ?, DATE('now'))
      `).bind(endpoint, credits, new Date().toISOString()).run();

      // Log to analytics
      if (this.env.ANALYTICS) {
        this.env.ANALYTICS.writeDataPoint({
          blobs: ['cmc_credit_usage', endpoint],
          doubles: [credits],
          indexes: ['cmc']
        });
      }
    } catch (error: any) {
      // Gracefully handle missing table
      if (error.message?.includes('no such table')) {
        console.log('⚠️ Credit tracking table not initialized. Run /api/init-db to create tables.');
      } else {
        console.error('Failed to track credit usage:', error);
      }
      // Don't throw - this is non-critical
    }
  }

  /**
   * Get today's credit usage
   */
  async getCreditUsageToday(): Promise<number> {
    try {
      if (!this.env.CONFIG_DB) {
        return 0;
      }

      const result = await this.env.CONFIG_DB.prepare(`
        SELECT COALESCE(SUM(credits_used), 0) as total
        FROM api_credit_usage
        WHERE date = DATE('now')
      `).first();

      return (result?.total as number) || 0;
    } catch (error: any) {
      if (error.message?.includes('no such table')) {
        console.log('⚠️ Credit tracking table not initialized');
      } else {
        console.error('Failed to get credit usage:', error);
      }
      return 0;
    }
  }

  /**
   * Check if we're within credit limit
   */
  async canMakeRequest(credits: number): Promise<boolean> {
    const used = await this.getCreditUsageToday();
    const limit = 330; // Conservative limit (333 actual)
    
    return (used + credits) <= limit;
  }
}
