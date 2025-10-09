# 🚀 Enhanced Intelligence Plan - Phase 1+ with Data Viz

## 🎯 Vision: Ultimate Sonic Labs Intelligence Platform

A comprehensive, visually stunning crypto intelligence hub focused on Sonic Labs blockchain with:
- **Real-time multi-source data** (CoinMarketCap, DexScreener, Orderly, Brave Search)
- **Interactive charts & visualizations** (OHLCV, indicators, heatmaps)
- **Trading intelligence** (order books, liquidity, arbitrage detection)
- **AI-powered insights** (sentiment, predictions, opportunities)
- **Beautiful, performant UI** (fixed logo rainfall, responsive charts, animations)

**All using Cloudflare-native products** (Workers, R2, KV, D1, AI, Analytics)

---

## 📊 Phase 1: CoinMarketCap Integration + Core Visualizations

### Priority 1.1: CoinMarketCap Service (Days 1-2)
**File:** `src/services/coinmarketcap.ts`

```typescript
export class CoinMarketCapService {
  private baseUrl = 'https://pro-api.coinmarketcap.com/v1';
  private env: Env;
  
  constructor(env: Env) {
    this.env = env;
  }
  
  // Credit: 1 | Cache: 15 min | Priority: HIGH
  async getTrendingGainersLosers(limit: number = 10): Promise<TrendingData> {
    const cacheKey = `cmc:trending:${limit}`;
    const cached = await this.env.SONIC_CACHE.get(cacheKey, { type: 'json' });
    
    if (cached) return cached;
    
    const response = await fetch(
      `${this.baseUrl}/cryptocurrency/trending/gainers-losers?time_period=24h&limit=${limit}`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': this.env.COINMARKETCAP_API_KEY,
          'Accept': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    // Cache for 15 minutes
    await this.env.SONIC_CACHE.put(cacheKey, JSON.stringify(data), {
      expirationTtl: 900
    });
    
    // Track credits
    await this.trackCreditUsage('trending_gainers_losers', 1);
    
    return data;
  }
  
  // Credit: 1 per symbol | Cache: 5 min | Priority: HIGH
  async getQuotes(symbols: string[]): Promise<QuoteData[]> {
    const cacheKey = `cmc:quotes:${symbols.join(',')}`;
    const cached = await this.env.SONIC_CACHE.get(cacheKey, { type: 'json' });
    
    if (cached) return cached;
    
    const response = await fetch(
      `${this.baseUrl}/cryptocurrency/quotes/latest?symbol=${symbols.join(',')}`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': this.env.COINMARKETCAP_API_KEY,
          'Accept': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    // Cache for 5 minutes
    await this.env.SONIC_CACHE.put(cacheKey, JSON.stringify(data), {
      expirationTtl: 300
    });
    
    // Track credits (1 per symbol)
    await this.trackCreditUsage('quotes', symbols.length);
    
    return data;
  }
  
  // Credit: 1 | Cache: 30 min | Priority: MEDIUM
  async getGlobalMetrics(): Promise<GlobalMarketData> {
    const cacheKey = 'cmc:global';
    const cached = await this.env.SONIC_CACHE.get(cacheKey, { type: 'json' });
    
    if (cached) return cached;
    
    const response = await fetch(
      `${this.baseUrl}/global-metrics/quotes/latest`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': this.env.COINMARKETCAP_API_KEY,
          'Accept': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    // Cache for 30 minutes
    await this.env.SONIC_CACHE.put(cacheKey, JSON.stringify(data), {
      expirationTtl: 1800
    });
    
    await this.trackCreditUsage('global_metrics', 1);
    
    return data;
  }
  
  // Credit tracking in D1
  private async trackCreditUsage(endpoint: string, credits: number): Promise<void> {
    await this.env.CONFIG_DB.prepare(`
      INSERT INTO api_credit_usage (endpoint, credits_used, timestamp, date)
      VALUES (?, ?, ?, DATE('now'))
    `).bind(endpoint, credits, new Date().toISOString()).run();
    
    // Log to analytics
    if (this.env.ANALYTICS) {
      this.env.ANALYTICS.writeDataPoint({
        blobs: ['cmc_credit_usage', endpoint],
        doubles: [credits],
        indexes: ['cmc']
      });
    }
  }
  
  // Get today's credit usage
  async getCreditUsageToday(): Promise<number> {
    const result = await this.env.CONFIG_DB.prepare(`
      SELECT SUM(credits_used) as total
      FROM api_credit_usage
      WHERE date = DATE('now')
    `).first();
    
    return result?.total || 0;
  }
}
```

### Priority 1.2: Trending Tool (Day 2)
**File:** `src/tools/trending-tool.ts`

```typescript
export const trendingToolDefinition: MCPTool = {
  name: "get_trending_crypto",
  description: "Get trending cryptocurrencies - top gainers and losers in 24h",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        default: 10,
        description: "Number of results to return"
      },
      time_period: {
        type: "string",
        enum: ["24h", "7d", "30d"],
        default: "24h"
      }
    }
  }
};

export async function executeGetTrending(
  args: any,
  env: Env
): Promise<ToolExecutionResult> {
  const { limit = 10 } = args;
  
  try {
    const cmc = new CoinMarketCapService(env);
    const trending = await cmc.getTrendingGainersLosers(limit);
    
    return {
      success: true,
      data: {
        gainers: trending.data.gainers,
        losers: trending.data.losers,
        timestamp: trending.status.timestamp
      },
      summary: `Retrieved top ${limit} gainers and losers`,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      summary: `Failed to fetch trending: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}
```

### Priority 1.3: Enhanced Dashboard with Charts (Days 3-5)

**Key Dependencies** (Cloudflare-compatible):
- **Chart.js** (or lightweight-charts) - Pure JS, no Node deps
- **Canvas API** - Native browser API
- All rendering client-side, no SSR issues

**File:** `src/ui/dashboard-enhanced.ts`

```typescript
// Enhanced dashboard with data visualizations

export function getEnhancedDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sonic Crypto Intelligence</title>
  
  <!-- Chart.js for visualizations -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
  
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --bg-primary: #0a0a0b;
      --bg-secondary: #18181b;
      --bg-card: #27272a;
      --text-primary: #fafafa;
      --text-secondary: #a1a1aa;
      --accent-orange: #f97316;
      --accent-blue: #3b82f6;
      --accent-green: #10b981;
      --accent-red: #ef4444;
      --border: #3f3f46;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
    }
    
    /* Logo rainfall canvas */
    #logo-rain {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
    }
    
    .gradient-overlay {
      position: fixed;
      inset: 0;
      background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 50%, transparent 100%);
      pointer-events: none;
      z-index: 1;
    }
    
    /* Main container */
    .container {
      position: relative;
      z-index: 2;
      max-width: 1600px;
      margin: 0 auto;
      padding: 1rem;
    }
    
    /* Header */
    .header {
      background: rgba(39, 39, 42, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border);
      padding: 1.5rem 2rem;
      border-radius: 16px;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .header-title h1 {
      font-size: 1.75rem;
      font-weight: 700;
      background: linear-gradient(to right, var(--text-primary), var(--accent-orange));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .header-stats {
      display: flex;
      gap: 2rem;
      align-items: center;
    }
    
    .stat-item {
      text-align: center;
    }
    
    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .stat-value {
      font-size: 1.25rem;
      font-weight: 700;
      margin-top: 0.25rem;
    }
    
    .stat-value.positive { color: var(--accent-green); }
    .stat-value.negative { color: var(--accent-red); }
    
    /* Navigation tabs */
    .nav-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      background: rgba(39, 39, 42, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 0.5rem;
    }
    
    .nav-tab {
      flex: 1;
      padding: 0.75rem 1rem;
      background: transparent;
      border: none;
      border-radius: 8px;
      color: var(--text-secondary);
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .nav-tab:hover {
      background: rgba(249, 115, 22, 0.1);
      color: var(--text-primary);
    }
    
    .nav-tab.active {
      background: var(--accent-orange);
      color: white;
    }
    
    /* Grid layout */
    .grid {
      display: grid;
      gap: 1rem;
    }
    
    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }
    
    @media (max-width: 1024px) {
      .grid-3, .grid-4 { grid-template-columns: repeat(2, 1fr); }
    }
    
    @media (max-width: 640px) {
      .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
    }
    
    /* Card */
    .card {
      background: rgba(39, 39, 42, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.5rem;
      transition: all 0.3s;
    }
    
    .card:hover {
      border-color: rgba(249, 115, 22, 0.5);
      transform: translateY(-2px);
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .card-title {
      font-size: 1.125rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .card-action {
      padding: 0.5rem;
      background: rgba(249, 115, 22, 0.1);
      border: 1px solid rgba(249, 115, 22, 0.3);
      border-radius: 8px;
      color: var(--accent-orange);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .card-action:hover {
      background: rgba(249, 115, 22, 0.2);
      transform: scale(1.05);
    }
    
    /* Chart container */
    .chart-container {
      position: relative;
      height: 300px;
      margin-top: 1rem;
    }
    
    .chart-container canvas {
      max-height: 100%;
    }
    
    /* Price item */
    .price-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      margin-bottom: 0.75rem;
      transition: all 0.2s;
    }
    
    .price-item:hover {
      background: rgba(249, 115, 22, 0.1);
      transform: translateX(4px);
    }
    
    .price-label {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .price-value {
      font-size: 1.25rem;
      font-weight: 700;
    }
    
    .price-change {
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }
    
    .price-change.positive {
      background: rgba(16, 185, 129, 0.2);
      color: var(--accent-green);
    }
    
    .price-change.negative {
      background: rgba(239, 68, 68, 0.2);
      color: var(--accent-red);
    }
    
    /* Sparkline */
    .sparkline {
      width: 80px;
      height: 30px;
    }
    
    /* Heatmap */
    .heatmap-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 0.5rem;
    }
    
    .heatmap-cell {
      aspect-ratio: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .heatmap-cell:hover {
      transform: scale(1.05);
      z-index: 10;
    }
    
    .heatmap-cell-symbol {
      font-weight: 700;
      margin-bottom: 0.25rem;
    }
    
    .heatmap-cell-change {
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    /* Trending item */
    .trending-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      margin-bottom: 0.75rem;
    }
    
    .trending-rank {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-secondary);
      width: 40px;
    }
    
    .trending-info {
      flex: 1;
    }
    
    .trending-symbol {
      font-weight: 700;
      font-size: 1.125rem;
    }
    
    .trending-name {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
    
    .trending-price {
      font-size: 1.125rem;
      font-weight: 700;
      text-align: right;
    }
    
    .trending-change {
      font-size: 1rem;
      font-weight: 700;
      text-align: right;
    }
    
    /* Loading */
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      gap: 1rem;
    }
    
    .spinner {
      border: 3px solid rgba(249, 115, 22, 0.2);
      border-top-color: var(--accent-orange);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Tab content */
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
      animation: fadeIn 0.3s;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <!-- Logo rainfall background -->
  <canvas id="logo-rain"></canvas>
  <div class="gradient-overlay"></div>
  
  <div class="container">
    <!-- Header with global stats -->
    <div class="header">
      <div class="header-title">
        <h1>🚀 Sonic Crypto Intelligence</h1>
        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.25rem;">
          Real-time market data powered by AI
        </p>
      </div>
      
      <div class="header-stats" id="global-stats">
        <div class="stat-item">
          <div class="stat-label">Total Market Cap</div>
          <div class="stat-value">Loading...</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">24h Volume</div>
          <div class="stat-value">Loading...</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">BTC Dominance</div>
          <div class="stat-value">Loading...</div>
        </div>
      </div>
    </div>
    
    <!-- Navigation -->
    <div class="nav-tabs">
      <button class="nav-tab active" onclick="showTab('overview')">📊 Overview</button>
      <button class="nav-tab" onclick="showTab('charts')">📈 Charts</button>
      <button class="nav-tab" onclick="showTab('trading')">💱 Trading</button>
      <button class="nav-tab" onclick="showTab('intelligence')">🧠 Intelligence</button>
      <button class="nav-tab" onclick="showTab('chat')">💬 AI Chat</button>
    </div>
    
    <!-- Tab: Overview -->
    <div id="tab-overview" class="tab-content active">
      <div class="grid grid-3">
        <!-- Trending Gainers -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">🔥 Top Gainers 24h</div>
            <div class="card-action" onclick="refreshTrending()">🔄</div>
          </div>
          <div id="trending-gainers">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
        
        <!-- Trending Losers -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">❄️ Top Losers 24h</div>
            <div class="card-action" onclick="refreshTrending()">🔄</div>
          </div>
          <div id="trending-losers">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
        
        <!-- Price Heatmap -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">🗺️ Market Heatmap</div>
            <div class="card-action" onclick="refreshHeatmap()">🔄</div>
          </div>
          <div id="market-heatmap">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
      
      <div class="grid grid-2" style="margin-top: 1rem;">
        <!-- Live Prices with Sparklines -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">💹 Live Prices</div>
            <div class="card-action" onclick="refreshPrices()">🔄</div>
          </div>
          <div id="live-prices">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
        
        <!-- Market Sentiment -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">🧠 Market Sentiment</div>
            <div class="card-action" onclick="refreshSentiment()">🔄</div>
          </div>
          <div id="sentiment-content">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tab: Charts -->
    <div id="tab-charts" class="tab-content">
      <div class="grid grid-2">
        <!-- Price Chart with Technical Indicators -->
        <div class="card" style="grid-column: span 2;">
          <div class="card-header">
            <div class="card-title">📈 BTC/USD - Technical Analysis</div>
            <select id="chart-asset" onchange="updateChart()" style="padding: 0.5rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary);">
              <option value="BTC-USD">BTC/USD</option>
              <option value="ETH-USD">ETH/USD</option>
              <option value="S-USD">S/USD</option>
              <option value="SONIC-USD">SONIC/USD</option>
            </select>
          </div>
          <div class="chart-container" style="height: 400px;">
            <canvas id="price-chart"></canvas>
          </div>
        </div>
        
        <!-- Volume Chart -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">📊 Volume Analysis</div>
          </div>
          <div class="chart-container">
            <canvas id="volume-chart"></canvas>
          </div>
        </div>
        
        <!-- RSI Indicator -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">📉 RSI (14)</div>
          </div>
          <div class="chart-container">
            <canvas id="rsi-chart"></canvas>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tab: Trading -->
    <div id="tab-trading" class="tab-content">
      <div class="grid grid-2">
        <!-- Order Book -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">📖 Order Book</div>
          </div>
          <div id="order-book">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
        
        <!-- Liquidity Pools -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">💧 Top Liquidity Pools</div>
          </div>
          <div id="liquidity-pools">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tab: Intelligence -->
    <div id="tab-intelligence" class="tab-content">
      <div class="grid grid-3">
        <!-- AI Insights -->
        <div class="card" style="grid-column: span 3;">
          <div class="card-header">
            <div class="card-title">🧠 AI Market Insights</div>
            <button class="card-action" onclick="generateReport()">Generate Report</button>
          </div>
          <div id="ai-insights">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
        
        <!-- News Feed -->
        <div class="card" style="grid-column: span 2;">
          <div class="card-header">
            <div class="card-title">📰 Latest News</div>
          </div>
          <div id="news-feed">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
        
        <!-- Opportunities Scanner -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">💎 Opportunities</div>
          </div>
          <div id="opportunities">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tab: AI Chat (keep existing) -->
    <div id="tab-chat" class="tab-content">
      <!-- Your existing chat UI -->
    </div>
  </div>
  
  <script>
    // Will implement all the JavaScript functions next...
  </script>
</body>
</html>`;
}
```

---

## 📈 Key Features Breakdown

### 1. Fixed Logo Rainfall
- Uses native Canvas API (Cloudflare Workers compatible)
- Properly loads images with error handling
- Fallback colored squares if images fail
- Smooth animation loop

### 2. Real-Time Multi-Source Price Tracker
- Fetches from Orderly, DexScreener, CMC
- Side-by-side comparison
- Sparklines for 24h trends (Chart.js)
- Color-coded changes

### 3. Interactive OHLCV Charts
- Chart.js (CDN, no build required)
- Technical indicators (MA, RSI, MACD)
- Zoom/pan capabilities
- Dark mode compatible

### 4. Market Heatmap
- Grid of top tokens
- Color intensity based on % change
- Hover effects
- Sortable/filterable

### 5. Trending Gainers/Losers
- CoinMarketCap data
- Real-time updates
- Animated cards

### 6. Order Book Viewer
- Orderly SDK integration
- Live bid/ask spreads
- Depth chart visualization

---

## 🔧 Technical Implementation Details

### Cloudflare-Compatible Libraries:
✅ **Chart.js** - Pure JS, CDN delivery
✅ **Canvas API** - Native browser
✅ **Fetch API** - Standard
✅ **LocalStorage/IndexedDB** - Client-side caching
❌ **NOT using**: React, Vue, Node-specific libs

### Performance Optimizations:
- **Multi-tier caching**: KV (60s) → D1 (metadata) → R2 (historical)
- **Parallel fetching**: All data sources simultaneously
- **Lazy loading**: Charts render only when tab active
- **Debounced updates**: Prevent excessive API calls

### Credit Management (CMC Free Plan):
- **Daily limit**: 333 credits
- **Strategy**: Use only free tier endpoints strategically
- **Endpoints used**:
  - `listings/latest` (1 credit per 200 results): Every 15 min = 96/day
  - `global-metrics/quotes/latest` (1 credit): Every 30 min = 48/day
  - `quotes/latest` (1 credit per 100 symbols): As needed with 5 min cache
- **Derived features**:
  - Trending gainers/losers: Sorted from listings/latest
  - Market heatmap: Top tokens from listings with % changes
- **Total**: ~150-200 credits/day with aggressive caching ✅

---

**Ready to continue with the implementation? This is the complete foundation for Phase 1+!**

Let me know and I'll create all the implementation files! 🚀
