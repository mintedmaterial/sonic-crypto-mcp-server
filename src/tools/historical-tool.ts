// Historical data tools for building data history

import { Env, MCPTool, ToolExecutionResult } from './types';
import { fetchCoinDeskData } from './coindesk-api';

export const historicalDailyToolDefinition: MCPTool = {
  name: "get_historical_ohlcv_daily",
  description: "Get historical daily OHLCV (Open, High, Low, Close, Volume) data for cryptocurrencies",
  inputSchema: {
    type: "object",
    properties: {
      market: {
        type: "string",
        enum: ["cadli", "ccix", "ccixbe", "cd_mc", "sda"],
        default: "cadli"
      },
      instruments: {
        type: "array",
        items: { type: "string" },
        default: ["BTC-USD", "ETH-USD", "S-USD"]
      },
      limit: {
        type: "number",
        default: 30,
        description: "Number of days to fetch (max 5000)"
      },
      start_date: {
        type: "string",
        description: "Start date in ISO format (optional)"
      },
      end_date: {
        type: "string",
        description: "End date in ISO format (optional)"
      }
    },
    required: ["market", "instruments"]
  }
};

export const historicalHourlyToolDefinition: MCPTool = {
  name: "get_historical_ohlcv_hourly",
  description: "Get historical hourly OHLCV data for intraday analysis",
  inputSchema: {
    type: "object",
    properties: {
      market: { type: "string", default: "cadli" },
      instruments: {
        type: "array",
        items: { type: "string" },
        default: ["BTC-USD", "ETH-USD", "S-USD"]
      },
      limit: { type: "number", default: 24, description: "Number of hours" }
    },
    required: ["market", "instruments"]
  }
};

export const historicalMinutesToolDefinition: MCPTool = {
  name: "get_historical_ohlcv_minutes",
  description: "Get minute-by-minute data for high-frequency trading analysis",
  inputSchema: {
    type: "object",
    properties: {
      market: { type: "string", default: "cadli" },
      instruments: {
        type: "array",
        items: { type: "string" },
        default: ["BTC-USD", "ETH-USD", "S-USD"]
      },
      limit: { type: "number", default: 60, description: "Number of minutes" }
    },
    required: ["market", "instruments"]
  }
};

export async function executeGetHistoricalDaily(
  args: any,
  env: Env
): Promise<ToolExecutionResult> {
  const {
    market = 'cadli',
    instruments = ['BTC-USD', 'ETH-USD', 'S-USD'],
    limit = 30,
    start_date,
    end_date
  } = args;

  try {
    const params: any = {
      market,
      instruments,
      limit
    };

    if (start_date) params.start_date = start_date;
    if (end_date) params.end_date = end_date;

    const data = await fetchCoinDeskData('/index/cc/v1/historical/days', params, env);

    // Store in R2 for long-term storage
    const r2Key = `historical/daily/${market}/${instruments.join('-')}/${new Date().toISOString().split('T')[0]}.json`;
    await env.HISTORICAL_DATA.put(r2Key, JSON.stringify(data), {
      httpMetadata: {
        contentType: 'application/json',
      },
      customMetadata: {
        market,
        instruments: instruments.join(','),
        dataType: 'daily',
        fetchDate: new Date().toISOString()
      }
    });

    // Also cache recent data in KV (7 day TTL)
    const kvKey = `historical:daily:${market}:${instruments.join(',')}`;
    await env.SONIC_CACHE.put(kvKey, JSON.stringify(data), {
      expirationTtl: 7 * 24 * 60 * 60 // 7 days
    });

    return {
      success: true,
      data,
      summary: `Fetched ${limit} days of historical data for ${instruments.join(', ')}`,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function executeGetHistoricalHourly(
  args: any,
  env: Env
): Promise<ToolExecutionResult> {
  const {
    market = 'cadli',
    instruments = ['BTC-USD', 'ETH-USD', 'S-USD'],
    limit = 24
  } = args;

  try {
    const data = await fetchCoinDeskData('/index/cc/v1/historical/hours', {
      market,
      instruments,
      limit
    }, env);

    // Store in R2
    const r2Key = `historical/hourly/${market}/${instruments.join('-')}/${new Date().toISOString().split('T')[0]}.json`;
    await env.HISTORICAL_DATA.put(r2Key, JSON.stringify(data));

    // Cache in KV (1 day TTL)
    const kvKey = `historical:hourly:${market}:${instruments.join(',')}`;
    await env.SONIC_CACHE.put(kvKey, JSON.stringify(data), {
      expirationTtl: 24 * 60 * 60
    });

    return {
      success: true,
      data,
      summary: `Fetched ${limit} hours of data for ${instruments.join(', ')}`,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function executeGetHistoricalMinutes(
  args: any,
  env: Env
): Promise<ToolExecutionResult> {
  const {
    market = 'cadli',
    instruments = ['BTC-USD', 'ETH-USD', 'S-USD'],
    limit = 60
  } = args;

  try {
    const data = await fetchCoinDeskData('/index/cc/v1/historical/minutes', {
      market,
      instruments,
      limit
    }, env);

    // Store in KV only (short TTL - 1 hour)
    const kvKey = `historical:minutes:${market}:${instruments.join(',')}`;
    await env.SONIC_CACHE.put(kvKey, JSON.stringify(data), {
      expirationTtl: 60 * 60
    });

    return {
      success: true,
      data,
      summary: `Fetched ${limit} minutes of data for ${instruments.join(', ')}`,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
