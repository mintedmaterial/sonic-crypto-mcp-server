// Environment and Cloudflare bindings configuration

export interface Env {
  // AI Bindings
  AI: Ai;

  // Static Assets for React Dashboard (optional - only when React app is built)
  ASSETS?: Fetcher;

  // KV Namespaces
  SONIC_CACHE: KVNamespace;
  API_RATE_LIMIT: KVNamespace;

  // Browser Rendering
  BROWSER?: Fetcher;

  // Durable Objects - Core
  CRYPTO_CACHE: DurableObjectNamespace;
  MCP_SESSION: DurableObjectNamespace;

  // Durable Objects - AI Agents
  OVERVIEW_AGENT: DurableObjectNamespace;
  CHARTS_AGENT: DurableObjectNamespace;
  TRADING_AGENT: DurableObjectNamespace;
  INTELLIGENCE_AGENT: DurableObjectNamespace;
  CHAT_AGENT: DurableObjectNamespace;

  // Cloudflare Containers
  CHARTS_CONTAINER: DurableObjectNamespace; // Python ML container for technical analysis

  // R2 Buckets
  HISTORICAL_DATA: R2Bucket;
  MARKET_REPORTS: R2Bucket;
  FINANCIAL_PDF_KNOWLEDGE: R2Bucket;

  // D1 Database
  CONFIG_DB: D1Database;

  // Analytics Engine
  ANALYTICS: AnalyticsEngineDataset;

  // Queue
  CRYPTO_QUEUE: Queue;

  // Workflows
  DATA_UPDATE_WORKFLOW?: Workflow;
  DATA_SEEDING_WORKFLOW?: Workflow;
  CHART_ANALYSIS_WORKFLOW?: Workflow;
  REPORT_GENERATION_WORKFLOW?: Workflow;
  TRADE_APPROVAL_WORKFLOW?: Workflow;
  SOCIAL_INGESTION_WORKFLOW?: Workflow;

  // Pipelines
  DISCORD_NFT_PIPELINE?: any; // Pipeline from cloudflare:pipelines
  DISCORD_TWITTER_PIPELINE?: any; // Pipeline from cloudflare:pipelines

  // Secrets
  COINDESK_API_KEY: string;
  BRAVE_API_KEY: string;
  COINMARKETCAP_API_KEY: string;
  DISCORD_BOT_TOKEN: string;
  DRPC_API_KEY: string;
  AI_GATEWAY_TOKEN?: string;
  ANTHROPIC_API_KEY?: string;

  // Environment Variables (from wrangler.toml [vars])
  NFT_DISCORD_CHANNEL_ID: string;
  TWEET_DISCORD_CHANNEL_ID: string;
  BANDIT_KIDZ_CONTRACT: string;
  PAINTSWAP_COLLECTION_URL: string;
  DRPC_HTTP_URL: string;
  MAX_CHART_CONTAINERS?: string; // Maximum Charts Agent container instances
}

export const CACHE_TTL = {
  REALTIME: 10,      // 10 seconds for real-time data
  MINUTES: 60,       // 1 minute for minute data
  HOURLY: 300,       // 5 minutes for hourly data
  DAILY: 3600,       // 1 hour for daily data
  WEEKLY: 86400,     // 1 day for weekly data
} as const;

export const API_ENDPOINTS = {
  COINDESK_BASE: 'https://production.api.coindesk.com/v2',
  INDEX_VALUES: '/indices/values',
  HISTORICAL_DAYS: '/index/cc/v1/historical/days',
  HISTORICAL_HOURS: '/index/cc/v1/historical/hours',
  HISTORICAL_MINUTES: '/index/cc/v1/historical/minutes',
  ORDERLY_BASE: 'https://api.orderly.org',
  DEXSCREENER_BASE: 'https://api.dexscreener.com',
  BRAVE_SEARCH: 'https://api.search.brave.com/res/v1/web/search',
} as const;

export const DEFAULT_INSTRUMENTS = [
  'BTC-USD',
  'ETH-USD',
  'S-USD',
  'SONIC-USD',
  'USDC-USD',
  'USDT-USD',
] as const;

export const DEFAULT_MARKET = 'cadli' as const;
