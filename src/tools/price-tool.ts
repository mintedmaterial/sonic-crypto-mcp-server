// Price data tool - get_latest_index_tick

import { Env, MCPTool, ToolExecutionResult } from './types';
import { fetchCoinDeskData, getCachedData, setCachedData } from './coindesk-api';

export const priceToolDefinition: MCPTool = {
  name: "get_latest_index_tick",
  description: "Get latest tick data for cryptocurrency indices with real-time OHLC metrics. Supports Sonic ecosystem tokens (S-USD, SONIC-USD) and major cryptocurrencies.",
  inputSchema: {
    type: "object",
    properties: {
      market: {
        type: "string",
        enum: ["cadli", "ccix", "ccixbe", "cd_mc", "sda"],
        default: "cadli",
        description: "The market/index to query"
      },
      instruments: {
        type: "array",
        items: { type: "string" },
        default: ["BTC-USD", "ETH-USD", "S-USD", "SONIC-USD"],
        description: "Array of instrument symbols (e.g., BTC-USD, ETH-USD, S-USD)"
      }
    },
    required: ["market", "instruments"]
  }
};

export async function executeGetLatestIndexTick(
  args: any,
  env: Env
): Promise<ToolExecutionResult> {
  const { market = 'cadli', instruments = ['BTC-USD', 'ETH-USD', 'S-USD', 'SONIC-USD'] } = args;

  try {
    const cacheKey = `price:${market}:${instruments.join(',')}`;

    // Try cache first (10 second TTL for real-time data)
    const cached = await getCachedData(cacheKey, env, 10);
    if (cached) {
      return {
        success: true,
        data: cached,
        summary: `Retrieved latest prices for ${instruments.join(', ')} (cached)`,
        timestamp: new Date().toISOString()
      };
    }

    // Fetch fresh data
    const data = await fetchCoinDeskData('/indices/values', {
      assets: instruments,
      index_id: market
    }, env);

    // Cache the result
    await setCachedData(cacheKey, data, env, 10);

    // Log analytics
    if (env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['price_fetch', market, instruments.join(',')],
        doubles: [instruments.length],
        indexes: [market]
      });
    }

    return {
      success: true,
      data: data,
      summary: `Retrieved latest prices for ${instruments.join(', ')}`,
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
