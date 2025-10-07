// Tool registry - exports all MCP tools and their executors

import { Env, MCPTool, ToolExecutionResult } from './types';

// Import tool definitions
import { priceToolDefinition, executeGetLatestIndexTick } from './price-tool';
import { sentimentToolDefinition, executeAnalyzeSentiment } from './sentiment-tool';
import { webSearchToolDefinition, executeWebSearch } from './web-search-tool';
import {
  historicalDailyToolDefinition,
  historicalHourlyToolDefinition,
  historicalMinutesToolDefinition,
  executeGetHistoricalDaily,
  executeGetHistoricalHourly,
  executeGetHistoricalMinutes
} from './historical-tool';

// Export all tool definitions
export const ALL_TOOLS: MCPTool[] = [
  priceToolDefinition,
  sentimentToolDefinition,
  webSearchToolDefinition,
  historicalDailyToolDefinition,
  historicalHourlyToolDefinition,
  historicalMinutesToolDefinition
];

// Tool execution router
export async function executeTool(
  toolName: string,
  args: any,
  env: Env
): Promise<ToolExecutionResult> {
  switch (toolName) {
    case 'get_latest_index_tick':
      return await executeGetLatestIndexTick(args, env);

    case 'analyze_sonic_market_sentiment':
      return await executeAnalyzeSentiment(args, env);

    case 'search_crypto_news':
      return await executeWebSearch(args, env);

    case 'get_historical_ohlcv_daily':
      return await executeGetHistoricalDaily(args, env);

    case 'get_historical_ohlcv_hourly':
      return await executeGetHistoricalHourly(args, env);

    case 'get_historical_ohlcv_minutes':
      return await executeGetHistoricalMinutes(args, env);

    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`,
        timestamp: new Date().toISOString()
      };
  }
}

// Export types
export type { Env, MCPTool, ToolExecutionResult };
