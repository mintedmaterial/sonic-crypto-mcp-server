# 🧪 Local Testing Guide

## Prerequisites Check
Before testing, ensure you have:
- Node.js 18+ installed
- npm installed
- Wrangler CLI installed (`npm install -g wrangler`)

## Step 1: Build TypeScript
```bash
cd C:\Users\PC\sonic-crypto-mcp-server
npm run build
```

**Expected Output:**
```
> sonic-crypto-mcp-server@2.0.0 build
> tsc

✔ Build successful
```

## Step 2: Start Local Dev Server
```bash
npm run dev
```

**Expected Output:**
```
⛅️ wrangler 3.x.x
------------------
⎔ Starting local server...
[mf:inf] Ready on http://localhost:8787
```

---

## Test Endpoints

### 1. Health Check ✅
```bash
curl http://localhost:8787/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-08T...",
  "services": {
    "ai": true,
    "kv": true,
    "r2": true,
    "d1": true,
    "analytics": true
  }
}
```

---

### 2. API Documentation ✅
```bash
curl http://localhost:8787/api/docs
```

**Expected Response:**
```json
{
  "name": "Sonic Crypto MCP Server",
  "version": "2.0.0",
  "endpoints": {
    "/api/price": "Get latest cryptocurrency prices (multi-source: Orderly → DexScreener → CoinDesk)",
    "/api/orderly/markets": "Get Orderly DEX markets",
    ...
  }
}
```

---

### 3. Multi-Source Price Data ✅ (MOST IMPORTANT)
```bash
curl -X POST http://localhost:8787/api/price ^
  -H "Content-Type: application/json" ^
  -d "{\"market\":\"orderly\",\"instruments\":[\"BTC-USD\",\"SONIC-USD\"]}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "INSTRUMENT": "BTC-USD",
        "VALUE": {
          "PRICE": 121661,
          "BID": 121660,
          "ASK": 121662
        },
        "CURRENT_DAY": {
          "CHANGE_PERCENTAGE": 2.34,
          "HIGH": 122000,
          "LOW": 120000,
          "VOLUME": 1234567
        },
        "SOURCE": "orderly"
      },
      {
        "INSTRUMENT": "SONIC-USD",
        "VALUE": {
          "PRICE": 0.00008488
        },
        "CURRENT_DAY": {
          "CHANGE_PERCENTAGE": -1.23,
          ...
        },
        "SOURCE": "dexscreener"
      }
    ],
    "sources_used": ["orderly", "dexscreener"],
    "errors": []
  },
  "summary": "Retrieved prices for 2/2 instruments from orderly, dexscreener"
}
```

**Success Indicators:**
- ✅ `success: true`
- ✅ `sources_used` contains "orderly" and/or "dexscreener"
- ✅ Each item has `SOURCE` field
- ✅ Prices are actual numbers

---

### 4. Orderly Markets ✅
```bash
curl http://localhost:8787/api/orderly/markets
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "PERP_BTC_USDC",
      "base_token": "BTC",
      "quote_token": "USDC",
      "price": 121661,
      ...
    }
  ]
}
```

---

### 5. DexScreener Sonic Prices ✅
```bash
curl -X POST http://localhost:8787/api/dexscreener/sonic ^
  -H "Content-Type: application/json" ^
  -d "{\"symbols\":[\"SONIC\",\"S\",\"USDC\"]}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "SONIC": {
      "symbol": "SONIC",
      "price": 0.00008488,
      "priceChange24h": -1.23,
      "volume24h": 123456,
      "chainId": "sonic"
    }
  }
}
```

---

### 6. MCP Tools List ✅
```bash
curl http://localhost:8787/mcp/tools/list
```

**Expected Response:**
```json
[
  {
    "name": "get_latest_index_tick",
    "description": "Get latest cryptocurrency prices with multi-source fallback (Orderly DEX → DexScreener → CoinDesk)",
    "inputSchema": { ... }
  },
  {
    "name": "analyze_sonic_market_sentiment",
    ...
  },
  {
    "name": "search_crypto_news",
    ...
  }
]
```

**Should see exactly 6 tools.**

---

### 7. MCP Tool Call - Price ✅
```bash
curl -X POST http://localhost:8787/mcp/tools/call ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"get_latest_index_tick\",\"arguments\":{\"market\":\"orderly\",\"instruments\":[\"BTC-USD\"]}}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "INSTRUMENT": "BTC-USD",
        "VALUE": { "PRICE": 121661 },
        "SOURCE": "orderly"
      }
    ],
    "sources_used": ["orderly"]
  },
  "summary": "Retrieved prices for 1/1 instruments from orderly",
  "timestamp": "2025-01-08T..."
}
```

---

### 8. Dashboard UI ✅
Open in browser:
```
http://localhost:8787/
```

**Expected:**
- Animated logo rainfall background
- 3 cards: Live Prices, Market Sentiment, Latest News
- Prices should load with source badges (🔷, 💎, 🏦)
- AI chat should be functional

---

## Check Logs for Success Messages

While server is running, you should see logs like:

```
✅ Orderly: BTC-USD = $121661
✅ DexScreener: SONIC-USD = $0.00008488
✅ Price fetch: orderly, dexscreener
```

If you see errors:
```
❌ Orderly BTC-USD: Error message
❌ DexScreener SONIC-USD: Error message
```

This helps identify which source failed and why.

---

## Alternative: Test Without Building

If you can't run `npm run build` due to PowerShell issues, you can:

1. **Commit and push to GitHub** - Let GitHub Actions build it
2. **Test on deployed URL** - Use https://ss.srvcflo.com/ instead of localhost
3. **Check the .js files** - Verify they exist in src/ folders

---

## PowerShell Alternative Commands

If `npm run dev` doesn't work, try:

```bash
# Using npx
npx wrangler dev

# Direct wrangler command
wrangler dev

# Specify port
wrangler dev --port 8787
```

---

## Success Checklist

After running tests, verify:

- [ ] Health check returns "healthy"
- [ ] `/api/price` returns data from "orderly" or "dexscreener"
- [ ] `/api/orderly/markets` returns market list
- [ ] `/api/dexscreener/sonic` returns Sonic token prices
- [ ] MCP tools list shows 6 tools
- [ ] MCP tool call works and returns data with SOURCE field
- [ ] Dashboard loads in browser
- [ ] Dashboard shows price data with source badges
- [ ] Logs show `✅ Orderly:` or `✅ DexScreener:` messages

---

## If Tests Fail

### No data returned:
1. Check if Orderly API is accessible: `curl https://api.orderly.org/v1/public/futures`
2. Check if DexScreener API is accessible: `curl https://api.dexscreener.com/latest/dex/search?q=sonic`

### Build errors:
1. Run `npm install` to ensure dependencies are installed
2. Check TypeScript version: `npx tsc --version`

### Server won't start:
1. Check if port 8787 is already in use
2. Try: `wrangler dev --local` for local-only mode

---

## Quick Test Command (All in One)

```bash
# Start server in background, test endpoints, then stop
cd C:\Users\PC\sonic-crypto-mcp-server
npm run build
start /B npm run dev
timeout /t 10
curl http://localhost:8787/health
curl http://localhost:8787/api/price
curl http://localhost:8787/api/orderly/markets
```

---

**Ready to push to GitHub?** If local tests pass, commit and push - Cloudflare will auto-deploy! 🚀
