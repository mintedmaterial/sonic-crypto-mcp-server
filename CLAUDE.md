# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Sonic Crypto MCP Server** - an advanced Model Context Protocol server built as a Cloudflare Worker that provides comprehensive cryptocurrency market data and AI-powered analysis tools, with special focus on the Sonic Labs ecosystem.

## Architecture

### Core Components

- **SonicCryptoMCPServer** (`src/index.ts:132-1135`): Main MCP server class with AI integration, R2 storage, and analytics
- **CryptoDataCache** (`src/index.ts:98-130`): Enhanced Durable Object for multi-tier caching with persistent storage
- **MCPSessionManager** (`src/index.ts:59-96`): Durable Object for managing MCP client sessions
- **Cloudflare Worker Handler** (`src/index.ts:1153-1301`): Main fetch handler with full MCP protocol support and direct API access

### Advanced Features

- **AI-Powered Analysis**: Uses Cloudflare AI (Llama 3.1-8b) for market sentiment and opportunity analysis
- **Multi-Tier Storage**: KV caching, R2 historical data storage, D1 configuration database
- **Analytics Integration**: Real-time usage tracking with Analytics Engine
- **Queue Processing**: Background crypto data processing with Queues
- **Session Management**: Persistent MCP session handling

### Data Sources & APIs

- **CoinDesk API**: Real-time and historical cryptocurrency index data
- **Supported Markets**: CADLI (main), CCIX, CCIXBE, CD_MC, SDA indices
- **Sonic Instruments**: S-USD, ETH-USD, BTC-USD, USDC-USD, USDT-USD
- **AI Analysis**: Sentiment analysis, yield farming opportunities, arbitrage detection

## Development Commands

### Setup & Dependencies
```bash
# Install dependencies
npm install

# Generate TypeScript types for Cloudflare bindings
npm run setup
# or directly: wrangler types
```

### Development
```bash
# Start local development server with hot reload
npm run dev
# or: wrangler dev

# Build TypeScript
npm run build

# Type checking (no output)
npm run lint
```

### Deployment
```bash
# Deploy to default environment
npm run deploy

# Deploy to staging
npm run deploy:staging

# Deploy to production  
npm run deploy:prod

# View real-time logs
npm run tail
```

### Required Secrets
Set these secrets before deployment:
```bash
wrangler secret put COINDESK_API_KEY
wrangler secret put AI_GATEWAY_TOKEN  # Optional for AI Gateway
wrangler secret put ANTHROPIC_API_KEY  # Optional for alternative AI
```

## API Endpoints

### MCP Protocol Endpoints
- `POST /mcp/initialize` - Initialize MCP session
- `GET /mcp/tools/list` - List available MCP tools
- `POST /mcp/tools/call` - Execute MCP tool

### Direct API Access
- `GET|POST /api/price` - Latest cryptocurrency prices
- `GET|POST /api/historical-daily` - Daily OHLCV data
- `GET|POST /api/historical-hourly` - Hourly OHLCV data
- `GET|POST /api/historical-minutes` - Minute-level OHLCV data
- `GET|POST /api/fixings` - End-of-day price fixings
- `GET|POST /api/updates` - Real-time index updates
- `GET|POST /api/metadata` - Instrument metadata
- `GET|POST /api/markets` - Available markets info
- `GET|POST /api/opportunities` - AI-powered opportunity analysis
- `GET|POST /api/sentiment` - AI-powered sentiment analysis

### Utility Endpoints
- `GET /health` - Health check with service status
- `GET /` or `/docs` - API documentation

### Legacy Compatibility
- `GET /tools/list` - Legacy MCP tools list
- `POST /tools/call` - Legacy MCP tool execution

## MCP Tools Available

1. **get_latest_index_tick**: Real-time cryptocurrency index data with OHLC metrics
2. **get_historical_ohlcv_daily**: Historical daily OHLCV data (up to 5000 points)
3. **get_historical_ohlcv_hourly**: Historical hourly data for intraday analysis
4. **get_historical_ohlcv_minutes**: Minute-by-minute data for high-frequency analysis
5. **get_da_fixings**: CoinDesk Digital Asset Fixings for end-of-day pricing
6. **get_index_updates_by_timestamp**: Tick-level index updates from specific timestamps
7. **get_instrument_metadata**: Comprehensive metadata about financial instruments
8. **get_available_markets**: Information about available cryptocurrency indices
9. **search_sonic_opportunities**: AI-powered analysis of Sonic ecosystem opportunities
10. **analyze_sonic_market_sentiment**: AI-powered market sentiment analysis

## Cloudflare Bindings Configuration

### AI & Analytics
- `AI`: Cloudflare AI binding for LLM analysis
- `AI_GATEWAY`: AI Gateway for enhanced AI operations
- `ANALYTICS`: Analytics Engine for usage tracking

### Storage
- `HISTORICAL_DATA`: R2 bucket for historical cryptocurrency data
- `SONIC_CACHE`: KV namespace for fast API response caching
- `API_RATE_LIMIT`: KV namespace for rate limiting
- `CONFIG_DB`: D1 database for configuration and metadata

### Processing
- `CRYPTO_QUEUE`: Queue for background cryptocurrency data processing
- `CRYPTO_CACHE`: Durable Object for advanced caching
- `MCP_SESSION`: Durable Object for MCP session management

## Key Implementation Details

### AI Integration
- Uses `@cf/meta/llama-3.1-8b-instruct` for market analysis
- Automatic fallback to raw data if AI unavailable
- Structured prompts for cryptocurrency domain expertise

### Multi-Tier Caching
- L1: In-memory Map cache (fastest)
- L2: Durable Object storage (persistent)
- L3: R2 storage for historical data (long-term)
- Dynamic TTL: real-time (10s), minutes (60s), hourly (5m), daily (1h)

### Error Handling & Observability
- Comprehensive error responses with structured JSON
- Analytics logging for all API calls
- Health checks for all service dependencies
- Automatic retry logic for external APIs

### Direct API Features
- Query parameter parsing with automatic JSON detection
- Support for both GET (query params) and POST (JSON body) requests
- CORS enabled for browser-based applications
- Rate limiting via KV namespace

### Sonic Ecosystem Specialization
- Hardcoded instruments: S-USD, SONIC-USD, ETH-USD, BTC-USD, USDC-USD, USDT-USD
- AI-powered yield farming opportunity detection
- Cross-DEX arbitrage analysis
- Risk assessment with multiple risk levels
- Social sentiment integration capabilities

## Environment Variables

### Build-time Variables (wrangler.toml)
- `API_VERSION`: "1.0.0"
- `ENVIRONMENT`: Current deployment environment
- `MCP_SERVER_NAME`: "sonic-crypto-mcp"
- `MCP_SERVER_VERSION`: "1.0.0"

### Runtime Secrets (set via wrangler secret)
- `COINDESK_API_KEY`: CoinDesk API authentication (required)
- `AI_GATEWAY_TOKEN`: AI Gateway authentication (optional)
- `ANTHROPIC_API_KEY`: Alternative AI provider (optional)

## Testing & Validation

### Local Testing
```bash
# Start development server
npm run dev

# Test MCP endpoints
curl http://localhost:8787/mcp/tools/list

# Test direct API access
curl "http://localhost:8787/api/price?market=cadli&instruments=[%22BTC-USD%22]"

# Test AI analysis
curl -X POST http://localhost:8787/api/sentiment \
  -H "Content-Type: application/json" \
  -d '{"sentiment_sources":["price_action","volume_analysis"]}'
```

### Production Validation
```bash
# Check deployment health
curl https://your-worker.your-subdomain.workers.dev/health

# Monitor logs
npm run tail

# View analytics (in Cloudflare Dashboard)
```

## Troubleshooting

### Common Issues
1. **AI binding errors**: Ensure AI binding is properly configured in wrangler.toml
2. **Storage permissions**: Verify R2 bucket and KV namespace permissions
3. **API key issues**: Check COINDESK_API_KEY secret is set correctly
4. **CORS errors**: All endpoints include proper CORS headers

### Debug Commands
```bash
# Check TypeScript compilation
npm run lint

# View real-time logs during development
npm run tail

# Test local deployment
wrangler dev --local
```

## Security Considerations

- All API keys stored as encrypted Cloudflare secrets
- CORS configured for secure browser access  
- Rate limiting implemented via KV storage
- No sensitive data logged in analytics
- Environment-specific configurations for staging/production