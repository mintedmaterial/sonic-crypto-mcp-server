// Trending cryptocurrency tool - get_trending_crypto
// Provides top gainers and losers from CoinMarketCap

import { Env, MCPTool, ToolExecutionResult } from './types';
import { CoinMarketCapService } from '../services/coinmarketcap';

export const trendingToolDefinition: MCPTool = {
  name: "get_trending_crypto",
  description: "Get trending cryptocurrencies - top gainers and losers in 24h from CoinMarketCap",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        default: 10,
        description: "Number of gainers/losers to return (max 100)"
      },
      time_period: {
        type: "string",
        enum: ["24h", "7d", "30d"],
        default: "24h",
        description: "Time period for trending data"
      }
    }
  }
};

export async function executeGetTrending(
  args: any,
  env: Env
): Promise<ToolExecutionResult> {
  const { limit = 10, time_period = '24h' } = args;

  try {
    const cmc = new CoinMarketCapService(env);

    // Check credit limit
    const canRequest = await cmc.canMakeRequest(1);
    if (!canRequest) {
      const usedToday = await cmc.getCreditUsageToday();
      return {
        success: false,
        error: `Daily CMC API credit limit reached (${usedToday}/330)`,
        summary: 'Credit limit reached - using cached data only',
        timestamp: new Date().toISOString()
      };
    }

    // Fetch trending data
    const trending = await cmc.getTrendingGainersLosers(limit);

    // Log to analytics
    if (env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['trending_query', time_period],
        doubles: [limit],
        indexes: ['trending']
      });
    }

    return {
      success: true,
      data: {
        gainers: trending.gainers,
        losers: trending.losers,
        count: {
          gainers: trending.gainers.length,
          losers: trending.losers.length
        },
        timestamp: trending.timestamp
      },
      summary: `Retrieved top ${trending.gainers.length} gainers and ${trending.losers.length} losers for ${time_period}`,
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    console.error('Trending tool error:', error);
    
    return {
      success: false,
      error: error.message,
      summary: `Failed to fetch trending data: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}
