// Enhanced DexScreener Service with Browser Rendering
// Scrapes trending pairs from DexScreener.com using Cloudflare Browser Rendering

import { Env } from '../config/env';

/**
 * Trending pair data structure
 */
export interface TrendingPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    h24: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h1: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
  };
  priceChange: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
  info?: {
    imageUrl?: string;
    websites?: { url: string }[];
    socials?: { type: string; url: string }[];
  };
  boosts?: {
    active: number;
  };
  trendingScore?: number;
  rank?: number;
}

/**
 * Market heatmap data point
 */
export interface HeatmapDataPoint {
  symbol: string;
  name: string;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  color: string; // green for positive, red for negative
  size: number; // relative to volume
}

/**
 * Enhanced DexScreener Service
 */
export class DexScreenerEnhancedService {
  private baseApiUrl = 'https://api.dexscreener.com';
  private baseWebUrl = 'https://dexscreener.com';
  private rateLimitDelay = 210; // ~286 requests/min (under 300 limit)

  constructor(private env: Env) {}

  /**
   * Get trending pairs using Browser Rendering to scrape the page
   * This bypasses API limitations and gets the exact trending list
   */
  async getTrendingPairsBrowser(
    chain: string = 'sonic',
    limit: number = 50
  ): Promise<TrendingPair[]> {
    try {
      const url = `${this.baseWebUrl}/${chain}?rankBy=trendingScoreH1&order=desc`;

      // Use Browser Rendering if available
      if (this.env.BROWSER) {
        console.log(`[DexScreener] Fetching trending pairs via Browser Rendering: ${url}`);

        // Browser Rendering API call
        const browser = await (this.env.BROWSER as any).launch();
        const page = await browser.newPage();

        try {
          await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

          // Wait for the pairs table to load
          await page.waitForSelector('[data-testid="pair-row"]', { timeout: 10000 });

          // Extract trending pairs data
          const trendingData = await page.evaluate(() => {
            const pairRows = document.querySelectorAll('[data-testid="pair-row"]');
            const pairs: any[] = [];

            pairRows.forEach((row, index) => {
              try {
                // Extract data from each row
                const symbolEl = row.querySelector('[data-testid="pair-symbol"]');
                const priceEl = row.querySelector('[data-testid="pair-price"]');
                const priceChangeEl = row.querySelector('[data-testid="pair-price-change-24h"]');
                const volumeEl = row.querySelector('[data-testid="pair-volume-24h"]');
                const liquidityEl = row.querySelector('[data-testid="pair-liquidity"]');
                const pairAddressEl = row.querySelector('a[href*="/"]');

                if (symbolEl && pairAddressEl) {
                  const href = pairAddressEl.getAttribute('href') || '';
                  const pathParts = href.split('/').filter(Boolean);

                  pairs.push({
                    rank: index + 1,
                    symbol: symbolEl.textContent?.trim() || '',
                    priceUsd: priceEl?.textContent?.trim() || '0',
                    priceChange24h: parseFloat(priceChangeEl?.textContent?.replace('%', '').trim() || '0'),
                    volume24h: this.parseVolumeString(volumeEl?.textContent?.trim() || '0'),
                    liquidity: this.parseVolumeString(liquidityEl?.textContent?.trim() || '0'),
                    chainId: pathParts[0] || 'sonic',
                    pairAddress: pathParts[1] || '',
                  });
                }
              } catch (error) {
                console.error('Error parsing pair row:', error);
              }
            });

            return pairs;
          });

          await browser.close();

          // Enrich with API data
          const enrichedPairs = await this.enrichPairsWithApiData(trendingData.slice(0, limit), chain);

          console.log(`[DexScreener] Browser scraping found ${enrichedPairs.length} trending pairs`);
          return enrichedPairs;

        } catch (error) {
          console.error('[DexScreener] Browser rendering error:', error);
          await browser.close();
          throw error;
        }
      } else {
        // Fallback to API-only method
        console.log('[DexScreener] Browser Rendering not available, using API fallback');
        return this.getTrendingPairsApi(chain, limit);
      }
    } catch (error) {
      console.error('[DexScreener] Get trending pairs error:', error);
      // Fallback to API
      return this.getTrendingPairsApi(chain, limit);
    }
  }

  /**
   * Fallback: Get trending pairs using API search
   */
  private async getTrendingPairsApi(chain: string, limit: number): Promise<TrendingPair[]> {
    try {
      // Search for top tokens on the chain
      const searchTerms = ['sonic', 's', 'usdc', 'weth', 'btc'];
      const allPairs: TrendingPair[] = [];

      for (const term of searchTerms) {
        const response = await fetch(`${this.baseApiUrl}/latest/dex/search?q=${term}`);
        if (!response.ok) continue;

        const data = await response.json() as { pairs?: TrendingPair[] };
        if (data && data.pairs) {
          const chainPairs = data.pairs
            .filter((p: any) => p.chainId === chain)
            .slice(0, 10);
          allPairs.push(...chainPairs);
        }

        await this.delay(this.rateLimitDelay);
      }

      // Sort by 24h volume and deduplicate
      const uniquePairs = this.deduplicatePairs(allPairs);
      const sorted = uniquePairs
        .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
        .slice(0, limit);

      console.log(`[DexScreener] API fallback found ${sorted.length} pairs`);
      return sorted;
    } catch (error) {
      console.error('[DexScreener] API fallback error:', error);
      return [];
    }
  }

  /**
   * Enrich scraped data with full API details
   */
  private async enrichPairsWithApiData(
    scrapedPairs: any[],
    chain: string
  ): Promise<TrendingPair[]> {
    const enrichedPairs: TrendingPair[] = [];

    for (const pair of scrapedPairs) {
      if (!pair.pairAddress) continue;

      try {
        const response = await fetch(
          `${this.baseApiUrl}/latest/dex/pairs/${chain}/${pair.pairAddress}`
        );

        if (response.ok) {
          const data = await response.json() as { pair?: TrendingPair };
          if (data && data.pair) {
            enrichedPairs.push({
              ...data.pair,
              rank: pair.rank,
              trendingScore: 100 - pair.rank, // Higher rank = lower score
            });
          }
        }

        await this.delay(this.rateLimitDelay);
      } catch (error) {
        console.error(`[DexScreener] Error enriching pair ${pair.pairAddress}:`, error);
        // Add scraped data as fallback
        enrichedPairs.push(this.convertScrapedToPair(pair));
      }
    }

    return enrichedPairs;
  }

  /**
   * Convert scraped data to TrendingPair format
   */
  private convertScrapedToPair(scraped: any): TrendingPair {
    return {
      chainId: scraped.chainId,
      dexId: 'unknown',
      pairAddress: scraped.pairAddress,
      baseToken: {
        address: '',
        name: scraped.symbol?.split('/')[0] || '',
        symbol: scraped.symbol?.split('/')[0] || '',
      },
      quoteToken: {
        address: '',
        name: scraped.symbol?.split('/')[1] || 'USD',
        symbol: scraped.symbol?.split('/')[1] || 'USD',
      },
      priceNative: '0',
      priceUsd: scraped.priceUsd?.replace('$', '') || '0',
      txns: {
        h24: { buys: 0, sells: 0 },
        h6: { buys: 0, sells: 0 },
        h1: { buys: 0, sells: 0 },
      },
      volume: {
        h24: scraped.volume24h || 0,
        h6: 0,
        h1: 0,
      },
      priceChange: {
        h24: scraped.priceChange24h || 0,
        h6: 0,
        h1: 0,
        m5: 0,
      },
      liquidity: {
        usd: scraped.liquidity || 0,
        base: 0,
        quote: 0,
      },
      fdv: 0,
      marketCap: 0,
      pairCreatedAt: Date.now(),
      rank: scraped.rank,
      trendingScore: 100 - scraped.rank,
    };
  }

  /**
   * Get top gainers (24h)
   */
  async getTopGainers(chain: string = 'sonic', limit: number = 10): Promise<TrendingPair[]> {
    const trending = await this.getTrendingPairsBrowser(chain, 50);
    return trending
      .filter((p) => p.priceChange.h24 > 0)
      .sort((a, b) => b.priceChange.h24 - a.priceChange.h24)
      .slice(0, limit);
  }

  /**
   * Get top losers (24h)
   */
  async getTopLosers(chain: string = 'sonic', limit: number = 10): Promise<TrendingPair[]> {
    const trending = await this.getTrendingPairsBrowser(chain, 50);
    return trending
      .filter((p) => p.priceChange.h24 < 0)
      .sort((a, b) => a.priceChange.h24 - b.priceChange.h24)
      .slice(0, limit);
  }

  /**
   * Generate market heatmap data
   */
  async getMarketHeatmap(chain: string = 'sonic', limit: number = 30): Promise<HeatmapDataPoint[]> {
    const trending = await this.getTrendingPairsBrowser(chain, limit);

    // Calculate max volume for sizing
    const maxVolume = Math.max(...trending.map((p) => p.volume.h24));

    return trending.map((pair) => ({
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name,
      priceChange24h: pair.priceChange.h24,
      volume24h: pair.volume.h24,
      marketCap: pair.marketCap || pair.fdv || 0,
      color: pair.priceChange.h24 >= 0 ? '#10b981' : '#ef4444',
      size: (pair.volume.h24 / maxVolume) * 100,
    }));
  }

  /**
   * Get live prices for specific tokens
   */
  async getLivePrices(chain: string, addresses: string[]): Promise<Map<string, TrendingPair>> {
    const priceMap = new Map<string, TrendingPair>();

    for (const address of addresses) {
      try {
        const response = await fetch(
          `${this.baseApiUrl}/latest/dex/tokens/${chain}/${address}`
        );

        if (response.ok) {
          const data = await response.json() as { pairs?: TrendingPair[] };
          if (data && data.pairs && data.pairs.length > 0) {
            // Use the pair with highest liquidity
            const bestPair = data.pairs.sort((a: any, b: any) =>
              (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
            )[0];
            priceMap.set(address, bestPair);
          }
        }

        await this.delay(this.rateLimitDelay);
      } catch (error) {
        console.error(`[DexScreener] Error fetching price for ${address}:`, error);
      }
    }

    return priceMap;
  }

  /**
   * Search for token pairs
   */
  async searchPairs(query: string): Promise<TrendingPair[]> {
    try {
      const response = await fetch(`${this.baseApiUrl}/latest/dex/search?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json() as { pairs?: TrendingPair[] };
      return (data && data.pairs) ? data.pairs : [];
    } catch (error) {
      console.error('[DexScreener] Search error:', error);
      return [];
    }
  }

  /**
   * Get multiple chains' trending (for comparison)
   */
  async getMultiChainTrending(
    chains: string[] = ['sonic', 'base', 'ethereum', 'solana'],
    limitPerChain: number = 10
  ): Promise<Record<string, TrendingPair[]>> {
    const result: Record<string, TrendingPair[]> = {};

    for (const chain of chains) {
      try {
        result[chain] = await this.getTrendingPairsBrowser(chain, limitPerChain);
        // Add delay between chains to respect rate limits
        await this.delay(1000);
      } catch (error) {
        console.error(`[DexScreener] Error fetching ${chain}:`, error);
        result[chain] = [];
      }
    }

    return result;
  }

  /**
   * Helper: Parse volume/liquidity strings (e.g., "$1.2M" -> 1200000)
   */
  private parseVolumeString(str: string): number {
    const cleaned = str.replace(/[$,]/g, '').trim();
    if (cleaned.includes('M')) {
      return parseFloat(cleaned.replace('M', '')) * 1000000;
    } else if (cleaned.includes('K')) {
      return parseFloat(cleaned.replace('K', '')) * 1000;
    } else if (cleaned.includes('B')) {
      return parseFloat(cleaned.replace('B', '')) * 1000000000;
    }
    return parseFloat(cleaned) || 0;
  }

  /**
   * Helper: Deduplicate pairs by address
   */
  private deduplicatePairs(pairs: TrendingPair[]): TrendingPair[] {
    const seen = new Set<string>();
    return pairs.filter((pair) => {
      if (seen.has(pair.pairAddress)) return false;
      seen.add(pair.pairAddress);
      return true;
    });
  }

  /**
   * Helper: Rate limiting delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
