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
}
