// Global market metrics tool - get_global_market_data
// Provides overall crypto market statistics from CoinMarketCap

import { Env, MCPTool, ToolExecutionResult } from './types';
import { CoinMarketCapService } from '../services/coinmarketcap';

export const globalMarketToolDefinition: MCPTool = {
  name: "get_global_market_data",
  description: "Get global cryptocurrency market metrics including total market cap, volume, BTC dominance, and DeFi stats",
  inputSchema: {
    type: "object",
    properties: {}
  }
};

export async function executeGetGlobalMarket(
  args: any,
  env: Env
): Promise<ToolExecutionResult> {
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

    // Fetch global metrics
    const metrics = await cmc.getGlobalMetrics();

    // Log to analytics
    if (env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['global_market_query'],
        doubles: [metrics.total_market_cap],
        indexes: ['global']
      });
    }

    return {
      success: true,
      data: {
        market_cap: {
          total: metrics.total_market_cap,
          defi: metrics.defi_market_cap,
          stablecoin: metrics.stablecoin_market_cap
        },
        volume_24h: {
          total: metrics.total_volume_24h,
          defi: metrics.defi_volume_24h,
          stablecoin: metrics.stablecoin_volume_24h
        },
        dominance: {
          btc: metrics.btc_dominance,
          eth: metrics.eth_dominance
        },
        statistics: {
          active_cryptocurrencies: metrics.active_cryptocurrencies,
          total_cryptocurrencies: metrics.total_cryptocurrencies,
          active_exchanges: metrics.active_exchanges,
          active_market_pairs: metrics.active_market_pairs
        },
        last_updated: metrics.last_updated
      },
      summary: `Global market cap: $${(metrics.total_market_cap / 1e12).toFixed(2)}T | BTC dominance: ${metrics.btc_dominance.toFixed(1)}%`,
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    console.error('Global market tool error:', error);
    
    return {
      success: false,
      error: error.message,
      summary: `Failed to fetch global market data: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}
