// DexScreener API Integration Service
// Free real-time DEX price data across multiple chains

import { Env, API_ENDPOINTS } from '../config/env';

export interface DexScreenerToken {
  chainId: string;
  dexId: string;
  url: string;
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
    h24?: { buys: number; sells: number };
    h6?: { buys: number; sells: number };
    h1?: { buys: number; sells: number };
  };
  volume: {
    h24?: number;
    h6?: number;
    h1?: number;
  };
  priceChange: {
    h24?: number;
    h6?: number;
    h1?: number;
  };
  liquidity: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    websites?: { url: string }[];
    socials?: { platform: string; handle: string }[];
  };
}

export interface DexScreenerPriceData {
  symbol: string;
  chainId: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  dexId: string;
  pairAddress: string;
}

export class DexScreenerService {
  private baseUrl: string;

  constructor(private env: Env) {
    this.baseUrl = API_ENDPOINTS.DEXSCREENER_BASE;
  }

  /**
   * Get token data from DexScreener
   */
  async getTokenData(chainId: string, tokenAddresses: string[]): Promise<DexScreenerToken[]> {
    try {
      const addressParam = tokenAddresses.join(',');
      const response = await fetch(
        `${this.baseUrl}/tokens/v1/${chainId}/${addressParam}`,
        {
          method: 'GET',
          headers: {
            'Accept': '*/*',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return data.pairs || [];
    } catch (error) {
      console.error('DexScreener getTokenData error:', error);
      return [];
    }
  }

  /**
   * Get price data for Sonic tokens
   */
  async getSonicPrices(tokenSymbols: string[]): Promise<Record<string, DexScreenerPriceData>> {
    const results: Record<string, DexScreenerPriceData> = {};

    // Sonic chain token addresses
    // Note: For S-USD, prefer Orderly (PERP_S_USDC) over DexScreener
    // SONIC should use wrapped S (wS) token, not the native token
    const sonicTokenAddresses: Record<string, string> = {
      'SONIC': '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38', // Wrapped Sonic (wS) - correct address
      'S': '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38', // S token uses wrapped S for pricing
      'wS': '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38', // Wrapped Sonic explicit
      'scUSD': '0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE', // Sonic USD stablecoin (different from S)
      'USDC': '0x29219dd400f2Bf60E5a23d13Be72B486D4038894', // USDC on Sonic
    };

    const addresses: string[] = [];
    const symbolMap: Record<string, string> = {};

    tokenSymbols.forEach(symbol => {
      const cleanSymbol = symbol.replace('-USD', '').replace('-USDC', '');
      const address = sonicTokenAddresses[cleanSymbol];
      if (address) {
        addresses.push(address);
        symbolMap[address.toLowerCase()] = symbol;
      }
    });

    if (addresses.length === 0) {
      return results;
    }

    try {
      const tokens = await this.getTokenData('sonic', addresses);

      tokens.forEach(token => {
        const symbol = symbolMap[token.baseToken.address.toLowerCase()];
        if (symbol) {
          results[symbol] = {
            symbol,
            chainId: token.chainId,
            price: parseFloat(token.priceUsd),
            priceChange24h: token.priceChange?.h24 || 0,
            volume24h: token.volume?.h24 || 0,
            liquidity: token.liquidity?.usd || 0,
            marketCap: token.marketCap || 0,
            dexId: token.dexId,
            pairAddress: token.pairAddress,
          };
        }
      });
    } catch (error) {
      console.error('DexScreener getSonicPrices error:', error);
    }

    return results;
  }

  /**
   * Search for pairs by token symbol
   */
  async searchPairs(query: string): Promise<DexScreenerToken[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/latest/dex/search?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: {
            'Accept': '*/*',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return data.pairs || [];
    } catch (error) {
      console.error('DexScreener searchPairs error:', error);
      return [];
    }
  }

  /**
   * Get best price for a token across all DEXes
   */
  async getBestPrice(symbol: string, chainId: string = 'sonic'): Promise<DexScreenerPriceData | null> {
    try {
      // Search for the token
      const pairs = await this.searchPairs(symbol);

      // Filter by chain if specified
      const chainPairs = chainId
        ? pairs.filter(p => p.chainId === chainId)
        : pairs;

      if (chainPairs.length === 0) {
        return null;
      }

      // Find pair with highest liquidity (most reliable price)
      const bestPair = chainPairs.reduce((best, current) => {
        const bestLiq = best.liquidity?.usd || 0;
        const currentLiq = current.liquidity?.usd || 0;
        return currentLiq > bestLiq ? current : best;
      });

      return {
        symbol,
        chainId: bestPair.chainId,
        price: parseFloat(bestPair.priceUsd),
        priceChange24h: bestPair.priceChange?.h24 || 0,
        volume24h: bestPair.volume?.h24 || 0,
        liquidity: bestPair.liquidity?.usd || 0,
        marketCap: bestPair.marketCap || 0,
        dexId: bestPair.dexId,
        pairAddress: bestPair.pairAddress,
      };
    } catch (error) {
      console.error(`DexScreener getBestPrice error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get multiple token prices
   */
  async getMultiplePrices(symbols: string[]): Promise<Record<string, DexScreenerPriceData>> {
    const results: Record<string, DexScreenerPriceData> = {};

    await Promise.all(
      symbols.map(async (symbol) => {
        const price = await this.getBestPrice(symbol);
        if (price) {
          results[symbol] = price;
        }
      })
    );

    return results;
  }

  /**
   * Get trending Sonic tokens - top gainers and losers on Sonic blockchain
   * Uses search API to gather Sonic chain pairs
   */
  async getTrendingSonicTokens(limit: number = 10): Promise<{
    gainers: Array<{
      symbol: string;
      name: string;
      price: number;
      percent_change_24h: number;
      volume_24h: number;
      liquidity: number;
      dexId: string;
      url: string;
    }>;
    losers: Array<{
      symbol: string;
      name: string;
      price: number;
      percent_change_24h: number;
      volume_24h: number;
      liquidity: number;
      dexId: string;
      url: string;
    }>;
    timestamp: string;
  }> {
    const cacheKey = `trending-sonic:${limit}`;
    
    // Try cache first (5 min TTL for real-time trending)
    try {
      const cached = await this.env.SONIC_CACHE.get(cacheKey, { type: 'json' });
      if (cached) {
        console.log('✅ Trending Sonic tokens from cache');
        return cached as any;
      }
    } catch (error) {
      console.log('Cache miss for trending Sonic tokens');
    }

    try {
      // Get Sonic chain pairs - search for popular Sonic tokens and known pairs
      // DexScreener doesn't have a direct /pairs/sonic endpoint
      const sonicTokens = ['S', 'SONIC', 'wS', 'scUSD', 'USDC', 'USDT', 'WETH', 'WBTC'];
      let allPairs: DexScreenerToken[] = [];

      // Fetch pairs for multiple tokens in parallel
      const searchPromises = sonicTokens.map(async (token) => {
        try {
          const response = await fetch(
            `${this.baseUrl}/latest/dex/search?q=${token}`,
            {
              method: 'GET',
              headers: {
                'Accept': '*/*',
              },
            }
          );

          if (!response.ok) {
            return [];
          }

          const data = await response.json() as any;
          const pairs = data.pairs || [];
          
          // Filter for Sonic chain only
          return pairs.filter((p: DexScreenerToken) => p.chainId === 'sonic');
        } catch (error) {
          console.error(`Error fetching ${token}:`, error);
          return [];
        }
      });

      const results = await Promise.all(searchPromises);
      allPairs = results.flat();

      // Remove duplicates by pair address
      const uniquePairs = Array.from(
        new Map(allPairs.map(p => [p.pairAddress, p])).values()
      );

      console.log(`Found ${uniquePairs.length} unique Sonic pairs`);

      // If we don't have enough pairs, try to get more via direct token addresses
      if (uniquePairs.length < 20) {
        console.log('Fetching additional Sonic pairs via known addresses...');
        const knownAddresses = [
          '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38', // wS
          '0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE', // scUSD
          '0x29219dd400f2Bf60E5a23d13Be72B486D4038894', // USDC
        ];

        try {
          const additionalPairs = await this.getTokenData('sonic', knownAddresses);
          uniquePairs.push(...additionalPairs);
        } catch (error) {
          console.log('Failed to fetch additional pairs:', error);
        }
      }

      // Filter for quality tokens (minimum liquidity and volume)
      const qualityPairs = uniquePairs.filter(p => 
        (p.liquidity?.usd || 0) > 500 && // Min $500 liquidity
        (p.volume?.h24 || 0) > 50 && // Min $50 24h volume
        p.priceChange?.h24 !== undefined
      );

      // Sort by 24h change
      const sortedByChange = [...qualityPairs].sort((a, b) => 
        (b.priceChange?.h24 || 0) - (a.priceChange?.h24 || 0)
      );

      // Get top gainers
      const gainers = sortedByChange
        .filter(p => (p.priceChange?.h24 || 0) > 0)
        .slice(0, limit)
        .map(p => ({
          symbol: p.baseToken.symbol,
          name: p.baseToken.name,
          price: parseFloat(p.priceUsd),
          percent_change_24h: p.priceChange?.h24 || 0,
          volume_24h: p.volume?.h24 || 0,
          liquidity: p.liquidity?.usd || 0,
          dexId: p.dexId,
          url: p.url
        }));

      // Get top losers
      const losers = sortedByChange
        .filter(p => (p.priceChange?.h24 || 0) < 0)
        .sort((a, b) => (a.priceChange?.h24 || 0) - (b.priceChange?.h24 || 0))
        .slice(0, limit)
        .map(p => ({
          symbol: p.baseToken.symbol,
          name: p.baseToken.name,
          price: parseFloat(p.priceUsd),
          percent_change_24h: p.priceChange?.h24 || 0,
          volume_24h: p.volume?.h24 || 0,
          liquidity: p.liquidity?.usd || 0,
          dexId: p.dexId,
          url: p.url
        }));

      const result = {
        gainers,
        losers,
        timestamp: new Date().toISOString()
      };

      // Cache for 5 minutes
      await this.env.SONIC_CACHE.put(cacheKey, JSON.stringify(result), {
        expirationTtl: 300
      });

      console.log(`✅ Trending Sonic tokens: ${gainers.length} gainers, ${losers.length} losers`);
      return result;

    } catch (error) {
      console.error('DexScreener getTrendingSonicTokens error:', error);
      throw error;
    }
  }
}
