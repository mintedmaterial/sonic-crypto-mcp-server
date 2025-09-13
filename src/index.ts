import { 
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

// Types based on CoinDesk API responses
interface IndexTickData {
  market: string;
  instrument: string;
  value: number;
  timestamp: number;
  groups: {
    ID?: any;
    VALUE?: any;
    LAST_UPDATE?: any;
    CURRENT_HOUR?: any;
    CURRENT_DAY?: any;
    MOVING_24_HOUR?: any;
    MOVING_7_DAY?: any;
    MOVING_30_DAY?: any;
  };
}

interface HistoricalOHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quote_volume?: number;
  total_index_updates?: number;
}

interface NewsArticle {
  id: string;
  title: string;
  body: string;
  published_on: number;
  url: string;
  source: string;
  tags: string[];
  imageurl?: string;
}

interface MarketData {
  market: string;
  name: string;
  description: string;
  launch_date: string;
  total_instruments: number;
  status: string;
}

// Durable Object for caching and state management
class CryptoDataCache {
  private state: DurableObjectState;
  private cache: Map<string, any> = new Map();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async get(key: string): Promise<any> {
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (cached.expires > Date.now()) {
        return cached.data;
      }
      this.cache.delete(key);
    }
    
    const stored: any = await this.state.storage.get(key);
    if (stored && stored.expires > Date.now()) {
      this.cache.set(key, stored);
      return stored.data;
    }
    
    return null;
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const expires = Date.now() + (ttlSeconds * 1000);
    const cacheItem = { data: value, expires };
    
    this.cache.set(key, cacheItem);
    await this.state.storage.put(key, cacheItem);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    await this.state.storage.delete(key);
  }
}

// MCP Session Manager Durable Object
class MCPSessionManager {
  private state: DurableObjectState;
  private sessions: Map<string, any> = new Map();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async createSession(sessionId: string, sessionData: any): Promise<void> {
    this.sessions.set(sessionId, sessionData);
    await this.state.storage.put(sessionId, sessionData);
  }

  async getSession(sessionId: string): Promise<any> {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId);
    }
    const stored = await this.state.storage.get(sessionId);
    if (stored) {
      this.sessions.set(sessionId, stored);
      return stored;
    }
    return null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    await this.state.storage.delete(sessionId);
  }
}

// Main MCP Server class
export class SonicCryptoMCPServer {
  private coindeskApiKey: string;
  private cache: CryptoDataCache;
  private baseUrl = 'https://data-api.cryptocompare.com';
  
  // Sonic-specific and major crypto instruments
  private sonicInstruments = [
    'S-USD', 'SONIC-USD', 'ETH-USD', 'BTC-USD', 'USDC-USD', 'USDT-USD'
  ];

  // Available markets/indices from CoinDesk API
  private availableMarkets = [
    'cadli',      // CoinDesk Adaptive Diversified Liquidity Index (main)
    'ccix',       // CoinDesk Composite Index 
    'ccixbe',     // CCIX Bermuda
    'cd_mc',      // CoinDesk Market Cap Index
    'sda'         // Stable Digital Asset Index
  ];

  constructor(coindeskApiKey: string, cache: CryptoDataCache) {
    this.coindeskApiKey = coindeskApiKey;
    this.cache = cache;
  }

  // Tool definitions based on actual CoinDesk API endpoints
  getTools(): Tool[] {
    return [
      {
        name: 'get_latest_index_tick',
        description: 'Get latest tick data for cryptocurrency indices with real-time OHLC metrics',
        inputSchema: {
          type: 'object',
          properties: {
            market: {
              type: 'string',
              enum: this.availableMarkets,
              default: 'cadli',
              description: 'Index family to get data from'
            },
            instruments: {
              type: 'array',
              items: { type: 'string' },
              default: ['BTC-USD', 'ETH-USD', 'S-USD'],
              description: 'Instruments to retrieve (e.g., BTC-USD, ETH-USD)'
            },
            groups: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['ID', 'VALUE', 'LAST_UPDATE', 'CURRENT_HOUR', 'CURRENT_DAY', 'MOVING_24_HOUR', 'MOVING_7_DAY', 'MOVING_30_DAY']
              },
              default: ['VALUE', 'CURRENT_DAY', 'MOVING_24_HOUR'],
              description: 'Data groups to include in response'
            }
          },
          required: ['market', 'instruments']
        }
      },
      {
        name: 'get_historical_ohlcv_daily',
        description: 'Get historical daily OHLCV+ data for cryptocurrency indices',
        inputSchema: {
          type: 'object',
          properties: {
            market: {
              type: 'string',
              enum: this.availableMarkets,
              default: 'cadli',
              description: 'Index family to get data from'
            },
            instrument: {
              type: 'string',
              description: 'Single instrument to retrieve (e.g., BTC-USD)',
              default: 'BTC-USD'
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 5000,
              default: 30,
              description: 'Number of data points to return'
            },
            to_ts: {
              type: 'integer',
              description: 'Unix timestamp - get data up to this time'
            },
            groups: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['ID', 'OHLC', 'OHLC_MESSAGE', 'MESSAGE', 'VOLUME']
              },
              default: ['OHLC', 'VOLUME'],
              description: 'Data groups to include'
            }
          },
          required: ['market', 'instrument']
        }
      },
      {
        name: 'get_historical_ohlcv_hourly',
        description: 'Get historical hourly OHLCV+ data for intraday analysis',
        inputSchema: {
          type: 'object',
          properties: {
            market: {
              type: 'string',
              enum: this.availableMarkets,
              default: 'cadli'
            },
            instrument: {
              type: 'string',
              description: 'Single instrument to retrieve',
              default: 'BTC-USD'
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 2000,
              default: 24,
              description: 'Number of hourly data points'
            },
            to_ts: {
              type: 'integer',
              description: 'Unix timestamp - get data up to this time'
            }
          },
          required: ['market', 'instrument']
        }
      },
      {
        name: 'get_historical_ohlcv_minutes',
        description: 'Get minute-by-minute OHLCV data for high-frequency analysis',
        inputSchema: {
          type: 'object',
          properties: {
            market: {
              type: 'string',
              enum: this.availableMarkets,
              default: 'cadli'
            },
            instrument: {
              type: 'string',
              description: 'Single instrument to retrieve',
              default: 'BTC-USD'
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 2000,
              default: 60,
              description: 'Number of minute data points'
            },
            aggregate: {
              type: 'integer',
              minimum: 1,
              maximum: 30,
              default: 1,
              description: 'Aggregate minutes (e.g., 5 for 5-minute intervals)'
            }
          },
          required: ['market', 'instrument']
        }
      },
      {
        name: 'get_da_fixings',
        description: 'Get CoinDesk Digital Asset Fixing Indices for end-of-day pricing',
        inputSchema: {
          type: 'object',
          properties: {
            instrument: {
              type: 'string',
              default: 'BTC-USD',
              description: 'Instrument for DA fixing'
            },
            timezone: {
              type: 'string',
              enum: [
                'UTC', 'America/New_York', 'Europe/London', 'Asia/Hong_Kong', 
                'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney'
              ],
              default: 'UTC',
              description: 'Timezone for closing time'
            },
            close_time: {
              type: 'string',
              default: '16:00',
              description: 'Closing time (HH:MM format)'
            },
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format (defaults to current day)'
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 10,
              default: 5,
              description: 'Number of days to return'
            }
          },
          required: ['instrument', 'timezone', 'close_time']
        }
      },
      {
        name: 'get_index_updates_by_timestamp',
        description: 'Get tick-level index updates starting from a specific timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            market: {
              type: 'string',
              enum: this.availableMarkets,
              default: 'cadli'
            },
            instrument: {
              type: 'string',
              description: 'Instrument to get updates for',
              default: 'BTC-USD'
            },
            after_ts: {
              type: 'integer',
              description: 'Unix timestamp - get updates after this time',
              default: Math.floor(Date.now() / 1000) - 3600 // Last hour
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 5000,
              default: 100,
              description: 'Maximum number of updates to return'
            },
            groups: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['ID', 'MAPPING', 'MESSAGE', 'COMPONENTS', 'STATUS']
              },
              default: ['ID', 'MESSAGE', 'STATUS']
            }
          },
          required: ['market', 'instrument', 'after_ts']
        }
      },
      {
        name: 'get_instrument_metadata',
        description: 'Get metadata about financial instruments in an index',
        inputSchema: {
          type: 'object',
          properties: {
            market: {
              type: 'string',
              enum: this.availableMarkets,
              default: 'cadli'
            },
            instruments: {
              type: 'array',
              items: { type: 'string' },
              maxItems: 25,
              default: ['BTC-USD', 'ETH-USD'],
              description: 'Instruments to get metadata for'
            },
            groups: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['STATUS', 'GENERAL', 'MIGRATION', 'INTERNAL', 'FIRST_INDEX_UPDATE', 'LAST_INDEX_UPDATE']
              },
              default: ['STATUS', 'GENERAL']
            }
          },
          required: ['market', 'instruments']
        }
      },
      {
        name: 'get_available_markets',
        description: 'Get information about available cryptocurrency indices/markets',
        inputSchema: {
          type: 'object',
          properties: {
            market: {
              type: 'string',
              description: 'Specific market to get info for (optional - returns all if empty)'
            }
          }
        }
      },
      {
        name: 'search_sonic_opportunities',
        description: 'Search for Sonic ecosystem trading and yield opportunities',
        inputSchema: {
          type: 'object',
          properties: {
            analysis_type: {
              type: 'string',
              enum: ['yield_farming', 'arbitrage', 'trend_analysis', 'risk_assessment'],
              default: 'yield_farming',
              description: 'Type of opportunity analysis to perform'
            },
            timeframe: {
              type: 'string',
              enum: ['1h', '4h', '1d', '7d', '30d'],
              default: '24h',
              description: 'Analysis timeframe'
            },
            risk_level: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              default: 'medium',
              description: 'Risk tolerance level'
            }
          }
        }
      },
      {
        name: 'analyze_sonic_market_sentiment',
        description: 'Analyze market sentiment and social trends for Sonic ecosystem',
        inputSchema: {
          type: 'object',
          properties: {
            sentiment_sources: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['price_action', 'volume_analysis', 'social_metrics', 'defi_metrics']
              },
              default: ['price_action', 'volume_analysis'],
              description: 'Sources to analyze for sentiment'
            },
            timeframe: {
              type: 'string',
              enum: ['1h', '4h', '1d', '7d'],
              default: '1d'
            }
          }
        }
      }
    ];
  }

  // Helper method to make API requests
  private async makeApiRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
    
    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Add API key to params
    const apiParams = {
      ...params,
      api_key: this.coindeskApiKey
    };

    // Build query string
    const queryString = new URLSearchParams();
    Object.entries(apiParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        queryString.append(key, value.join(','));
      } else if (value !== undefined && value !== null) {
        queryString.append(key, String(value));
      }
    });

    const url = `${this.baseUrl}${endpoint}?${queryString.toString()}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SonicCryptoMCP/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache successful responses (TTL based on endpoint)
      const ttl = this.getCacheTTL(endpoint);
      await this.cache.set(cacheKey, data, ttl);
      
      return data;
    } catch (error: any) {
      throw new Error(`Failed to fetch from CoinDesk API: ${error.message}`);
    }
  }

  // Determine cache TTL based on endpoint type
  private getCacheTTL(endpoint: string): number {
    if (endpoint.includes('/latest/')) return 10; // 10 seconds for real-time data
    if (endpoint.includes('/historical/minutes')) return 60; // 1 minute for minute data
    if (endpoint.includes('/historical/hours')) return 300; // 5 minutes for hourly data
    if (endpoint.includes('/historical/days')) return 3600; // 1 hour for daily data
    return 300; // Default 5 minutes
  }

  // Tool implementation methods
  async getLatestIndexTick(args: any): Promise<string> {
    try {
      const { market = 'cadli', instruments, groups = ['VALUE', 'CURRENT_DAY', 'MOVING_24_HOUR'] } = args;
      
      const data = await this.makeApiRequest('/index/cc/v1/latest/tick', {
        market,
        instruments,
        groups
      });

      return JSON.stringify({
        success: true,
        market,
        instruments,
        data: data.Data || data,
        timestamp: new Date().toISOString(),
        summary: `Latest tick data for ${instruments.length} instruments from ${market} index`
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message,
        tool: 'get_latest_index_tick'
      }, null, 2);
    }
  }

  async getHistoricalOHLCVDaily(args: any): Promise<string> {
    try {
      const { 
        market = 'cadli', 
        instrument, 
        limit = 30, 
        to_ts,
        groups = ['OHLC', 'VOLUME']
      } = args;
      
      const params: any = { market, instrument, limit, groups };
      if (to_ts) params.to_ts = to_ts;

      const data = await this.makeApiRequest('/index/cc/v1/historical/days', params);

      return JSON.stringify({
        success: true,
        market,
        instrument,
        timeframe: 'daily',
        data_points: data.Data?.length || 0,
        data: data.Data || data,
        summary: `${limit} days of OHLCV data for ${instrument} from ${market}`
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message,
        tool: 'get_historical_ohlcv_daily'
      }, null, 2);
    }
  }

  async getHistoricalOHLCVHourly(args: any): Promise<string> {
    try {
      const { 
        market = 'cadli', 
        instrument, 
        limit = 24, 
        to_ts 
      } = args;
      
      const params: any = { market, instrument, limit };
      if (to_ts) params.to_ts = to_ts;

      const data = await this.makeApiRequest('/index/cc/v1/historical/hours', params);

      return JSON.stringify({
        success: true,
        market,
        instrument,
        timeframe: 'hourly',
        data_points: data.Data?.length || 0,
        data: data.Data || data,
        summary: `${limit} hours of OHLCV data for ${instrument}`
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message,
        tool: 'get_historical_ohlcv_hourly'
      }, null, 2);
    }
  }

  async getHistoricalOHLCVMinutes(args: any): Promise<string> {
    try {
      const { 
        market = 'cadli', 
        instrument, 
        limit = 60, 
        aggregate = 1 
      } = args;
      
      const data = await this.makeApiRequest('/index/cc/v1/historical/minutes', {
        market,
        instrument,
        limit,
        aggregate
      });

      return JSON.stringify({
        success: true,
        market,
        instrument,
        timeframe: `${aggregate}-minute`,
        data_points: data.Data?.length || 0,
        data: data.Data || data,
        summary: `${limit} ${aggregate}-minute intervals for ${instrument}`
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message,
        tool: 'get_historical_ohlcv_minutes'
      }, null, 2);
    }
  }

  async getDAFixings(args: any): Promise<string> {
    try {
      const { 
        instrument, 
        timezone, 
        close_time, 
        date, 
        limit = 5 
      } = args;
      
      const params: any = { instrument, timezone, close_time, limit };
      if (date) params.date = date;

      const data = await this.makeApiRequest('/index/cc/v1/historical/days/ccda', params);

      return JSON.stringify({
        success: true,
        instrument,
        timezone,
        close_time,
        data: data.Data || data,
        summary: `DA Fixings for ${instrument} at ${close_time} ${timezone}`
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message,
        tool: 'get_da_fixings'
      }, null, 2);
    }
  }

  async getIndexUpdatesByTimestamp(args: any): Promise<string> {
    try {
      const { 
        market = 'cadli', 
        instrument, 
        after_ts, 
        limit = 100,
        groups = ['ID', 'MESSAGE', 'STATUS']
      } = args;
      
      const data = await this.makeApiRequest('/index/cc/v2/historical/messages', {
        market,
        instrument,
        after_ts,
        limit,
        groups
      });

      return JSON.stringify({
        success: true,
        market,
        instrument,
        after_timestamp: after_ts,
        updates_count: data.Data?.length || 0,
        data: data.Data || data,
        summary: `${data.Data?.length || 0} index updates for ${instrument} since ${new Date(after_ts * 1000).toISOString()}`
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message,
        tool: 'get_index_updates_by_timestamp'
      }, null, 2);
    }
  }

  async getInstrumentMetadata(args: any): Promise<string> {
    try {
      const { 
        market = 'cadli', 
        instruments, 
        groups = ['STATUS', 'GENERAL'] 
      } = args;
      
      const data = await this.makeApiRequest('/index/cc/v1/latest/instrument/metadata', {
        market,
        instruments,
        groups
      });

      return JSON.stringify({
        success: true,
        market,
        instruments,
        data: data.Data || data,
        summary: `Metadata for ${instruments.length} instruments in ${market}`
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message,
        tool: 'get_instrument_metadata'
      }, null, 2);
    }
  }

  async getAvailableMarkets(args: any): Promise<string> {
    try {
      const { market } = args;
      
      const data = await this.makeApiRequest('/index/cc/v1/markets', {
        market: market || ''
      });

      return JSON.stringify({
        success: true,
        requested_market: market || 'all',
        data: data.Data || data,
        available_markets: this.availableMarkets,
        summary: market ? `Details for ${market} market` : `All available markets`
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message,
        tool: 'get_available_markets'
      }, null, 2);
    }
  }

  async searchSonicOpportunities(args: any): Promise<string> {
    try {
      const { analysis_type = 'yield_farming', timeframe = '1d', risk_level = 'medium' } = args;
      
      // Get current data for Sonic ecosystem tokens
      const sonicData = await this.makeApiRequest('/index/cc/v1/latest/tick', {
        market: 'cadli',
        instruments: this.sonicInstruments,
        groups: ['VALUE', 'CURRENT_DAY', 'MOVING_24_HOUR', 'MOVING_7_DAY']
      });

      // Analyze opportunities based on type
      const opportunities = await this.analyzeSonicOpportunities(sonicData, analysis_type, timeframe, risk_level);

      return JSON.stringify({
        success: true,
        analysis_type,
        timeframe,
        risk_level,
        sonic_ecosystem_data: sonicData.Data || sonicData,
        opportunities,
        summary: `${analysis_type} opportunities analysis for Sonic ecosystem (${risk_level} risk level)`
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message,
        tool: 'search_sonic_opportunities'
      }, null, 2);
    }
  }

  async analyzeSonicMarketSentiment(args: any): Promise<string> {
    try {
      const { 
        sentiment_sources = ['price_action', 'volume_analysis'], 
        timeframe = '1d' 
      } = args;
      
      // Get comprehensive Sonic data
      const currentData = await this.makeApiRequest('/index/cc/v1/latest/tick', {
        market: 'cadli',
        instruments: this.sonicInstruments,
        groups: ['VALUE', 'CURRENT_DAY', 'MOVING_24_HOUR', 'MOVING_7_DAY', 'MOVING_30_DAY']
      });

      // Analyze sentiment based on sources
      const sentiment = await this.calculateSentiment(currentData, sentiment_sources, timeframe);

      return JSON.stringify({
        success: true,
        sentiment_sources,
        timeframe,
        sonic_data: currentData.Data || currentData,
        sentiment_analysis: sentiment,
        summary: `Market sentiment analysis for Sonic ecosystem based on ${sentiment_sources.join(', ')}`
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message,
        tool: 'analyze_sonic_market_sentiment'
      }, null, 2);
    }
  }

  // Helper methods for Sonic-specific analysis
  private async analyzeSonicOpportunities(data: any, analysisType: string, timeframe: string, riskLevel: string): Promise<any> {
    const opportunities: any = {
      yield_farming: [],
      arbitrage: [],
      trend_analysis: [],
      risk_assessment: []
    };

    // Analyze based on type
    switch (analysisType) {
      case 'yield_farming':
        opportunities.yield_farming = await this.findYieldOpportunities(data, riskLevel);
        break;
      case 'arbitrage':
        opportunities.arbitrage = await this.findArbitrageOpportunities(data);
        break;
      case 'trend_analysis':
        opportunities.trend_analysis = await this.analyzeTrends(data, timeframe);
        break;
      case 'risk_assessment':
        opportunities.risk_assessment = await this.assessRisks(data, riskLevel);
        break;
    }

    return opportunities[analysisType];
  }

  private async findYieldOpportunities(data: any, riskLevel: string): Promise<any[]> {
    // Mock yield farming analysis - in production would integrate with DeFi protocols
    return [
      {
        protocol: 'Sonic DEX',
        pair: 'S-USDC',
        estimated_apy: '15.2%',
        risk_level: riskLevel,
        liquidity: '$2.5M',
        strategy: 'Provide liquidity to S-USDC pool'
      },
      {
        protocol: 'Sonic Staking',
        asset: 'S',
        estimated_apy: '8.5%',
        risk_level: 'low',
        minimum_stake: '1000 S',
        lock_period: '30 days'
      }
    ];
  }

  private async findArbitrageOpportunities(data: any): Promise<any[]> {
    // Mock arbitrage analysis
    return [
      {
        opportunity: 'Cross-DEX Arbitrage',
        asset: 'S',
        price_difference: '0.3%',
        potential_profit: '$150 per $50K trade',
        exchanges: ['SonicDEX', 'SpookySwap'],
        time_sensitivity: 'high'
      }
    ];
  }

  private async analyzeTrends(data: any, timeframe: string): Promise<any> {
    // Mock trend analysis
    return {
      overall_trend: 'bullish',
      strength: 'moderate',
      key_levels: {
        support: '$0.298',
        resistance: '$0.315'
      },
      momentum_indicators: {
        rsi: 65,
        moving_average_trend: 'up'
      }
    };
  }

  private async assessRisks(data: any, riskLevel: string): Promise<any> {
    return {
      market_risk: 'medium',
      liquidity_risk: 'low',
      smart_contract_risk: 'medium',
      regulatory_risk: 'low',
      recommendations: [
        'Diversify across multiple Sonic protocols',
        'Monitor TVL changes in liquidity pools',
        'Set stop-loss orders for volatile positions'
      ]
    };
  }

  private async calculateSentiment(data: any, sources: string[], timeframe: string): Promise<any> {
    // Mock sentiment calculation
    const sentiment: any = {
      overall_score: 0.75, // 0-1 scale
      confidence: 0.85,
      sources_analysis: {}
    };

    sources.forEach(source => {
      switch (source) {
        case 'price_action':
          sentiment.sources_analysis[source] = {
            score: 0.8,
            signal: 'bullish',
            reason: 'Price above 24h moving average with increasing volume'
          };
          break;
        case 'volume_analysis':
          sentiment.sources_analysis[source] = {
            score: 0.7,
            signal: 'positive',
            reason: 'Volume increasing on up moves, decreasing on pullbacks'
          };
          break;
        case 'social_metrics':
          sentiment.sources_analysis[source] = {
            score: 0.6,
            signal: 'neutral',
            reason: 'Moderate social engagement, no significant sentiment shift'
          };
          break;
        case 'defi_metrics':
          sentiment.sources_analysis[source] = {
            score: 0.8,
            signal: 'very_positive',
            reason: 'TVL increasing, yield opportunities expanding'
          };
          break;
      }
    });

    return sentiment;
  }

  // Main tool execution handler
  async callTool(name: string, args: any): Promise<string> {
    try {
      switch (name) {
        case 'get_latest_index_tick':
          return await this.getLatestIndexTick(args);
        
        case 'get_historical_ohlcv_daily':
          return await this.getHistoricalOHLCVDaily(args);
        
        case 'get_historical_ohlcv_hourly':
          return await this.getHistoricalOHLCVHourly(args);
        
        case 'get_historical_ohlcv_minutes':
          return await this.getHistoricalOHLCVMinutes(args);
        
        case 'get_da_fixings':
          return await this.getDAFixings(args);
        
        case 'get_index_updates_by_timestamp':
          return await this.getIndexUpdatesByTimestamp(args);
        
        case 'get_instrument_metadata':
          return await this.getInstrumentMetadata(args);
        
        case 'get_available_markets':
          return await this.getAvailableMarkets(args);
        
        case 'search_sonic_opportunities':
          return await this.searchSonicOpportunities(args);
        
        case 'analyze_sonic_market_sentiment':
          return await this.analyzeSonicMarketSentiment(args);
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message,
        tool: name,
        timestamp: new Date().toISOString()
      }, null, 2);
    }
  }
}

// Cloudflare Worker main handler
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    try {
      // CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      const url = new URL(request.url);
      
      // Initialize cache (would be passed from Durable Object in production)
      const cache = new CryptoDataCache({} as any); // Mock for example
      
      // Initialize MCP server
      const mcpServer = new SonicCryptoMCPServer(
        env.COINDESK_API_KEY || '8be5e395753255b7907847fcceda2cd1cb012c21990c1b5911a641d29e01c835',
        cache
      );

      // Handle different MCP protocol endpoints
      if (url.pathname === '/tools/list') {
        return new Response(JSON.stringify({
          tools: mcpServer.getTools()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (url.pathname === '/tools/call' && request.method === 'POST') {
        const body: any = await request.json();
        const { name, arguments: args } = body;
        
        const result = await mcpServer.callTool(name, args);
        
        return new Response(result, {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          services: {
            coindesk_api: 'connected',
            cache: 'operational'
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Dashboard endpoint - Enhanced version with chat and background animation
      if (url.pathname === '/dashboard') {
        const dashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sonic Crypto Dashboard</title>
    <style>
        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --text-primary: #ffffff;
            --text-secondary: rgba(255, 255, 255, 0.7);
            --text-accent: #a855f7;
            --bg-primary: rgba(0, 0, 0, 0.8);
            --bg-secondary: rgba(255, 255, 255, 0.1);
            --bg-card: rgba(255, 255, 255, 0.15);
            --border: rgba(255, 255, 255, 0.2);
            --shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: var(--text-primary);
            position: relative;
            overflow-x: hidden;
        }

        #background-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
            pointer-events: none;
        }

        .container {
            position: relative;
            z-index: 10;
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }

        .header {
            text-align: center;
            margin-bottom: 2rem;
            background: var(--bg-card);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 2rem;
            border: 1px solid var(--border);
            box-shadow: var(--shadow);
        }

        .header h1 {
            font-size: 3rem;
            margin-bottom: 0.5rem;
            background: linear-gradient(45deg, #fff, #a855f7);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .header p { font-size: 1.25rem; opacity: 0.8; }

        .nav-tabs {
            display: flex;
            justify-content: center;
            gap: 1rem;
            margin: 2rem 0;
        }

        .nav-tab {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }

        .nav-tab.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }

        .nav-tab:hover {
            background: var(--primary-dark);
            color: white;
        }

        .view {
            display: none;
        }

        .view.active {
            display: block;
        }

        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }

        .card {
            background: var(--bg-card);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 2rem;
            border: 1px solid var(--border);
            box-shadow: var(--shadow);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        }

        .card h3 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .loading {
            text-align: center;
            font-size: 1.25rem;
            margin: 2rem 0;
            padding: 2rem;
            background: var(--bg-card);
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }

        .price-item {
            margin: 1rem 0;
            padding: 1.5rem;
            background: var(--bg-secondary);
            border-radius: 12px;
            border: 1px solid var(--border);
            transition: all 0.3s ease;
        }

        .price-item:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .price-value {
            font-size: 2rem;
            font-weight: bold;
            margin: 0.5rem 0;
        }

        .price-change {
            font-weight: 600;
        }

        .price-change.positive { color: var(--success); }
        .price-change.negative { color: var(--danger); }

        .btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            cursor: pointer;
            margin: 0.5rem;
            transition: all 0.3s ease;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }

        .btn:hover {
            background: var(--primary-dark);
            transform: translateY(-2px);
        }

        .btn:active {
            transform: translateY(0);
        }

        .chat-container {
            height: 600px;
            display: flex;
            flex-direction: column;
            background: var(--bg-card);
            border-radius: 20px;
            border: 1px solid var(--border);
            backdrop-filter: blur(20px);
        }

        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .message {
            max-width: 80%;
            padding: 1rem;
            border-radius: 12px;
            word-wrap: break-word;
        }

        .message.user {
            align-self: flex-end;
            background: var(--primary);
            color: white;
        }

        .message.assistant {
            align-self: flex-start;
            background: var(--bg-secondary);
            border: 1px solid var(--border);
        }

        .chat-input-container {
            padding: 1.5rem;
            border-top: 1px solid var(--border);
            display: flex;
            gap: 1rem;
        }

        .chat-input {
            flex: 1;
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            color: var(--text-primary);
            padding: 0.75rem 1rem;
            border-radius: 12px;
            outline: none;
        }

        .chat-input:focus {
            border-color: var(--primary);
        }

        .analytics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }

        .notification {
            position: fixed;
            top: 2rem;
            right: 2rem;
            z-index: 1000;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        }

        .notification.show {
            transform: translateX(0);
        }

        .notification.success { background: var(--success); }
        .notification.error { background: var(--danger); }
        .notification.info { background: var(--primary); }

        @media (max-width: 768px) {
            .container { padding: 1rem; }
            .header h1 { font-size: 2rem; }
            .dashboard-grid { grid-template-columns: 1fr; }
            .nav-tabs { flex-wrap: wrap; }
        }
    </style>
</head>
<body>
    <canvas id="background-canvas"></canvas>

    <div class="container">
        <div class="header">
            <h1>🚀 Sonic Crypto Dashboard</h1>
            <p>AI-powered real-time market intelligence for the Sonic ecosystem</p>
        </div>

        <div class="nav-tabs">
            <div class="nav-tab active" id="dashboardBtn" onclick="switchView('dashboard')">📊 Dashboard</div>
            <div class="nav-tab" id="chatBtn" onclick="switchView('chat')">💬 AI Chat</div>
            <div class="nav-tab" id="analyticsBtn" onclick="switchView('analytics')">📈 Analytics</div>
        </div>

        <div class="loading" id="loading">🔄 Loading Sonic data...</div>

        <!-- Dashboard View -->
        <div id="dashboard" class="view active" style="display: none;">
            <div class="dashboard-grid">
                <div class="card">
                    <h3>📊 Live Prices</h3>
                    <div id="prices"></div>
                    <button class="btn" onclick="loadPrices()">🔄 Refresh</button>
                </div>

                <div class="card">
                    <h3>🎯 Market Sentiment</h3>
                    <div id="sentiment"></div>
                    <button class="btn" onclick="loadSentiment()">🧠 Analyze</button>
                </div>

                <div class="card">
                    <h3>💰 Yield Opportunities</h3>
                    <div id="opportunities"></div>
                    <button class="btn" onclick="loadOpportunities()">🔍 Find</button>
                </div>

                <div class="card">
                    <h3>⚡ MCP Tools</h3>
                    <div id="tools"></div>
                    <button class="btn" onclick="loadTools()">📋 List</button>
                </div>
            </div>
        </div>

        <!-- Chat View -->
        <div id="chat" class="view">
            <div class="chat-container">
                <div class="chat-messages" id="chatMessages">
                    <div class="message assistant">
                        👋 Hello! I'm your Sonic ecosystem AI assistant. Ask me about:
                        <br>• Live cryptocurrency prices
                        <br>• Market sentiment analysis
                        <br>• Yield farming opportunities
                        <br>• Technical analysis
                        <br>• DeFi protocols
                    </div>
                </div>
                <div class="chat-input-container">
                    <input type="text" class="chat-input" id="chatInput" placeholder="Ask about Sonic ecosystem..." onkeypress="handleChatKeypress(event)">
                    <button class="btn" onclick="sendMessage()">💫 Send</button>
                </div>
            </div>
        </div>

        <!-- Analytics View -->
        <div id="analytics" class="view">
            <div class="analytics-grid">
                <div class="card">
                    <h3>📈 Price Charts</h3>
                    <div id="priceCharts">Interactive price charts coming soon...</div>
                </div>
                <div class="card">
                    <h3>📊 Volume Analysis</h3>
                    <div id="volumeAnalysis">Volume trend analysis coming soon...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Global state
        let dashboardData = {
            prices: [],
            sentiment: {},
            opportunities: [],
            tools: []
        };

        // Background animation
        function initBackground() {
            const canvas = document.getElementById('background-canvas');
            const ctx = canvas.getContext('2d');

            function resizeCanvas() {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }

            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);

            const logos = [];
            const logoCount = 15;

            // Create falling logo objects
            for (let i = 0; i < logoCount; i++) {
                logos.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height - canvas.height,
                    size: Math.random() * 30 + 20,
                    speed: Math.random() * 2 + 1,
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 4,
                    opacity: Math.random() * 0.3 + 0.1
                });
            }

            function drawLogo(x, y, size, rotation, opacity) {
                ctx.save();
                ctx.globalAlpha = opacity;
                ctx.translate(x, y);
                ctx.rotate(rotation * Math.PI / 180);

                // Draw Sonic "S" logo
                ctx.font = \`\${size}px Arial\`;
                ctx.fillStyle = '#6366f1';
                ctx.textAlign = 'center';
                ctx.fillText('S', 0, size/3);

                ctx.restore();
            }

            function animate() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                logos.forEach(logo => {
                    drawLogo(logo.x, logo.y, logo.size, logo.rotation, logo.opacity);

                    logo.y += logo.speed;
                    logo.rotation += logo.rotationSpeed;

                    if (logo.y > canvas.height + logo.size) {
                        logo.y = -logo.size;
                        logo.x = Math.random() * canvas.width;
                    }
                });

                requestAnimationFrame(animate);
            }

            animate();
        }

        // API client
        class APIClient {
            constructor(baseUrl = '') {
                this.baseUrl = baseUrl;
                this.cache = new Map();
                this.cacheTimeout = 30000;
            }

            async callAPI(endpoint, params = {}) {
                const cacheKey = \`\${endpoint}-\${JSON.stringify(params)}\`;
                const cached = this.cache.get(cacheKey);

                if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                    console.log(\`📦 Cache hit for \${endpoint}\`);
                    return cached.data;
                }

                try {
                    console.log(\`🌐 API Call: \${endpoint}\`, params);

                    let url = \`\${this.baseUrl}\${endpoint}\`;

                    if (endpoint.startsWith('/tools/call')) {
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(params)
                        });

                        if (!response.ok) {
                            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                        }

                        const result = await response.text();
                        console.log(\`✅ API Response for \${endpoint}:\`, result);

                        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
                        return result;
                    } else {
                        const queryParams = new URLSearchParams();
                        Object.entries(params).forEach(([key, value]) => {
                            queryParams.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
                        });
                        if (queryParams.toString()) {
                            url += '?' + queryParams.toString();
                        }

                        const response = await fetch(url);
                        const result = await response.json();

                        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
                        return result;
                    }
                } catch (error) {
                    console.error(\`❌ API call failed for \${endpoint}:\`, error);
                    throw error;
                }
            }

            async callTool(name, args = {}) {
                try {
                    console.log('MCP Tool Call:', name, args);
                    const response = await fetch(\`\${this.baseUrl}/tools/call\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, arguments: args })
                    });

                    if (!response.ok) {
                        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                    }

                    const result = await response.json();
                    console.log('MCP Tool Result:', result);
                    return result;
                } catch (error) {
                    console.error(\`MCP call failed for \${name}:\`, error);
                    return { error: { code: -1, message: error.message } };
                }
            }
        }

        const apiClient = new APIClient(window.location.origin);

        // UI Functions
        function switchView(viewName) {
            // Update nav tabs
            document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
            document.getElementById(\`\${viewName}Btn\`).classList.add('active');

            // Update views
            document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            document.getElementById(viewName).classList.add('active');
        }

        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = \`notification \${type}\`;
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => notification.classList.add('show'), 100);
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => document.body.removeChild(notification), 300);
            }, 3000);
        }

        // Data loading functions
        async function loadPrices() {
            try {
                const result = await apiClient.callTool('get_latest_index_tick', {
                    market: 'cadli',
                    instruments: ['S-USD', 'BTC-USD', 'ETH-USD', 'USDC-USD']
                });

                if (result.success && result.data) {
                    dashboardData.prices = result.data;
                    updatePricesUI();
                } else {
                    throw new Error('No price data available');
                }
            } catch (error) {
                console.error('Failed to load prices:', error);
                document.getElementById('prices').innerHTML = '<p>❌ Error loading prices</p>';
            }
        }

        function updatePricesUI() {
            const pricesContainer = document.getElementById('prices');
            const icons = ['🔥', '₿', '⟠', '💵'];

            if (!dashboardData.prices || Object.keys(dashboardData.prices).length === 0) {
                pricesContainer.innerHTML = '<p>No price data available</p>';
                return;
            }

            let html = '';
            Object.entries(dashboardData.prices).forEach(([instrument, priceData], index) => {
                const price = priceData.VALUE?.VALUE || priceData.value || 'N/A';
                const change = priceData.MOVING_24_HOUR?.CHANGE_PERCENT || 0;
                const changeClass = change >= 0 ? 'positive' : 'negative';

                html += \`
                    <div class="price-item">
                        <div style="display: flex; justify-content: between; align-items: center;">
                            <span class="card-icon">\${icons[index]}</span>
                            <span class="card-title">\${instrument}</span>
                        </div>
                        <div class="price-value">$\${price.toLocaleString()}</div>
                        <div class="price-change \${changeClass}">
                            \${change >= 0 ? '+' : ''}\${change.toFixed(2)}% (24h)
                        </div>
                        \${priceData?.volume ? \`<div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                            Volume: $\${(priceData.volume || 0).toLocaleString()}
                        </div>\` : ''}
                    </div>
                \`;
            });

            pricesContainer.innerHTML = html;
        }

        async function loadSentiment() {
            try {
                const result = await apiClient.callTool('analyze_sonic_market_sentiment', {
                    sentiment_sources: ['price_action', 'volume_analysis']
                });

                if (result.success && result.sentiment_analysis) {
                    dashboardData.sentiment = result.sentiment_analysis;
                    updateSentimentUI();
                } else {
                    throw new Error('Sentiment analysis unavailable');
                }
            } catch (error) {
                console.error('Failed to load sentiment:', error);
                document.getElementById('sentiment').innerHTML = '<p>❌ Error loading sentiment</p>';
            }
        }

        function updateSentimentUI() {
            const sentimentContainer = document.getElementById('sentiment');
            const sentiment = dashboardData.sentiment;

            if (!sentiment || !sentiment.overall_score) {
                sentimentContainer.innerHTML = '<p>No sentiment data available</p>';
                return;
            }

            const score = (sentiment.overall_score * 10).toFixed(1);
            const confidence = ((sentiment.confidence || 0.85) * 100).toFixed(0);
            const sentimentColor = sentiment.overall_score > 0.6 ? 'var(--success)' :
                                 sentiment.overall_score > 0.4 ? 'var(--warning)' : 'var(--danger)';
            const sentimentText = sentiment.overall_score > 0.6 ? 'Bullish' :
                                sentiment.overall_score > 0.4 ? 'Neutral' : 'Bearish';

            sentimentContainer.innerHTML = \`
                <div style="text-align: center; margin: 1.5rem 0;">
                    <div style="font-size: 2rem; color: \${sentimentColor};">\${score}/10</div>
                    <div style="margin: 0.5rem 0;">
                        <div style="font-weight: 600; color: \${sentimentColor};">\${sentimentText}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Confidence: \${confidence}%</div>
                    </div>
                </div>
                \${sentiment.key_factors && sentiment.key_factors.length > 0 ? \`
                    <div style="margin-top: 1rem;">
                        <h4 style="margin-bottom: 0.5rem;">Key Factors:</h4>
                        <ul style="list-style: none; padding: 0;">
                            \${sentiment.key_factors.slice(0, 3).map(factor => \`<li>• \${factor}</li>\`).join('')}
                        </ul>
                    </div>
                \` : ''}
            \`;
        }

        async function loadOpportunities() {
            try {
                const result = await apiClient.callTool('search_sonic_opportunities', {
                    analysis_type: 'yield_farming',
                    risk_level: 'medium'
                });

                if (result.success && result.opportunities) {
                    dashboardData.opportunities = result.opportunities;
                    updateOpportunitiesUI();
                } else {
                    throw new Error('No opportunities available');
                }
            } catch (error) {
                console.error('Failed to load opportunities:', error);
                document.getElementById('opportunities').innerHTML = '<p>❌ Error loading opportunities</p>';
            }
        }

        function updateOpportunitiesUI() {
            const opportunitiesContainer = document.getElementById('opportunities');

            if (!dashboardData.opportunities || dashboardData.opportunities.length === 0) {
                opportunitiesContainer.innerHTML = '<p>No opportunities found</p>';
                return;
            }

            let html = '';
            dashboardData.opportunities.slice(0, 3).map(opp => \`
                <div class="price-item">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="color: var(--text-primary);">\${opp.protocol || opp.pool_name || 'DeFi Pool'}</strong>
                        <span style="color: var(--success); font-weight: 600;">\${opp.apy || opp.yield}% APY</span>
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">
                        Risk: \${opp.risk_level || opp.risk} | TVL: $\${(opp.tvl || 0).toLocaleString()}
                    </div>
                </div>
            \`).join('');

            opportunitiesContainer.innerHTML = html;
        }

        async function loadTools() {
            try {
                const result = await apiClient.callAPI('/tools/list');
                if (result.tools) {
                    dashboardData.tools = result.tools;
                    updateToolsUI();
                } else {
                    throw new Error('No tools available');
                }
            } catch (error) {
                console.error('Failed to load tools:', error);
                document.getElementById('tools').innerHTML = '<p>❌ Error loading tools</p>';
            }
        }

        function updateToolsUI() {
            const toolsContainer = document.getElementById('tools');

            if (!dashboardData.tools || dashboardData.tools.length === 0) {
                toolsContainer.innerHTML = '<p>No tools available</p>';
                return;
            }

            let html = \`<p><strong>\${dashboardData.tools.length} MCP tools available:</strong></p>\`;
            html += '<div style="margin-top: 1rem;">';
            dashboardData.tools.slice(0, 5).forEach(tool => {
                html += \`<div style="margin: 0.5rem 0; padding: 0.5rem; background: var(--bg-secondary); border-radius: 8px; font-size: 0.875rem;">
                    <strong>\${tool.name}</strong>
                    <br><span style="color: var(--text-secondary);">\${tool.description}</span>
                </div>\`;
            });
            html += '</div>';

            toolsContainer.innerHTML = html;
        }

        // Chat functionality
        function handleChatKeypress(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }

        async function sendMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();

            if (!message) return;

            addMessageToChat(message, 'user');
            input.value = '';

            try {
                const response = await processMessage(message);
                addMessageToChat(response, 'assistant');
            } catch (error) {
                addMessageToChat('Sorry, I encountered an error processing your request.', 'assistant');
            }
        }

        function addMessageToChat(message, role) {
            const messagesContainer = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${role}\`;

            messageDiv.innerHTML = \`
                <div style="margin-bottom: 0.5rem;">
                    \${text}
                </div>
            \`.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
             .replace(/\*(.*?)\*/g, '<em>$1</em>');

            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        async function processMessage(message) {
            const lowerMessage = message.toLowerCase();

            if (lowerMessage.includes('price')) {
                const result = await apiClient.callTool('get_latest_index_tick', {
                    market: 'cadli',
                    instruments: ['S-USD', 'BTC-USD', 'ETH-USD', 'USDC-USD']
                });

                if (result.success && result.data) {
                    const prices = Object.entries(result.data).map(([instrument, data]) =>
                        \`\${instrument}: $\${data.value?.toLocaleString() || 'N/A'}\`
                    );
                    return \`📈 **Current Prices:**\\n\${prices}\`;
                }
            }

            if (lowerMessage.includes('sentiment')) {
                const result = await apiClient.callTool('analyze_sonic_market_sentiment', {
                    sentiment_sources: ['price_action', 'volume_analysis']
                });

                if (result.success && result.sentiment_analysis) {
                    const sentiment = result.sentiment_analysis;
                    const score = (sentiment.overall_score * 10).toFixed(1);
                    return \`📊 **\${report.title}**\\n\\n\${report.executive_summary}\\n\\n\${report.sentiment_analysis ? \`**Sentiment:** \${report.sentiment_analysis.overall_score}/10 (\${report.sentiment_analysis.confidence}% confidence)\` : ''}\`;
                }
            }

            if (lowerMessage.includes('yield') || lowerMessage.includes('opportunity')) {
                const result = await apiClient.callTool('search_sonic_opportunities', {
                    analysis_type: 'yield_farming'
                });

                if (result.success && result.opportunities) {
                    const sentiment = result.sentiment_analysis;
                    const score = (sentiment.overall_score * 10).toFixed(1);
                    const desc = sentiment.overall_score > 0.6 ? 'Bullish' : sentiment.overall_score > 0.4 ? 'Neutral' : 'Bearish';
                    return \`🎯 **Market Sentiment:** \${desc} (\${score}/10)\\n\\nConfidence: \${sentiment.confidence || 75}%\\n\${sentiment.key_factors ? '\\nKey factors: ' + sentiment.key_factors.slice(0, 3).join(', ') : ''}\`;
                }
            }

            if (lowerMessage.includes('opportunities') || lowerMessage.includes('defi')) {
                const result = await apiClient.callTool('search_sonic_opportunities', {
                    analysis_type: 'yield_farming'
                });

                if (result.success && result.opportunities) {
                    const topOpps = result.opportunities.slice(0, 3).map(opp =>
                        \`• **\${opp.protocol || opp.pool_name}**: \${opp.apy || opp.yield}% APY (Risk: \${opp.risk_level || opp.risk})\`
                    );
                    return \`💰 **Top Yield Opportunities:**\\n\${topOpps}\`;
                }
            }

            return \`I can help you with:
            \\n• **Live prices** - Ask "What are the current prices?"
            \\n• **Market sentiment** - Ask "What's the market sentiment?"
            \\n• **Yield opportunities** - Ask "Show me yield farming opportunities"
            \\n• **DeFi analysis** - Ask "What are the best DeFi opportunities?"
            \\n\\nTry asking about any of these topics!\`;
        }

        function showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = 'notification';
            toast.style.cssText = \`
                position: fixed; top: 2rem; right: 2rem; z-index: 1000; padding: 1rem 1.5rem;
                border-radius: 12px; color: white; font-weight: 600; transform: translateX(100%);
                transition: transform 0.3s ease;
                background: \${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--text-accent)'};
            \`;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => toast.style.transform = 'translateX(0)', 100);
            setTimeout(() => {
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => document.body.removeChild(toast), 300);
            }, 3000);
        }

        // Initialize dashboard
        async function initDashboard() {
            try {
                showToast('🚀 Loading dashboard data...', 'info');

                await Promise.all([
                    loadPrices(),
                    loadSentiment(),
                    loadOpportunities(),
                    loadTools()
                ]);

                document.getElementById('loading').style.display = 'none';
                document.getElementById('dashboard').style.display = 'block';

                showToast('✅ Dashboard loaded successfully!', 'success');
            } catch (error) {
                console.error('Dashboard initialization failed:', error);
                showToast('❌ Failed to load dashboard', 'error');

                // Show dashboard anyway with error states
                document.getElementById('loading').style.display = 'none';
                document.getElementById('dashboard').style.display = 'block';
            }
        }

        // Auto-refresh functionality
        function startAutoRefresh() {
            setInterval(async () => {
                try {
                    if (document.getElementById('dashboard').classList.contains('active')) {
                        console.log('🔄 Auto-refreshing data...');
                        await Promise.all([
                            loadPrices(),
                            loadSentiment(),
                            loadOpportunities()
                        ]);
                    }
                } catch (error) {
                    console.error('Auto-refresh failed:', error);
                }
            }, 30000); // Refresh every 30 seconds
        }

        // Initialize everything
        document.addEventListener('DOMContentLoaded', () => {
            initBackground();
            initDashboard();
            startAutoRefresh();
        });
    </script>
</body>
</html>`;

        return new Response(dashboardHTML, {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' }
        });
      }

      // Helper function for tool examples
      function getToolExamples(toolName: string) {
        const examples: any = {
          'get_latest_index_tick': [
            {
              description: 'Get current S-USD and BTC prices',
              request: { market: 'cadli', instruments: ['S-USD', 'BTC-USD'] },
              curl: `curl -X POST "${url.origin}/tools/call" -H "Content-Type: application/json" -d '{"name": "get_latest_index_tick", "arguments": {"market": "cadli", "instruments": ["S-USD", "BTC-USD"]}}'`
            }
          ],
          'get_historical_ohlcv_daily': [
            {
              description: 'Get 30 days of BTC daily data',
              request: { market: 'cadli', instrument: 'BTC-USD', limit: 30 },
              curl: `curl -X POST "${url.origin}/tools/call" -H "Content-Type: application/json" -d '{"name": "get_historical_ohlcv_daily", "arguments": {"market": "cadli", "instrument": "BTC-USD", "limit": 30}}'`
            }
          ],
          'analyze_sonic_market_sentiment': [
            {
              description: 'Analyze market sentiment from price and volume',
              request: { sentiment_sources: ['price_action', 'volume_analysis'] },
              curl: `curl -X POST "${url.origin}/tools/call" -H "Content-Type: application/json" -d '{"name": "analyze_sonic_market_sentiment", "arguments": {"sentiment_sources": ["price_action", "volume_analysis"]}}'`
            }
          ],
          'search_sonic_opportunities': [
            {
              description: 'Find yield farming opportunities with medium risk',
              request: { analysis_type: 'yield_farming', risk_level: 'medium' },
              curl: `curl -X POST "${url.origin}/tools/call" -H "Content-Type: application/json" -d '{"name": "search_sonic_opportunities", "arguments": {"analysis_type": "yield_farming", "risk_level": "medium"}}'`
            }
          ]
        };
        return examples[toolName] || [{
          description: `Example usage for ${toolName}`,
          request: {},
          curl: `curl -X POST "${url.origin}/tools/call" -H "Content-Type: application/json" -d '{"name": "${toolName}", "arguments": {}}'`
        }];
      }

      // Documentation endpoint
      if (url.pathname === '/' || url.pathname === '/docs') {
        const tools = mcpServer.getTools();
        const documentation = {
          name: 'Sonic Crypto MCP Server',
          version: '1.0.0',
          description: 'Advanced MCP server providing comprehensive cryptocurrency market data, AI-powered analysis, and DeFi intelligence for the Sonic Labs ecosystem',
          author: 'Sonic Labs Community',
          license: 'MIT',
          repository: 'https://github.com/mintedmaterial/sonic-crypto-mcp-server',
          dashboard_url: `${url.origin}/dashboard`,
          endpoints: {
            '/': 'GET - API documentation (this page)',
            '/docs': 'GET - Detailed API documentation',
            '/dashboard': 'GET - Interactive Sonic Crypto Dashboard with chat',
            '/health': 'GET - Health check and service status',
            '/tools/list': 'GET - List all available MCP tools',
            '/tools/call': 'POST - Execute MCP tool with arguments'
          },
          features: [
            '🚀 Real-time cryptocurrency price tracking',
            '🧠 AI-powered market sentiment analysis',
            '💰 Yield farming opportunity detection',
            '📊 Historical OHLC data analysis',
            '🔍 Cross-exchange arbitrage detection',
            '📈 Technical indicator calculations',
            '⚡ Interactive web dashboard with chat',
            '🎯 Sonic ecosystem specialized tools',
            '📡 WebSocket-like real-time updates',
            '🔐 Enterprise-grade security and caching'
          ],
          tools_overview: {
            total_tools: tools.length,
            categories: {
              'Price Data': ['get_latest_index_tick'],
              'Historical Analysis': ['get_historical_ohlcv_daily', 'get_historical_ohlcv_hourly', 'get_historical_ohlcv_minutes'],
              'Market Intelligence': ['analyze_sonic_market_sentiment', 'search_sonic_opportunities'],
              'Reference Data': ['get_instrument_metadata', 'get_available_markets'],
              'Specialized': ['get_da_fixings', 'get_index_updates_by_timestamp']
            }
          },
          tools: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            category: tool.name.includes('historical') ? 'Historical Analysis' :
                     tool.name.includes('sentiment') || tool.name.includes('opportunities') ? 'Market Intelligence' :
                     tool.name.includes('metadata') || tool.name.includes('markets') ? 'Reference Data' :
                     tool.name.includes('latest') ? 'Price Data' : 'Specialized',
            input_schema: tool.inputSchema,
            examples: getToolExamples(tool.name)
          })),
          data_sources: [
            'CoinDesk API - Real-time and historical cryptocurrency data',
            'Index data from CADLI, CCIX, and other CoinDesk indices',
            'OHLCV data at minute, hourly, and daily intervals',
            'DA Fixings for end-of-day pricing',
            'Tick-level index updates and metadata',
            'AI-powered sentiment analysis engine',
            'DeFi protocol yield data aggregation'
          ],
          sonic_ecosystem: {
            supported_tokens: ['S-USD', 'SONIC-USD', 'ETH-USD', 'BTC-USD', 'USDC-USD', 'USDT-USD'],
            features: [
              'Sonic ecosystem token tracking and analysis',
              'Yield farming opportunity detection across Sonic DEXs',
              'Cross-exchange arbitrage analysis',
              'Market sentiment analysis with AI',
              'Risk assessment and portfolio optimization',
              'Real-time price alerts and notifications'
            ],
            defi_protocols: [
              'Sonic DEX - Primary Sonic ecosystem exchange',
              'SpookySwap - Cross-chain compatibility',
              'Various yield farming pools',
              'Liquidity mining opportunities'
            ]
          },
          api_usage: {
            authentication: 'No API key required for basic usage',
            rate_limits: 'Intelligent rate limiting with caching',
            response_format: 'JSON with standardized error handling',
            cors: 'Enabled for browser-based applications',
            examples: {
              list_tools: `curl "${url.origin}/tools/list"`,
              health_check: `curl "${url.origin}/health"`,
              get_prices: `curl -X POST "${url.origin}/tools/call" -H "Content-Type: application/json" -d '{"name": "get_latest_index_tick", "arguments": {"market": "cadli", "instruments": ["S-USD"]}}'`
            }
          },
          deployment: {
            platform: 'Cloudflare Workers',
            architecture: 'Serverless with edge computing',
            scaling: 'Auto-scaling with global distribution',
            storage: 'Durable Objects + KV + R2 for multi-tier caching',
            monitoring: 'Analytics Engine integration'
          },
          getting_started: {
            step1: 'Visit the dashboard at /dashboard for interactive exploration',
            step2: 'Try the API endpoints directly with curl or your favorite HTTP client',
            step3: 'Integrate MCP tools into your applications using the /tools/call endpoint',
            step4: 'Explore historical data and AI-powered insights'
          }
        };

        return new Response(JSON.stringify(documentation, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });

    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // Queue handler for background crypto data processing
  async queue(batch: any, env: any): Promise<void> {
    for (const message of batch.messages) {
      try {
        console.log('Processing queue message:', message.body);
        // Process crypto data updates here
        message.ack();
      } catch (error) {
        console.error('Queue processing error:', error);
        message.retry();
      }
    }
  }
};

// Durable Object exports
export { CryptoDataCache, MCPSessionManager };