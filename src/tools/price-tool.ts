// Multi-source Price Data Tool with Smart Fallback
// Priority: Orderly Network → DexScreener → CoinDesk

import { Env, MCPTool, ToolExecutionResult } from './types';
import { fetchCoinDeskData, getCachedData, setCachedData } from './coindesk-api';
import { OrderlyService } from '../services/orderly';
import { DexScreenerService } from '../services/dexscreener';

export const priceToolDefinition: MCPTool = {
  name: "get_latest_index_tick",
  description: "Get latest cryptocurrency prices with multi-source fallback (Orderly DEX → DexScreener → CoinDesk). Supports Sonic ecosystem tokens and major cryptocurrencies. S-USD uses PERP_S_USDC from Orderly/what.exchange for accurate perpetual pricing.",
  inputSchema: {
    type: "object",
    properties: {
      market: {
        type: "string",
        enum: ["cadli", "ccix", "ccixbe", "cd_mc", "sda", "orderly", "dexscreener"],
        default: "orderly",
        description: "Data source: 'orderly' for DEX data (includes PERP_S_USDC), 'dexscreener' for DEX aggregator, or CoinDesk markets"
      },
      instruments: {
        type: "array",
        items: { type: "string" },
        default: ["BTC-USD", "ETH-USD", "S-USD", "SONIC-USD"],
        description: "Array of instrument symbols (e.g., BTC-USD, ETH-USD, S-USD for PERP_S_USDC)"
      }
    },
    required: ["instruments"]
  }
};

interface PriceData {
  INSTRUMENT: string;
  VALUE: {
    PRICE: number;
    BID?: number;
    ASK?: number;
    SPREAD?: number;
  };
  CURRENT_DAY: {
    CHANGE_PERCENTAGE: number;
    HIGH: number;
    LOW: number;
    VOLUME: number;
  };
  SOURCE: 'orderly' | 'dexscreener' | 'coindesk';
  LIQUIDITY?: number;
  MARKET_CAP?: number;
}

export async function executeGetLatestIndexTick(
  args: any,
  env: Env
): Promise<ToolExecutionResult> {
  const { market, instruments = ['BTC-USD', 'ETH-USD', 'S-USD', 'SONIC-USD'] } = args;

  try {
    const cacheKey = `price:multi:${instruments.join(',')}`;

    // Try cache first (60 second TTL - Cloudflare KV minimum)
    const cached = await getCachedData(cacheKey, env, 60);
    if (cached) {
      return {
        success: true,
        data: cached,
        summary: `Retrieved prices for ${instruments.join(', ')} (cached)`,
        timestamp: new Date().toISOString()
      };
    }

    const priceData: PriceData[] = [];
    const errors: string[] = [];

    // Try each source in priority order
    for (const instrument of instruments) {
      let price: PriceData | null = null;

      // Source 1: Orderly Network (broker-level data)
      if (!price && (!market || market === 'orderly')) {
        try {
          price = await fetchFromOrderly(instrument, env);
          if (price) {
            console.log(`✅ Orderly: ${instrument} = $${price.VALUE.PRICE}`);
          }
        } catch (error: any) {
          console.error(`❌ Orderly ${instrument}: ${error.message}`);
          errors.push(`Orderly ${instrument}: ${error.message}`);
        }
      }

      // Source 2: DexScreener (free real-time)
      if (!price && (!market || market === 'dexscreener')) {
        try {
          price = await fetchFromDexScreener(instrument, env);
          if (price) {
            console.log(`✅ DexScreener: ${instrument} = $${price.VALUE.PRICE}`);
          }
        } catch (error: any) {
          console.error(`❌ DexScreener ${instrument}: ${error.message}`);
          errors.push(`DexScreener ${instrument}: ${error.message}`);
        }
      }

      // Source 3: CoinDesk (paid fallback)
      if (!price) {
        try {
          price = await fetchFromCoinDesk(instrument, market || 'cadli', env);
          if (price) {
            console.log(`✅ CoinDesk: ${instrument} = $${price.VALUE.PRICE}`);
          }
        } catch (error: any) {
          console.error(`❌ CoinDesk ${instrument}: ${error.message}`);
          errors.push(`CoinDesk ${instrument}: ${error.message}`);
        }
      }

      if (price) {
        priceData.push(price);
      } else {
        // Add error entry
        priceData.push({
          INSTRUMENT: instrument,
          VALUE: { PRICE: 0 },
          CURRENT_DAY: { CHANGE_PERCENTAGE: 0, HIGH: 0, LOW: 0, VOLUME: 0 },
          SOURCE: 'coindesk',
        });
        errors.push(`No price data available for ${instrument}`);
      }
    }

    const result = {
      data: priceData,
      errors: errors.length > 0 ? errors : undefined,
      sources_used: [...new Set(priceData.map(p => p.SOURCE))],
    };

    // Cache the result (60 second TTL - Cloudflare KV minimum)
    await setCachedData(cacheKey, result, env, 60);

    // Log analytics
    if (env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['price_fetch_multi', priceData.map(p => p.SOURCE).join(',')],
        doubles: [priceData.length],
        indexes: ['multi_source']
      });
    }

    return {
      success: true,
      data: result,
      summary: `Retrieved prices for ${priceData.length}/${instruments.length} instruments from ${result.sources_used.join(', ')}`,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      summary: `Failed to fetch prices: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Fetch price from Orderly Network
 * Uses PERP_S_USDC for S-USD (correct S token perpetual price)
 * Source: https://trade.what.exchange/perp/PERP_S_USDC
 */
async function fetchFromOrderly(instrument: string, env: Env): Promise<PriceData | null> {
  const orderly = new OrderlyService(env);
  const symbol = OrderlyService.normalizeSymbol(instrument);

  const ticker = await orderly.getTicker(symbol);
  if (!ticker) return null;

  return {
    INSTRUMENT: instrument,
    VALUE: {
      PRICE: ticker.last_price,
      BID: ticker.bid_price,
      ASK: ticker.ask_price,
      SPREAD: ticker.spread,
    },
    CURRENT_DAY: {
      CHANGE_PERCENTAGE: ticker.change_24h,
      HIGH: ticker.high_24h,
      LOW: ticker.low_24h,
      VOLUME: ticker.volume_24h,
    },
    SOURCE: 'orderly',
  };
}

/**
 * Fetch price from DexScreener
 */
async function fetchFromDexScreener(instrument: string, env: Env): Promise<PriceData | null> {
  const dexscreener = new DexScreenerService(env);
  const symbol = instrument.replace('-USD', '').replace('-USDC', '');

  const priceData = await dexscreener.getBestPrice(symbol, 'sonic');
  if (!priceData) return null;

  return {
    INSTRUMENT: instrument,
    VALUE: {
      PRICE: priceData.price,
    },
    CURRENT_DAY: {
      CHANGE_PERCENTAGE: priceData.priceChange24h,
      HIGH: priceData.price * (1 + priceData.priceChange24h / 200), // Estimate
      LOW: priceData.price * (1 - priceData.priceChange24h / 200),  // Estimate
      VOLUME: priceData.volume24h,
    },
    SOURCE: 'dexscreener',
    LIQUIDITY: priceData.liquidity,
    MARKET_CAP: priceData.marketCap,
  };
}

/**
 * Fetch price from CoinDesk (fallback)
 */
async function fetchFromCoinDesk(instrument: string, market: string, env: Env): Promise<PriceData | null> {
  try {
    const data = await fetchCoinDeskData('/indices/values', {
      assets: [instrument],
      index_id: market
    }, env);

    if (!data || !data.data || data.data.length === 0) {
      return null;
    }

    const item = data.data[0];
    return {
      INSTRUMENT: instrument,
      VALUE: {
        PRICE: item.VALUE?.PRICE || 0,
      },
      CURRENT_DAY: {
        CHANGE_PERCENTAGE: item.CURRENT_DAY?.CHANGE_PERCENTAGE || 0,
        HIGH: item.CURRENT_DAY?.HIGH || 0,
        LOW: item.CURRENT_DAY?.LOW || 0,
        VOLUME: item.CURRENT_DAY?.VOLUME || 0,
      },
      SOURCE: 'coindesk',
    };
  } catch (error) {
    console.error(`CoinDesk fetch error for ${instrument}:`, error);
    return null;
  }
}
