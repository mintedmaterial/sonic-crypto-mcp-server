# 🚀 Sonic Crypto MCP Server

> **Advanced Model Context Protocol (MCP) server providing comprehensive cryptocurrency market data and AI-powered analysis for the Sonic blockchain ecosystem**

[![Deploy to Cloudflare Workers](https://img.shields.io/badge/Deploy-Cloudflare%20Workers-orange)](https://ss.srvcflo.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.17+-green)](https://modelcontextprotocol.io/)

## 🌟 Features

### Core Capabilities
- **🔥 Real-time Cryptocurrency Data** - Live prices, OHLCV data, and market metrics
- **🧠 AI-Powered Analysis** - Market sentiment analysis using Cloudflare AI (Llama 3.1-8b)
- **💬 Interactive Chat Assistant** - Context-aware AI chat with Hermes-2-Pro-Mistral-7B
- **📰 News Aggregation** - AI-curated crypto news and market updates
- **📊 Historical Data Management** - Automated seeding and caching of historical market data
- **🎨 Sonic-Themed Dashboard** - Beautiful dark mode UI with animated starfield background

### Technical Features
- **Multi-Tier Caching** - KV, Durable Objects, and R2 storage for optimal performance
- **MCP Protocol Compliance** - Full Model Context Protocol implementation
- **Auto-Deployment** - GitHub integration with Cloudflare for CI/CD
- **Analytics Integration** - Real-time usage tracking with Analytics Engine
- **Scheduled Jobs** - Automated data refresh via cron triggers
- **Type-Safe** - Strict TypeScript with comprehensive type definitions

### 🎯 NEW: Advanced Features

#### Workers for Platforms 🚀
- **User-Specific Worker Instances** - Isolated execution environments per user
- **NFT-Gated Access** - Bandit Kidz NFT holders get premium features
- **Dispatch Namespace**: `sonic-user-workers` (shared with Vibe SDK)
- **Cross-Platform Integration** - Seamless integration with Vibe SDK applications
- **Auto Lifecycle Management** - Automatic worker creation, routing, and cleanup

#### Python ML Containers 🐍 (Coming Soon)
- **Advanced Technical Analysis** - 50+ indicators via TA-Lib
- **Pattern Recognition** - AI-powered candlestick and chart patterns
- **Machine Learning** - scikit-learn models for trend prediction
- **Chart Generation** - plotly/matplotlib visualizations
- **See [CONTAINERS.md](./CONTAINERS.md) for activation guide**

## 🏗️ Architecture

```
src/
├── config/           # Environment & configuration
│   └── env.ts       # Cloudflare bindings & constants
├── services/        # Business logic services
│   ├── cache.ts     # KV & Durable Object caching
│   └── ai.ts        # AI service abstractions
├── storage/         # Storage layer
│   ├── r2.ts        # R2 bucket operations
│   └── d1.ts        # D1 database operations
├── tools/           # MCP tools
│   ├── price-tool.ts
│   ├── sentiment-tool.ts
│   ├── web-search-tool.ts
│   ├── historical-tool.ts
│   └── index.ts
├── workflows/       # Cloudflare Workflows
│   ├── data-seeding.ts
│   └── data-workflow.ts
├── durable-objects/ # Persistent state
│   ├── crypto-cache.ts
│   └── session-manager.ts
├── ui/              # Dashboard
│   └── dashboard.ts
└── index.ts         # Main worker entry point
```

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) 18+ and npm
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (Cloudflare CLI)
- Cloudflare account with Workers enabled
- CoinDesk API key ([Get one here](https://www.coindesk.com/coindesk-api))

### Installation

```bash
# Clone the repository
git clone https://github.com/mintedmaterial/sonic-crypto-mcp-server.git
cd sonic-crypto-mcp-server

# Install dependencies
npm install

# Generate TypeScript types for Cloudflare bindings
npm run setup
```

### Configuration

1. **Set Cloudflare Secrets:**
```bash
# Required
wrangler secret put COINDESK_API_KEY

# Optional
wrangler secret put AI_GATEWAY_TOKEN
wrangler secret put ANTHROPIC_API_KEY
```

2. **Configure Custom Domain (Optional):**
   - Update `wrangler.toml` with your domain settings
   - The server is configured for `ss.srvcflo.com`

### Development

```bash
# Start local development server
npm run dev

# The server will be available at http://localhost:8787
```

### Deployment

```bash
# Deploy to production
npm run deploy

# Deploy to staging
npm run deploy:staging

# View real-time logs
npm run tail
```

## 📡 API Endpoints

### Dashboard
- **`GET /`** - Sonic-themed interactive dashboard with AI chat

### MCP Protocol
- **`GET /mcp/tools/list`** - List all available MCP tools
- **`POST /mcp/tools/call`** - Execute an MCP tool

### Direct API Access
- **`GET|POST /api/price`** - Get latest cryptocurrency prices
- **`GET|POST /api/sentiment`** - AI-powered market sentiment analysis
- **`GET|POST /api/news`** - Search crypto news
- **`POST /api/chat`** - AI chat assistant with context-aware responses

### User Worker Management (Workers for Platforms)
- **`POST /api/user-worker/create`** - Create or get user-specific worker (NFT-gated)
- **`POST /api/user-worker/dispatch`** - Dispatch request to user worker
- **`POST /api/user-worker/update-nft`** - Update user worker NFT status
- **`GET /api/user-worker/stats`** - Get worker statistics (monitoring)
- **`GET /api/user-worker/list`** - List all user workers (admin)
- **`POST /api/user-worker/delete`** - Delete user worker (cleanup)
- **`POST /api/verify-nft`** - Verify Bandit Kidz NFT ownership

### Data Management
- **`POST /api/init-db`** - Initialize D1 database schema
- **`POST /api/seed-data`** - Seed historical data (accepts config JSON)
- **`POST /api/refresh-data`** - Refresh recent data

### System
- **`GET /health`** - Health check with service status
- **`GET /docs`** - API documentation

## 🛠️ MCP Tools

### 1. get_latest_index_tick
Get real-time cryptocurrency prices with OHLC metrics.

```json
{
  "market": "cadli",
  "instruments": ["BTC-USD", "ETH-USD", "S-USD", "SONIC-USD"]
}
```

### 2. analyze_sonic_market_sentiment
AI-powered sentiment analysis for Sonic ecosystem.

```json
{
  "sentiment_sources": ["price_action", "volume_analysis"],
  "timeframe": "1d",
  "instruments": ["S-USD", "BTC-USD", "ETH-USD"]
}
```

### 3. search_crypto_news
Search and summarize cryptocurrency news.

```json
{
  "query": "Sonic blockchain news",
  "tokens": ["Sonic", "S-USD"],
  "max_results": 5
}
```

### 4. get_historical_ohlcv_daily
Fetch historical daily OHLCV data (up to 5000 points).

### 5. get_historical_ohlcv_hourly
Fetch hourly data for intraday analysis.

### 6. get_historical_ohlcv_minutes
Fetch minute-level data for high-frequency analysis.

## 🔧 Environment Variables

### Required
- `COINDESK_API_KEY` - CoinDesk API authentication

### Optional
- `AI_GATEWAY_TOKEN` - Cloudflare AI Gateway token
- `ANTHROPIC_API_KEY` - Alternative AI provider

### Build-time (in wrangler.toml)
- `API_VERSION` - API version (default: "1.0.0")
- `ENVIRONMENT` - Deployment environment
- `MCP_SERVER_NAME` - Server name (default: "sonic-crypto-mcp")

## 🗄️ Cloudflare Services

### Storage
- **KV Namespaces**: `SONIC_CACHE`, `API_RATE_LIMIT`
- **R2 Buckets**: `HISTORICAL_DATA`, `MARKET_REPORTS`
- **D1 Database**: `CONFIG_DB` (for metadata and configuration)

### Compute
- **Durable Objects**: `CryptoDataCache`, `MCPSessionManager`, `OverviewAgent`, `ChartsAgent`
- **Workflows**: `DATA_UPDATE_WORKFLOW`, `DATA_SEEDING_WORKFLOW`
- **Queue**: `CRYPTO_QUEUE` (for background processing)
- **Dispatch Namespace**: `sonic-user-workers` (Workers for Platforms)
- **Containers**: `CHARTS_CONTAINER` (Python ML - when available)

### AI & Analytics
- **Workers AI**: Llama 3.1-8b, Hermes-2-Pro-Mistral-7B
- **Analytics Engine**: Usage tracking and monitoring

## 📊 Data Seeding

### Initialize Database
```bash
curl -X POST https://ss.srvcflo.com/api/init-db
```

### Seed Historical Data
```bash
curl -X POST https://ss.srvcflo.com/api/seed-data \
  -H "Content-Type: application/json" \
  -d '{
    "instruments": ["BTC-USD", "ETH-USD", "S-USD"],
    "markets": ["cadli"],
    "daysOfHistory": 90
  }'
```

## 🔄 Auto-Deployment

### GitHub Integration
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages
2. Select your worker → Settings → Builds
3. Click "Connect" and authorize GitHub
4. Select the `sonic-crypto-mcp-server` repository
5. Configure build settings (automatic)

**Push to `main` branch = automatic deployment! 🎉**

## 🧪 Testing

### Local Testing
```bash
# Start dev server
npm run dev

# Test MCP endpoint
curl http://localhost:8787/mcp/tools/list

# Test price API
curl "http://localhost:8787/api/price"

# Test chat
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is the price of BTC?"}'
```

### Production Testing
```bash
# Health check
curl https://ss.srvcflo.com/health

# View logs
npm run tail
```

## 📝 Scripts

```bash
npm run build          # Compile TypeScript
npm run dev            # Start local development server
npm run deploy         # Deploy to default environment
npm run deploy:staging # Deploy to staging
npm run deploy:prod    # Deploy to production
npm run tail           # View real-time logs
npm run lint           # Type-check without emitting
npm run setup          # Generate Cloudflare types
```

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

ISC License - see [LICENSE](./LICENSE) for details.

## 🔗 Links

- **Live Dashboard**: [https://ss.srvcflo.com](https://ss.srvcflo.com)
- **GitHub Repository**: [mintedmaterial/sonic-crypto-mcp-server](https://github.com/mintedmaterial/sonic-crypto-mcp-server)
- **CoinDesk API Docs**: [https://www.coindesk.com/coindesk-api](https://www.coindesk.com/coindesk-api)
- **Cloudflare Workers**: [https://developers.cloudflare.com/workers/](https://developers.cloudflare.com/workers/)
- **MCP Protocol**: [https://modelcontextprotocol.io/](https://modelcontextprotocol.io/)

## 📞 Support

For issues, questions, or contributions:
- Open an issue on [GitHub](https://github.com/mintedmaterial/sonic-crypto-mcp-server/issues)
- Contact: [@mintedmaterial](https://github.com/mintedmaterial)

---

**Made with ❤️ for the Sonic ecosystem**
