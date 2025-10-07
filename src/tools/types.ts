// Shared types for Sonic Crypto MCP Server tools

export interface Env {
  AI: Ai;
  SONIC_CACHE: KVNamespace;
  API_RATE_LIMIT: KVNamespace;
  CRYPTO_CACHE: DurableObjectNamespace;
  MCP_SESSION: DurableObjectNamespace;
  HISTORICAL_DATA: R2Bucket;
  MARKET_REPORTS: R2Bucket;
  CONFIG_DB: D1Database;
  ANALYTICS: AnalyticsEngineDataset;
  CRYPTO_QUEUE: Queue;
  COINDESK_API_KEY: string;
  AI_GATEWAY_TOKEN?: string;
  ANTHROPIC_API_KEY?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  summary?: string;
  timestamp?: string;
}

export interface CoinDeskPriceData {
  INSTRUMENT: string;
  VALUE: {
    PRICE: number;
    CHANGE: number;
    CHANGE_PERCENTAGE: number;
  };
  CURRENT_DAY: {
    OPEN: number;
    HIGH: number;
    LOW: number;
    CHANGE_PERCENTAGE: number;
  };
}

export interface SentimentAnalysis {
  overall: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  observations: string[];
  risk_factors: string[];
  news_summary?: string[];
}
