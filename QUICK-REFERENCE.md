# 🚀 Quick Reference - Sonic Crypto Intelligence Platform

## 📡 API Endpoints

### Core Data
```bash
GET  /                          # Enhanced Dashboard
GET  /chat                      # Legacy Chat Dashboard
GET  /api/docs                  # API Documentation
GET  /health                    # Health Check
```

### Market Data
```bash
POST /api/price                 # Latest Prices (multi-source)
POST /api/trending              # Trending Gainers/Losers (CMC)
POST /api/global-market         # Global Market Metrics (CMC)
POST /api/historical-daily      # Daily OHLCV Data
POST /api/historical-hourly     # Hourly OHLCV Data
POST /api/historical-minutes    # Minute OHLCV Data
```

### Intelligence
```bash
POST /api/sentiment             # AI Market Sentiment
POST /api/opportunities         # AI Trading Opportunities
POST /api/news                  # Crypto News Search
POST /api/discord/intel         # Discord Community Intel
```

### Data Sources
```bash
GET  /api/orderly/markets       # Orderly DEX Markets
GET  /api/orderly/ticker/:sym   # Orderly Ticker
POST /api/dexscreener/search    # DexScreener Search
POST /api/dexscreener/sonic     # Sonic Chain Pairs
POST /api/cmc/trending          # CMC Trending (direct)
POST /api/cmc/global            # CMC Global (direct)
POST /api/cmc/quotes            # CMC Quotes (direct)
GET  /api/cmc/credits           # CMC Credit Usage
```

## 🧰 MCP Tools

```json
[
  "get_latest_index_tick",              // Latest prices
  "analyze_sonic_market_sentiment",     // AI sentiment
  "search_crypto_news",                 // News search
  "get_historical_ohlcv_daily",         // Daily data
  "get_historical_ohlcv_hourly",        // Hourly data
  "get_historical_ohlcv_minutes",       // Minute data
  "get_trending_crypto",                // Trending tokens
  "get_global_market_data",             // Global metrics
  "get_discord_community_intel"         // Discord intel
]
```

## 🔑 Required Secrets

```bash
wrangler secret put COINDESK_API_KEY
wrangler secret put COINMARKETCAP_API_KEY  # FREE plan
wrangler secret put DISCORD_BOT_TOKEN       # Optional
wrangler secret put BRAVE_API_KEY           # Optional
```

## 💬 Discord Intel Example

```bash
curl -X POST https://ss.srvcflo.com/api/discord/intel \
  -H "Content-Type: application/json" \
  -d '{
    "nft_channel_id": "YOUR_NFT_CHANNEL_ID",
    "tweet_channel_id": "YOUR_TWEET_CHANNEL_ID",
    "limit": 50,
    "intel_type": "all"
  }'
```

### Discord Setup
1. Create bot: https://discord.com/developers
2. Enable MESSAGE CONTENT INTENT
3. Invite to server (View + Read permissions)
4. Get channel IDs (Developer Mode → Right-click → Copy ID)
5. Set secret: `wrangler secret put DISCORD_BOT_TOKEN`

## 📊 Dashboard Features

### Overview Tab
- Trending Gainers/Losers
- Market Heatmap
- Live Prices
- AI Sentiment

### Charts Tab
- Technical Analysis (OHLCV)
- Volume Analysis
- Market Distribution

### Trading Tab
- Orderly DEX Markets
- DexScreener Sonic Pairs

### Intelligence Tab
- AI Insights Generator
- Crypto News Feed
- Discord Community Intel

## ⚡ Quick Deploy

```bash
# Install
npm install
npm run setup

# Configure
wrangler secret put COINDESK_API_KEY
wrangler secret put COINMARKETCAP_API_KEY
wrangler secret put DISCORD_BOT_TOKEN

# Deploy
npm run deploy

# Verify
curl https://ss.srvcflo.com/health
```

## 📈 Performance

### Cache TTLs
- Real-time prices: 10s
- Trending: 15 min
- Global market: 30 min
- Discord messages: 2 min

### Credit Usage (Daily)
- CMC Trending: 96 credits
- CMC Global: 48 credits
- CMC Quotes: 20-50 credits
- **Total**: 150-200 / 333 limit ✅

### Response Times
- Cached: <100ms
- Uncached: <2s
- Dashboard: <3s first load

## 🐛 Troubleshooting

### CMC "Trending not available"
- **Cause**: Using Pro endpoint on free plan
- **Fix**: Code automatically derives from listings/latest

### Discord "Bot can't read messages"
- **Cause**: Missing MESSAGE CONTENT INTENT
- **Fix**: Enable in bot settings

### Charts not rendering
- **Cause**: Chart.js CDN blocked
- **Fix**: Check network tab, whitelist CDN

### No data in dashboard
- **Cause**: API keys not set
- **Fix**: Run `wrangler secret put` commands

## 📚 Documentation

- `README.md` - Main docs
- `DISCORD-COMMUNITY-INTEL.md` - Discord guide
- `IMPLEMENTATION-COMPLETE.md` - Full summary
- `CLAUDE.md` - AI assistant context

## 🔗 Links

- **Dashboard**: https://ss.srvcflo.com/
- **API Docs**: https://ss.srvcflo.com/api/docs
- **Health**: https://ss.srvcflo.com/health
- **GitHub**: https://github.com/mintedmaterial/sonic-crypto-mcp-server

## 💡 Quick Examples

### Get Trending Tokens
```bash
curl https://ss.srvcflo.com/api/trending
```

### Get Global Market Stats
```bash
curl https://ss.srvcflo.com/api/global-market
```

### Get Latest Prices
```bash
curl -X POST https://ss.srvcflo.com/api/price \
  -d '{"instruments":["BTC-USD","ETH-USD"]}'
```

### Get AI Sentiment
```bash
curl -X POST https://ss.srvcflo.com/api/sentiment \
  -d '{"instruments":["SONIC-USD"]}'
```

### Search News
```bash
curl "https://ss.srvcflo.com/api/news?query=bitcoin"
```

## 🎯 Support

Need help? Check:
1. `IMPLEMENTATION-COMPLETE.md` for full details
2. `DISCORD-COMMUNITY-INTEL.md` for Discord setup
3. GitHub Issues for common problems
4. Cloudflare Docs for Workers issues

---

**Built for Sonic Labs Ecosystem 🚀**
