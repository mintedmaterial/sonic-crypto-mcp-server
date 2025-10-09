// Enhanced dashboard with data visualizations, charts, and interactive UI
// Implements Phase 1+ with CoinMarketCap integration and Chart.js visualizations

export function getEnhancedDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sonic Crypto Intelligence Platform</title>
  
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
      flex-wrap: wrap;
      gap: 1rem;
    }
    
    .header-title h1 {
      font-size: 1.75rem;
      font-weight: 700;
      background: linear-gradient(to right, var(--text-primary), var(--accent-orange));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .header-subtitle {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-top: 0.25rem;
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
      flex-wrap: wrap;
    }
    
    .nav-tab {
      flex: 1;
      min-width: 120px;
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
      .header { flex-direction: column; }
      .header-stats { flex-direction: column; gap: 1rem; }
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
      font-size: 1.125rem;
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
    
    .chart-container.large {
      height: 400px;
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
    
    .price-info {
      flex: 1;
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
      border: 1px solid transparent;
    }
    
    .heatmap-cell:hover {
      transform: scale(1.05);
      z-index: 10;
      border-color: rgba(255, 255, 255, 0.3);
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
      transition: all 0.2s;
    }
    
    .trending-item:hover {
      background: rgba(249, 115, 22, 0.1);
      transform: translateX(4px);
    }
    
    .trending-rank {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-secondary);
      width: 40px;
      text-align: center;
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
    
    .trending-stats {
      text-align: right;
    }
    
    .trending-price {
      font-size: 1.125rem;
      font-weight: 700;
    }
    
    .trending-change {
      font-size: 1rem;
      font-weight: 700;
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
    
    /* Chart controls */
    .chart-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    
    .chart-select {
      padding: 0.5rem;
      background: rgba(0,0,0,0.3);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-primary);
      cursor: pointer;
    }
    
    .chart-select:focus {
      outline: none;
      border-color: var(--accent-orange);
    }
    
    /* Info text */
    .info-text {
      color: var(--text-secondary);
      font-size: 0.875rem;
      line-height: 1.6;
    }
    
    /* Error message */
    .error-message {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--accent-red);
      padding: 1rem;
      border-radius: 8px;
      color: var(--accent-red);
      margin-bottom: 0.75rem;
    }
    
    /* Success message */
    .success-message {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid var(--accent-green);
      padding: 1rem;
      border-radius: 8px;
      color: var(--accent-green);
      margin-bottom: 0.75rem;
    }
    
    /* Community Feed Styles */
    .feed-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-left: 3px solid var(--accent-orange);
      border-radius: 8px;
      margin-bottom: 0.75rem;
      transition: all 0.2s;
    }
    
    .feed-item:hover {
      background: rgba(249, 115, 22, 0.1);
      transform: translateX(4px);
    }
    
    .feed-item.bullish {
      border-left-color: var(--accent-green);
    }
    
    .feed-item.bearish {
      border-left-color: var(--accent-red);
    }
    
    .feed-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-orange), var(--accent-blue));
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      flex-shrink: 0;
    }
    
    .feed-content {
      flex: 1;
      min-width: 0;
    }
    
    .feed-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    
    .feed-author {
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .feed-time {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    
    .feed-text {
      color: var(--text-primary);
      line-height: 1.5;
      margin-bottom: 0.5rem;
      word-wrap: break-word;
    }
    
    .feed-meta {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    
    .feed-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      background: rgba(249, 115, 22, 0.2);
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--accent-orange);
    }
    
    .feed-tag.token {
      background: rgba(59, 130, 246, 0.2);
      color: var(--accent-blue);
    }
    
    .feed-tag.bullish {
      background: rgba(16, 185, 129, 0.2);
      color: var(--accent-green);
    }
    
    .feed-tag.bearish {
      background: rgba(239, 68, 68, 0.2);
      color: var(--accent-red);
    }
    
    .nft-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-left: 3px solid var(--accent-blue);
      border-radius: 8px;
      margin-bottom: 0.75rem;
      transition: all 0.2s;
    }
    
    .nft-item:hover {
      background: rgba(59, 130, 246, 0.1);
      transform: translateX(4px);
    }
    
    .nft-image {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      object-fit: cover;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-orange));
      flex-shrink: 0;
    }
    
    .nft-details {
      flex: 1;
    }
    
    .nft-collection {
      font-weight: 700;
      font-size: 1rem;
      margin-bottom: 0.25rem;
    }
    
    .nft-price {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--accent-green);
      margin: 0.5rem 0;
    }
    
    .nft-meta {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    
    .stat-box {
      padding: 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      margin-bottom: 0.75rem;
      text-align: center;
    }
    
    .stat-box-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    
    .stat-box-value {
      font-size: 1.5rem;
      font-weight: 700;
    }
    
    .sentiment-gauge {
      display: flex;
      gap: 0.5rem;
      margin: 0.5rem 0;
    }
    
    .sentiment-bar {
      height: 8px;
      border-radius: 4px;
      transition: all 0.3s;
    }
    
    .sentiment-bar.bullish {
      background: var(--accent-green);
    }
    
    .sentiment-bar.bearish {
      background: var(--accent-red);
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
        <p class="header-subtitle">Real-time market data powered by AI</p>
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
        <!-- Live Prices -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">💹 Live Sonic Prices</div>
            <div class="card-action" onclick="refreshPrices()">🔄</div>
          </div>
          <div id="live-prices">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
        
        <!-- Market Sentiment -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">🧠 AI Market Sentiment</div>
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
      <!-- Price Chart with Technical Indicators -->
      <div class="card" style="margin-bottom: 1rem;">
        <div class="card-header">
          <div class="card-title">📈 Technical Analysis</div>
          <div class="chart-controls">
            <select id="chart-asset" onchange="updateChart()" class="chart-select">
              <option value="BTC-USD">BTC/USD</option>
              <option value="ETH-USD">ETH/USD</option>
              <option value="SONIC-USD">SONIC/USD</option>
              <option value="S-USD">S/USD</option>
            </select>
            <select id="chart-timeframe" onchange="updateChart()" class="chart-select">
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d" selected>1 Day</option>
              <option value="1w">1 Week</option>
            </select>
          </div>
        </div>
        <div class="chart-container large">
          <canvas id="price-chart"></canvas>
        </div>
      </div>
      
      <div class="grid grid-2">
        <!-- Volume Chart -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">📊 Volume Analysis</div>
          </div>
          <div class="chart-container">
            <canvas id="volume-chart"></canvas>
          </div>
        </div>
        
        <!-- Market Overview Chart -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">🌐 Market Distribution</div>
          </div>
          <div class="chart-container">
            <canvas id="market-chart"></canvas>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tab: Trading -->
    <div id="tab-trading" class="tab-content">
      <div class="grid grid-2">
        <!-- Orderly Markets -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">📖 Orderly DEX Markets</div>
            <div class="card-action" onclick="refreshOrderly()">🔄</div>
          </div>
          <div id="orderly-markets">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
        
        <!-- DexScreener Sonic Pairs -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">💧 Sonic DEX Pairs</div>
            <div class="card-action" onclick="refreshDexScreener()">🔄</div>
          </div>
          <div id="dex-pairs">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tab: Intelligence -->
    <div id="tab-intelligence" class="tab-content">
      <div class="grid grid-3">
        <!-- Community Feed (Discord) -->
        <div class="card" style="grid-column: span 2;">
          <div class="card-header">
            <div class="card-title">💬 Community Feed</div>
            <div style="display: flex; gap: 0.5rem;">
              <select id="feed-source" onchange="refreshCommunityFeed()" class="chart-select">
                <option value="tweets">Tweets & Posts</option>
                <option value="nft">NFT Activity</option>
                <option value="all">All Activity</option>
              </select>
              <div class="card-action" onclick="refreshCommunityFeed()">🔄</div>
            </div>
          </div>
          <div id="community-feed" style="max-height: 500px; overflow-y: auto;">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
        
        <!-- Community Stats -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">📊 Community Stats</div>
          </div>
          <div id="community-stats">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
        
        <!-- AI Insights -->
        <div class="card" style="grid-column: span 2;">
          <div class="card-header">
            <div class="card-title">🧠 AI Market Insights</div>
            <button class="card-action" style="padding: 0.5rem 1rem;" onclick="generateInsights()">Generate Report</button>
          </div>
          <div id="ai-insights">
            <p class="info-text">Click "Generate Report" to get AI-powered market analysis and trading opportunities.</p>
          </div>
        </div>
        
        <!-- Latest News -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">📰 Crypto News</div>
            <div class="card-action" onclick="refreshNews()">🔄</div>
          </div>
          <div id="news-feed">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    // =========================
    // LOGO RAINFALL ANIMATION
    // =========================
    
    const canvas = document.getElementById('logo-rain');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const logos = [];
    const logoCount = 30;
    const logoImg = new Image();
    logoImg.src = 'https://avatars.githubusercontent.com/u/180664396?s=200&v=4';
    
    class Logo {
      constructor() {
        this.reset();
      }
      
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * -canvas.height;
        this.size = Math.random() * 30 + 20;
        this.speed = Math.random() * 2 + 1;
        this.opacity = Math.random() * 0.3 + 0.1;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
      }
      
      update() {
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
        
        if (this.y > canvas.height + this.size) {
          this.reset();
        }
      }
      
      draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        if (logoImg.complete) {
          ctx.drawImage(logoImg, -this.size/2, -this.size/2, this.size, this.size);
        } else {
          // Fallback: draw orange square
          ctx.fillStyle = '#f97316';
          ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        }
        
        ctx.restore();
      }
    }
    
    // Initialize logos
    for (let i = 0; i < logoCount; i++) {
      logos.push(new Logo());
    }
    
    function animateLogos() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      logos.forEach(logo => {
        logo.update();
        logo.draw();
      });
      
      requestAnimationFrame(animateLogos);
    }
    
    animateLogos();
    
    // Resize handler
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
    
    // =========================
    // TAB NAVIGATION
    // =========================
    
    function showTab(tabName) {
      // Hide all tabs
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      
      // Remove active from all nav buttons
      document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Show selected tab
      document.getElementById(\`tab-\${tabName}\`).classList.add('active');
      
      // Mark nav button as active
      event.target.classList.add('active');
      
      // Load tab data if needed
      if (tabName === 'charts' && !window.chartsInitialized) {
        initializeCharts();
      } else if (tabName === 'trading') {
        refreshOrderly();
        refreshDexScreener();
      } else if (tabName === 'intelligence') {
        refreshNews();
        refreshCommunityFeed(); // Load Discord community feed
      }
    }
    
    // =========================
    // DATA FETCHING
    // =========================
    
    async function loadGlobalStats() {
      try {
        const response = await fetch('/api/global-market');
        const data = await response.json();
        
        if (data.success) {
          const stats = data.data;
          document.getElementById('global-stats').innerHTML = \`
            <div class="stat-item">
              <div class="stat-label">Total Market Cap</div>
              <div class="stat-value">$\${(stats.market_cap.total / 1e12).toFixed(2)}T</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">24h Volume</div>
              <div class="stat-value">$\${(stats.volume_24h.total / 1e9).toFixed(2)}B</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">BTC Dominance</div>
              <div class="stat-value">\${stats.dominance.btc.toFixed(1)}%</div>
            </div>
          \`;
        }
      } catch (error) {
        console.error('Failed to load global stats:', error);
      }
    }
    
    async function refreshTrending() {
      const gainersEl = document.getElementById('trending-gainers');
      const losersEl = document.getElementById('trending-losers');
      
      gainersEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      losersEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      
      try {
        const response = await fetch('/api/trending');
        const data = await response.json();
        
        if (data.success) {
          // Render gainers
          gainersEl.innerHTML = data.data.gainers.slice(0, 5).map((token, i) => \`
            <div class="trending-item">
              <div class="trending-rank">\${i + 1}</div>
              <div class="trending-info">
                <div class="trending-symbol">\${token.symbol}</div>
                <div class="trending-name">\${token.name}</div>
              </div>
              <div class="trending-stats">
                <div class="trending-price">$\${token.price.toFixed(token.price < 1 ? 6 : 2)}</div>
                <div class="trending-change price-change positive">+\${token.percent_change_24h.toFixed(2)}%</div>
              </div>
            </div>
          \`).join('');
          
          // Render losers
          losersEl.innerHTML = data.data.losers.slice(0, 5).map((token, i) => \`
            <div class="trending-item">
              <div class="trending-rank">\${i + 1}</div>
              <div class="trending-info">
                <div class="trending-symbol">\${token.symbol}</div>
                <div class="trending-name">\${token.name}</div>
              </div>
              <div class="trending-stats">
                <div class="trending-price">$\${token.price.toFixed(token.price < 1 ? 6 : 2)}</div>
                <div class="trending-change price-change negative">\${token.percent_change_24h.toFixed(2)}%</div>
              </div>
            </div>
          \`).join('');
          
          // Update heatmap
          updateHeatmap(data.data.gainers.concat(data.data.losers));
        }
      } catch (error) {
        gainersEl.innerHTML = '<div class="error-message">Failed to load trending data</div>';
        losersEl.innerHTML = '<div class="error-message">Failed to load trending data</div>';
      }
    }
    
    function updateHeatmap(tokens) {
      const heatmapEl = document.getElementById('market-heatmap');
      
      heatmapEl.innerHTML = '<div class="heatmap-grid">' + 
        tokens.slice(0, 9).map(token => {
          const change = token.percent_change_24h;
          const intensity = Math.min(Math.abs(change) / 20, 1);
          const bgColor = change > 0 
            ? \`rgba(16, 185, 129, \${intensity})\`
            : \`rgba(239, 68, 68, \${intensity})\`;
          
          return \`
            <div class="heatmap-cell" style="background: \${bgColor};">
              <div class="heatmap-cell-symbol">\${token.symbol}</div>
              <div class="heatmap-cell-change">\${change > 0 ? '+' : ''}\${change.toFixed(1)}%</div>
            </div>
          \`;
        }).join('') + '</div>';
    }
    
    async function refreshPrices() {
      const pricesEl = document.getElementById('live-prices');
      pricesEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      
      try {
        const instruments = ['BTC-USD', 'ETH-USD', 'SONIC-USD', 'S-USD'];
        const response = await fetch('/api/price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instruments })
        });
        
        const data = await response.json();
        
        if (data.success) {
          pricesEl.innerHTML = Object.entries(data.data).map(([symbol, price]) => \`
            <div class="price-item">
              <div class="price-info">
                <div class="price-label">\${symbol}</div>
                <div class="price-value">$\${price.price.toFixed(price.price < 1 ? 6 : 2)}</div>
              </div>
              <div class="price-change \${price.change_24h >= 0 ? 'positive' : 'negative'}">
                \${price.change_24h >= 0 ? '+' : ''}\${price.change_24h?.toFixed(2) || 'N/A'}%
              </div>
            </div>
          \`).join('');
        }
      } catch (error) {
        pricesEl.innerHTML = '<div class="error-message">Failed to load prices</div>';
      }
    }
    
    async function refreshSentiment() {
      const sentimentEl = document.getElementById('sentiment-content');
      sentimentEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      
      try {
        const response = await fetch('/api/sentiment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentiment_sources: ['price_action', 'volume_analysis']
          })
        });
        
        const data = await response.json();
        
        if (data.success && data.data.ai_analysis) {
          sentimentEl.innerHTML = \`
            <div class="info-text">\${data.data.ai_analysis}</div>
          \`;
        } else {
          sentimentEl.innerHTML = '<div class="info-text">Sentiment analysis unavailable</div>';
        }
      } catch (error) {
        sentimentEl.innerHTML = '<div class="error-message">Failed to load sentiment</div>';
      }
    }
    
    async function refreshOrderly() {
      const orderlyEl = document.getElementById('orderly-markets');
      orderlyEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      
      try {
        const response = await fetch('/api/orderly/markets');
        const data = await response.json();
        
        if (data.success && data.data.rows) {
          orderlyEl.innerHTML = data.data.rows.slice(0, 10).map(market => \`
            <div class="price-item">
              <div class="price-info">
                <div class="price-label">\${market.symbol}</div>
                <div class="price-value">$\${parseFloat(market.index_price || 0).toFixed(2)}</div>
              </div>
              <div class="price-change \${parseFloat(market.change_24h || 0) >= 0 ? 'positive' : 'negative'}">
                \${parseFloat(market.change_24h || 0).toFixed(2)}%
              </div>
            </div>
          \`).join('');
        }
      } catch (error) {
        orderlyEl.innerHTML = '<div class="error-message">Failed to load Orderly markets</div>';
      }
    }
    
    async function refreshDexScreener() {
      const dexEl = document.getElementById('dex-pairs');
      dexEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      
      try {
        const response = await fetch('/api/dexscreener/sonic');
        const data = await response.json();
        
        if (data.success && data.data.pairs) {
          dexEl.innerHTML = data.data.pairs.slice(0, 10).map(pair => \`
            <div class="price-item">
              <div class="price-info">
                <div class="price-label">\${pair.baseToken.symbol}/\${pair.quoteToken.symbol}</div>
                <div class="price-value">$\${parseFloat(pair.priceUsd || 0).toFixed(6)}</div>
              </div>
              <div class="price-change \${pair.priceChange?.h24 >= 0 ? 'positive' : 'negative'}">
                \${pair.priceChange?.h24 ? (pair.priceChange.h24 >= 0 ? '+' : '') + pair.priceChange.h24.toFixed(2) + '%' : 'N/A'}
              </div>
            </div>
          \`).join('');
        }
      } catch (error) {
        dexEl.innerHTML = '<div class="error-message">Failed to load DEX pairs</div>';
      }
    }
    
    async function refreshNews() {
      const newsEl = document.getElementById('news-feed');
      newsEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      
      try {
        const response = await fetch('/api/news?query=cryptocurrency+sonic+blockchain&count=5');
        const data = await response.json();
        
        if (data.success && data.data.web?.results) {
          newsEl.innerHTML = data.data.web.results.map(article => \`
            <div class="price-item" style="display: block; cursor: pointer;" onclick="window.open('\${article.url}', '_blank')">
              <div class="price-label">\${article.title}</div>
              <div class="info-text" style="margin-top: 0.5rem;">\${article.description?.substring(0, 100)}...</div>
            </div>
          \`).join('');
        } else {
          newsEl.innerHTML = '<div class="info-text">News search requires Brave API key configuration</div>';
        }
      } catch (error) {
        newsEl.innerHTML = '<div class="info-text">News unavailable</div>';
      }
    }
    
    // =========================
    // COMMUNITY FEED (DISCORD)
    // =========================
    
    // Configuration - Set your Discord channel IDs here
    const DISCORD_CONFIG = {
      nft_channel_id: localStorage.getItem('discord_nft_channel') || '',
      tweet_channel_id: localStorage.getItem('discord_tweet_channel') || ''
    };
    
    async function refreshCommunityFeed() {
      const feedEl = document.getElementById('community-feed');
      const statsEl = document.getElementById('community-stats');
      const feedSource = document.getElementById('feed-source').value;
      
      feedEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      statsEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      
      // Check if Discord is configured
      if (!DISCORD_CONFIG.nft_channel_id && !DISCORD_CONFIG.tweet_channel_id) {
        feedEl.innerHTML = \`
          <div class="info-text" style="padding: 2rem; text-align: center;">
            <p style="margin-bottom: 1rem;">Discord Community Feed not configured</p>
            <p style="font-size: 0.875rem; color: var(--text-secondary);">
              To enable this feature, set your Discord channel IDs in the browser console:
            </p>
            <pre style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; margin-top: 1rem; text-align: left; font-size: 0.75rem;">
localStorage.setItem('discord_nft_channel', 'YOUR_NFT_CHANNEL_ID');
localStorage.setItem('discord_tweet_channel', 'YOUR_TWEET_CHANNEL_ID');
location.reload();
            </pre>
            <p style="margin-top: 1rem; font-size: 0.875rem;">
              See <a href="/api/docs" style="color: var(--accent-orange);">DISCORD-COMMUNITY-INTEL.md</a> for setup instructions
            </p>
          </div>
        \`;
        statsEl.innerHTML = '<div class="info-text">Configure Discord channels to view stats</div>';
        return;
      }
      
      try {
        const response = await fetch('/api/discord/intel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nft_channel_id: DISCORD_CONFIG.nft_channel_id,
            tweet_channel_id: DISCORD_CONFIG.tweet_channel_id,
            limit: 30,
            intel_type: feedSource === 'all' ? 'all' : feedSource
          })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          feedEl.innerHTML = \`<div class="error-message">\${data.error || 'Failed to fetch community intel'}</div>\`;
          statsEl.innerHTML = '<div class="error-message">Error loading stats</div>';
          return;
        }
        
        // Render feed based on type
        if (feedSource === 'tweets' || feedSource === 'all') {
          renderTweetFeed(data.data, feedEl);
        } else if (feedSource === 'nft') {
          renderNFTFeed(data.data, feedEl);
        }
        
        // Render stats
        renderCommunityStats(data.data.summary || data.data, statsEl);
        
      } catch (error) {
        console.error('Community feed error:', error);
        feedEl.innerHTML = '<div class="error-message">Failed to load community feed. Check Discord bot configuration.</div>';
        statsEl.innerHTML = '<div class="error-message">Stats unavailable</div>';
      }
    }
    
    function renderTweetFeed(data, container) {
      const tweets = data.tweet_intel?.intel || data.intel || [];
      
      if (tweets.length === 0) {
        container.innerHTML = '<div class="info-text">No recent community posts</div>';
        return;
      }
      
      container.innerHTML = tweets.map(tweet => {
        const timeAgo = getTimeAgo(tweet.timestamp);
        const initials = tweet.author?.substring(0, 2).toUpperCase() || '??';
        const sentimentClass = tweet.sentiment || 'neutral';
        
        return \`
          <div class="feed-item \${sentimentClass}">
            <div class="feed-avatar">\${initials}</div>
            <div class="feed-content">
              <div class="feed-header">
                <span class="feed-author">\${tweet.author || 'Anonymous'}</span>
                <span class="feed-time">\${timeAgo}</span>
              </div>
              <div class="feed-text">\${escapeHtml(tweet.content)}</div>
              <div class="feed-meta">
                \${tweet.sentiment ? \`<span class="feed-tag \${tweet.sentiment}">\${tweet.sentiment.toUpperCase()}</span>\` : ''}
                \${tweet.tokens_mentioned?.map(token => \`<span class="feed-tag token">$\${token}</span>\`).join('') || ''}
                \${tweet.keywords?.slice(0, 3).map(kw => \`<span class="feed-tag">\${kw}</span>\`).join('') || ''}
                \${tweet.has_image ? '<span class="feed-tag">📷 Image</span>' : ''}
                \${tweet.twitter_url ? \`<a href="\${tweet.twitter_url}" target="_blank" class="feed-tag" style="text-decoration: none;">🐦 View Tweet</a>\` : ''}
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }
    
    function renderNFTFeed(data, container) {
      const nfts = data.nft_intel?.intel || data.intel || [];
      
      if (nfts.length === 0) {
        container.innerHTML = '<div class="info-text">No recent NFT activity</div>';
        return;
      }
      
      container.innerHTML = nfts.map(nft => {
        const timeAgo = getTimeAgo(nft.timestamp);
        const typeEmoji = {
          sale: '💰',
          mint: '✨',
          transfer: '📤',
          listing: '📋'
        }[nft.type] || '🔷';
        
        return \`
          <div class="nft-item">
            <img src="\${nft.image_url || 'https://via.placeholder.com/80?text=NFT'}" 
                 alt="\${nft.collection_name || 'NFT'}" 
                 class="nft-image"
                 onerror="this.src='https://via.placeholder.com/80?text=NFT'">
            <div class="nft-details">
              <div class="nft-collection">\${typeEmoji} \${nft.collection_name || 'Unknown Collection'} \${nft.token_id ? '#' + nft.token_id : ''}</div>
              \${nft.price ? \`<div class="nft-price">\${nft.price} \${nft.currency || 'ETH'}</div>\` : ''}
              <div class="nft-meta">
                <div>\${nft.type?.toUpperCase() || 'TRANSACTION'} • \${timeAgo}</div>
                \${nft.marketplace ? \`<div>Marketplace: \${nft.marketplace}</div>\` : ''}
                \${nft.transaction_hash ? \`<div><a href="https://etherscan.io/tx/\${nft.transaction_hash}" target="_blank" style="color: var(--accent-blue);">View TX</a></div>\` : ''}
              </div>
            </div>
          </div>
        \`;
      }).join('');
    }
    
    function renderCommunityStats(data, container) {
      const summary = data.summary || data;
      
      const bullishPercent = summary.total_tweets > 0 
        ? (summary.bullish_sentiment / summary.total_tweets * 100).toFixed(0)
        : 0;
      const bearishPercent = summary.total_tweets > 0
        ? (summary.bearish_sentiment / summary.total_tweets * 100).toFixed(0)
        : 0;
      
      container.innerHTML = \`
        <div class="stat-box">
          <div class="stat-box-label">Community Posts</div>
          <div class="stat-box-value">\${summary.total_tweets || 0}</div>
        </div>
        
        <div class="stat-box">
          <div class="stat-box-label">NFT Transactions</div>
          <div class="stat-box-value">\${summary.total_nft_transactions || 0}</div>
          \${summary.total_nft_volume ? \`<div class="info-text" style="margin-top: 0.5rem;">\${summary.total_nft_volume.toFixed(2)} ETH Volume</div>\` : ''}
        </div>
        
        <div class="stat-box">
          <div class="stat-box-label">Sentiment</div>
          <div class="sentiment-gauge">
            <div class="sentiment-bar bullish" style="flex: \${bullishPercent}; min-width: 4px;" title="Bullish: \${bullishPercent}%"></div>
            <div class="sentiment-bar bearish" style="flex: \${bearishPercent}; min-width: 4px;" title="Bearish: \${bearishPercent}%"></div>
          </div>
          <div class="info-text" style="margin-top: 0.5rem;">
            <span style="color: var(--accent-green);">\${summary.bullish_sentiment || 0} Bullish</span> • 
            <span style="color: var(--accent-red);">\${summary.bearish_sentiment || 0} Bearish</span>
          </div>
        </div>
        
        \${summary.top_tokens_mentioned && summary.top_tokens_mentioned.length > 0 ? \`
          <div class="stat-box">
            <div class="stat-box-label">Top Tokens</div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
              \${summary.top_tokens_mentioned.slice(0, 5).map(token => \`
                <span class="feed-tag token">$\${token}</span>
              \`).join('')}
            </div>
          </div>
        \` : ''}
      \`;
    }
    
    function getTimeAgo(timestamp) {
      const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
      
      if (seconds < 60) return 'Just now';
      if (seconds < 3600) return \`\${Math.floor(seconds / 60)}m ago\`;
      if (seconds < 86400) return \`\${Math.floor(seconds / 3600)}h ago\`;
      return \`\${Math.floor(seconds / 86400)}d ago\`;
    }
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    async function generateInsights() {
      const insightsEl = document.getElementById('ai-insights');
      insightsEl.innerHTML = '<div class="loading"><div class="spinner"></div><p>Analyzing market data...</p></div>';
      
      try {
        const response = await fetch('/api/opportunities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opportunity_types: ['yield_farming', 'arbitrage'],
            risk_tolerance: 'medium'
          })
        });
        
        const data = await response.json();
        
        if (data.success && data.data.ai_analysis) {
          insightsEl.innerHTML = \`
            <div class="success-message">AI Analysis Complete</div>
            <div class="info-text">\${data.data.ai_analysis}</div>
          \`;
        } else {
          insightsEl.innerHTML = '<div class="error-message">AI analysis unavailable</div>';
        }
      } catch (error) {
        insightsEl.innerHTML = '<div class="error-message">Failed to generate insights</div>';
      }
    }
    
    // =========================
    // CHARTS
    // =========================
    
    let priceChart, volumeChart, marketChart;
    window.chartsInitialized = false;
    
    function initializeCharts() {
      if (window.chartsInitialized) return;
      
      // Price chart
      const priceCtx = document.getElementById('price-chart').getContext('2d');
      priceChart = new Chart(priceCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Price',
            data: [],
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { 
              grid: { color: 'rgba(255,255,255,0.1)' },
              ticks: { color: '#a1a1aa' }
            },
            y: { 
              grid: { color: 'rgba(255,255,255,0.1)' },
              ticks: { color: '#a1a1aa' }
            }
          }
        }
      });
      
      // Volume chart
      const volumeCtx = document.getElementById('volume-chart').getContext('2d');
      volumeChart = new Chart(volumeCtx, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            label: 'Volume',
            data: [],
            backgroundColor: '#3b82f6'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { 
              grid: { color: 'rgba(255,255,255,0.1)' },
              ticks: { color: '#a1a1aa' }
            },
            y: { 
              grid: { color: 'rgba(255,255,255,0.1)' },
              ticks: { color: '#a1a1aa' }
            }
          }
        }
      });
      
      // Market distribution chart
      const marketCtx = document.getElementById('market-chart').getContext('2d');
      marketChart = new Chart(marketCtx, {
        type: 'doughnut',
        data: {
          labels: ['BTC', 'ETH', 'Stablecoins', 'DeFi', 'Others'],
          datasets: [{
            data: [48, 18, 15, 10, 9],
            backgroundColor: ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#6b7280']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#a1a1aa' }
            }
          }
        }
      });
      
      window.chartsInitialized = true;
      updateChart();
    }
    
    async function updateChart() {
      const asset = document.getElementById('chart-asset').value;
      const timeframe = document.getElementById('chart-timeframe').value;
      
      try {
        const response = await fetch(\`/api/historical-daily?instruments=[\"\${asset}\"]&start_date=\${new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]}\`);
        const data = await response.json();
        
        if (data.success && data.data[asset]) {
          const prices = data.data[asset];
          priceChart.data.labels = prices.map(p => new Date(p.time).toLocaleDateString());
          priceChart.data.datasets[0].data = prices.map(p => p.close);
          priceChart.update();
          
          volumeChart.data.labels = prices.map(p => new Date(p.time).toLocaleDateString());
          volumeChart.data.datasets[0].data = prices.map(p => p.volume || 0);
          volumeChart.update();
        }
      } catch (error) {
        console.error('Failed to update chart:', error);
      }
    }
    
    // =========================
    // INITIALIZATION
    // =========================
    
    // Load initial data
    loadGlobalStats();
    refreshTrending();
    refreshPrices();
    refreshSentiment();
    
    // Auto-refresh every 60 seconds
    setInterval(() => {
      loadGlobalStats();
      refreshTrending();
      refreshPrices();
    }, 60000);
  </script>
</body>
</html>`;
}
