// Trending cryptocurrency tool - get_trending_crypto
// Provides top gainers and losers from Sonic blockchain via DexScreener

import { Env, MCPTool, ToolExecutionResult } from './types';
import { DexScreenerService } from '../services/dexscreener';
import { CoinMarketCapService } from '../services/coinmarketcap';

export const trendingToolDefinition: MCPTool = {
  name: "get_trending_crypto",
  description: "Get trending cryptocurrencies on Sonic blockchain - top gainers and losers in 24h from DexScreener",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        default: 10,
        description: "Number of gainers/losers to return (max 50)"
      },
      source: {
        type: "string",
        enum: ["sonic", "global"],
        default: "sonic",
        description: "Data source: 'sonic' for Sonic blockchain tokens (DexScreener), 'global' for global market (CoinMarketCap)"
      }
    }
  }
};

export async function executeGetTrending(
  args: any,
  env: Env
): Promise<ToolExecutionResult> {
  const { limit = 10, source = 'sonic' } = args;

  try {
    // Sonic blockchain trending (DexScreener)
    if (source === 'sonic') {
      const dex = new DexScreenerService(env);
      const trending = await dex.getTrendingSonicTokens(limit);

      // Log to analytics
      if (env.ANALYTICS) {
        env.ANALYTICS.writeDataPoint({
          blobs: ['trending_sonic'],
          doubles: [limit],
          indexes: ['trending']
        });
      }

      return {
        success: true,
        data: {
          source: 'DexScreener (Sonic Blockchain)',
          gainers: trending.gainers,
          losers: trending.losers,
          count: {
            gainers: trending.gainers.length,
            losers: trending.losers.length
          },
          timestamp: trending.timestamp
        },
        summary: `Retrieved top ${trending.gainers.length} Sonic gainers and ${trending.losers.length} losers for 24h`,
        timestamp: new Date().toISOString()
      };
    }

    // Global market trending (CoinMarketCap)
    const cmc = new CoinMarketCapService(env);

    // Check credit limit
    const canRequest = await cmc.canMakeRequest(1);
    if (!canRequest) {
      const usedToday = await cmc.getCreditUsageToday();
      return {
        success: false,
        error: `Daily CMC API credit limit reached (${usedToday}/330)`,
        summary: 'Credit limit reached - try source=sonic for Sonic blockchain trending',
        timestamp: new Date().toISOString()
      };
    }

    // Fetch trending data
    const trending = await cmc.getTrendingGainersLosers(limit);

    // Log to analytics
    if (env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['trending_global'],
        doubles: [limit],
        indexes: ['trending']
      });
    }

    return {
      success: true,
      data: {
        source: 'CoinMarketCap (Global Market)',
        gainers: trending.gainers,
        losers: trending.losers,
        count: {
          gainers: trending.gainers.length,
          losers: trending.losers.length
        },
        timestamp: trending.timestamp
      },
      summary: `Retrieved top ${trending.gainers.length} global gainers and ${trending.losers.length} losers for 24h`,
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
