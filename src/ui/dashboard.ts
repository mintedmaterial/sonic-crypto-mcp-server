// Sonic-themed dashboard with logo rainfall background and AI chat
// Matches the Sonic Genie branding: neutral-950 background, orange accents

export function getSonicDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sonic Crypto MCP Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg-primary: #0a0a0b;
      --bg-secondary: #18181b;
      --bg-card: #27272a;
      --text-primary: #fafafa;
      --text-secondary: #a1a1aa;
      --accent-orange: #f97316;
      --accent-orange-hover: #ea580c;
      --border: #3f3f46;
      --success: #22c55e;
      --error: #ef4444;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Logo rainfall background canvas */
    #logo-rain {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
    }

    /* Gradient overlay for depth */
    .gradient-overlay {
      position: fixed;
      inset: 0;
      background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.2), transparent);
      pointer-events: none;
      z-index: 1;
    }

    /* Main container */
    .container {
      position: relative;
      z-index: 2;
      max-width: 1400px;
      margin: 0 auto;
      padding: 1rem;
    }

    /* Header */
    .header {
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 2rem;
      border-radius: 16px;
      margin-bottom: 1.5rem;
      backdrop-filter: blur(20px);
      background: rgba(39, 39, 42, 0.8);
    }

    h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      background: linear-gradient(to right, var(--text-primary), var(--text-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      color: var(--text-secondary);
      font-size: 1rem;
    }

    /* Grid layout */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    /* Cards */
    .card {
      background: rgba(39, 39, 42, 0.6);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      backdrop-filter: blur(20px);
      transition: all 0.2s ease;
    }

    .card:hover {
      border-color: var(--accent-orange);
      transform: translateY(-2px);
    }

    .card h2 {
      color: var(--text-primary);
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Price items */
    .price-item {
      margin: 0.75rem 0;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.3);
      border-left: 3px solid var(--accent-orange);
      border-radius: 8px;
    }

    .price-label {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
      font-weight: 500;
    }

    .price-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .price-change {
      font-size: 0.875rem;
      font-weight: 600;
      margin-top: 0.25rem;
    }

    .price-change.positive { color: var(--success); }
    .price-change.negative { color: var(--error); }

    /* Chat container */
    .chat-container {
      grid-column: 1 / -1;
      background: rgba(39, 39, 42, 0.8);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      backdrop-filter: blur(20px);
      min-height: 500px;
      display: flex;
      flex-direction: column;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      margin-bottom: 1rem;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      max-height: 400px;
    }

    .message {
      margin: 0.75rem 0;
      padding: 0.875rem 1rem;
      border-radius: 12px;
      max-width: 85%;
      animation: fadeIn 0.3s ease;
      line-height: 1.5;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message.user {
      background: var(--accent-orange);
      color: white;
      margin-left: auto;
      text-align: right;
    }

    .message.assistant {
      background: var(--bg-card);
      border: 1px solid var(--border);
      margin-right: auto;
    }

    .chat-input-container {
      display: flex;
      gap: 0.75rem;
    }

    .chat-input {
      flex: 1;
      padding: 0.875rem 1rem;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-primary);
      font-size: 0.9375rem;
      transition: all 0.2s;
    }

    .chat-input:focus {
      outline: none;
      border-color: var(--accent-orange);
      box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
    }

    .chat-input::placeholder {
      color: var(--text-secondary);
    }

    /* Buttons */
    button {
      background: var(--accent-orange);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9375rem;
      font-weight: 600;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    button:hover {
      background: var(--accent-orange-hover);
      transform: translateY(-1px);
    }

    button:active {
      transform: translateY(0);
    }

    /* Loading spinner */
    .spinner {
      border: 3px solid rgba(249, 115, 22, 0.2);
      border-top-color: var(--accent-orange);
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
    }

    /* Error message */
    .error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--error);
      padding: 1rem;
      border-radius: 8px;
      color: var(--error);
    }

    /* Sentiment box */
    .sentiment-box {
      background: rgba(0, 0, 0, 0.2);
      border-left: 4px solid var(--accent-orange);
      padding: 1rem;
      border-radius: 8px;
      margin-top: 0.75rem;
      line-height: 1.6;
    }

    /* Tool calling indicators */
    .message.thinking {
      font-style: italic;
      opacity: 0.7;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    .tools-used {
      margin-top: 12px;
      padding: 8px 12px;
      background: rgba(249, 115, 22, 0.1);
      border-left: 3px solid var(--accent-orange);
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .tools-label {
      font-weight: 600;
      margin-right: 8px;
      color: var(--text-secondary);
    }

    .tool-badge {
      display: inline-block;
      padding: 2px 8px;
      margin: 2px 4px;
      background: rgba(249, 115, 22, 0.2);
      border-radius: 12px;
      font-size: 0.8125rem;
      color: var(--text-primary);
    }

    .citations {
      margin-top: 8px;
      font-size: 0.8125rem;
    }

    .citations summary {
      cursor: pointer;
      color: var(--text-secondary);
      padding: 4px 0;
      user-select: none;
    }

    .citations summary:hover {
      color: var(--accent-orange);
    }

    .citation-list {
      margin-top: 8px;
      padding-left: 16px;
      border-left: 2px solid rgba(249, 115, 22, 0.3);
    }

    .citation {
      padding: 4px 0;
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .citation strong {
      color: var(--text-primary);
    }

    .suggested-prompts {
      margin-bottom: 20px;
      padding: 12px;
      background: rgba(39, 39, 42, 0.6);
      border-radius: 8px;
      border: 1px solid rgba(249, 115, 22, 0.2);
    }

    .suggestions-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    .suggestion-btn {
      display: block;
      width: 100%;
      margin: 6px 0;
      padding: 8px 12px;
      background: rgba(249, 115, 22, 0.1);
      border: 1px solid rgba(249, 115, 22, 0.3);
      border-radius: 6px;
      color: var(--text-primary);
      text-align: left;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .suggestion-btn:hover {
      background: rgba(249, 115, 22, 0.2);
      border-color: var(--accent-orange);
      transform: translateX(4px);
    }

    .message-content {
      line-height: 1.6;
    }

    .message.error {
      background: rgba(239, 68, 68, 0.1);
      border-left-color: var(--error);
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: var(--accent-orange);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }
      h1 {
        font-size: 1.5rem;
      }
      .container {
        padding: 0.75rem;
      }
    }
  </style>
</head>
<body>
  <!-- Logo rainfall background -->
  <canvas id="logo-rain"></canvas>
  <div class="gradient-overlay"></div>

  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🚀 Sonic Crypto MCP Server</h1>
      <p class="subtitle">Real-time cryptocurrency data powered by AI • <a href="/api/docs" style="color: var(--accent-orange);">API Docs</a></p>
    </div>

    <!-- Data cards -->
    <div class="grid">
      <!-- Live Prices -->
      <div class="card">
        <h2>📊 Live Prices</h2>
        <div id="prices-content">
          <div class="loading">
            <div class="spinner"></div>
            <p style="margin-top: 0.5rem;">Loading prices...</p>
          </div>
        </div>
        <button onclick="refreshPrices()" style="margin-top: 1rem; width: 100%;">🔄 Refresh</button>
      </div>

      <!-- Market Sentiment -->
      <div class="card">
        <h2>🧠 Market Sentiment</h2>
        <div id="sentiment-content">
          <div class="loading">
            <div class="spinner"></div>
            <p style="margin-top: 0.5rem;">Analyzing...</p>
          </div>
        </div>
        <button onclick="refreshSentiment()" style="margin-top: 1rem; width: 100%;">🔄 Analyze</button>
      </div>

      <!-- Crypto News -->
      <div class="card">
        <h2>📰 Latest News</h2>
        <div id="news-content">
          <div class="loading">
            <div class="spinner"></div>
            <p style="margin-top: 0.5rem;">Fetching news...</p>
          </div>
        </div>
        <button onclick="refreshNews()" style="margin-top: 1rem; width: 100%;">🔄 Refresh</button>
      </div>
    </div>

    <!-- AI Chat -->
    <div class="chat-container">
      <h2>💬 AI Chat Assistant</h2>
      <p style="color: var(--text-secondary); margin-bottom: 1rem; font-size: 0.9375rem;">Ask about Sonic ecosystem, prices, sentiment, or DeFi opportunities</p>

      <div class="chat-messages" id="chat-messages">
        <div class="message assistant">
          👋 Hello! I'm your Sonic Crypto AI assistant powered by Hermes 2 Pro Mistral 7B.<br><br>
          I can help you with:<br>
          • Live cryptocurrency prices (BTC, ETH, S-USD, SONIC)<br>
          • Market sentiment analysis<br>
          • Crypto news and updates<br>
          • DeFi opportunities on Sonic<br>
          • Technical analysis<br><br>
          What would you like to know?
        </div>
      </div>

      <div class="chat-input-container">
        <input
          type="text"
          class="chat-input"
          id="chat-input"
          placeholder="Ask me about Sonic, prices, opportunities..."
          onkeypress="if(event.key==='Enter') sendMessage()"
        />
        <button onclick="sendMessage()">Send →</button>
      </div>
    </div>
  </div>

  <script>
    // Logo rainfall animation with DEX/NFT logos
    const canvas = document.getElementById('logo-rain');
    const ctx = canvas.getContext('2d');

    // Logo URLs from Sonic ecosystem
    const logoPngs = [
      'https://dexscreener.com/favicon.png',
      'https://dd.dexscreener.com/ds-data/dexes/sonic-market.png',
      'https://dd.dexscreener.com/ds-data/dexes/sonic-swap.png',
      'https://dd.dexscreener.com/ds-data/dexes/metropolis.png',
      'https://dd.dexscreener.com/ds-data/dexes/equalizer.png',
      'https://dd.dexscreener.com/ds-data/dexes/shadow-exchange.png',
      'https://dd.dexscreener.com/ds-data/dexes/wagmi.png',
      'https://dd.dexscreener.com/ds-data/dexes/beets.png',
      'https://dd.dexscreener.com/ds-data/dexes/spookyswap.png',
      'https://dd.dexscreener.com/ds-data/tokens/sonic/0xe51ee9868c1f0d6cd968a8b8c8376dc2991bfe44.png?key=50f8b4'
    ];

    const loadedImages = [];
    const loadedIndices = new Set();
    const drops = [];
    let animationId;

    // Create fallback colored squares
    function createFallback(color, text) {
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const context = c.getContext('2d');
      context.fillStyle = color;
      context.fillRect(0, 0, 32, 32);
      context.fillStyle = 'white';
      context.font = '12px Arial';
      context.textAlign = 'center';
      context.fillText(text, 16, 20);
      const img = new Image();
      img.src = c.toDataURL();
      return img;
    }

    // Add fallback images
    [
      ['#f97316', 'S'],  // Sonic orange
      ['#3B82F6', 'D'],  // DeFi blue
      ['#10B981', 'N'],  // NFT green
      ['#8B5CF6', 'T']   // Token purple
    ].forEach(([color, text]) => {
      const img = createFallback(color, text);
      img.onload = () => {
        loadedIndices.add(loadedImages.length);
        loadedImages.push(img);
      };
    });

    // Load external logos
    logoPngs.forEach((src) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loadedIndices.add(loadedImages.length);
        loadedImages.push(img);
      };
      img.onerror = () => console.warn('Failed to load:', src);
      img.src = src;
    });

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function getRandomImage() {
      const loaded = Array.from(loadedIndices).map(i => loadedImages[i]).filter(img => img && img.complete);
      return loaded.length > 0 ? loaded[Math.floor(Math.random() * loaded.length)] : null;
    }

    function createDrop() {
      const img = getRandomImage();
      if (!img) return null;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height * 2,
        speed: Math.random() * 2 + 1,
        size: Math.random() * 40 + 20,
        img,
        z: Math.random() < 0.85 ? 'behind' : 'above'
      };
    }

    // Initialize drops gradually
    setTimeout(() => {
      for (let i = 0; i < 3; i++) {
        const drop = createDrop();
        if (drop) drops.push(drop);
      }
      const maxDrops = Math.floor((canvas.width * canvas.height) / 2000);
      const addInterval = setInterval(() => {
        if (drops.length >= maxDrops) {
          clearInterval(addInterval);
          return;
        }
        const drop = createDrop();
        if (drop) drops.push(drop);
      }, 800);
    }, 500);

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw behind drops
      drops.filter(d => d.z === 'behind').forEach(drop => {
        if (drop.img && drop.img.complete) {
          ctx.globalAlpha = 0.3;
          ctx.drawImage(drop.img, drop.x, drop.y, drop.size, drop.size);
        }
      });

      // Draw above drops with shadow
      drops.filter(d => d.z === 'above').forEach(drop => {
        if (drop.img && drop.img.complete) {
          ctx.globalAlpha = 0.7;
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          ctx.drawImage(drop.img, drop.x, drop.y, drop.size, drop.size);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
      });

      ctx.globalAlpha = 1;

      // Update positions
      drops.forEach((drop, i) => {
        drop.y += drop.speed;
        if (drop.y > canvas.height + drop.size) {
          const newDrop = createDrop();
          if (newDrop) drops[i] = newDrop;
        }
      });

      animationId = requestAnimationFrame(animate);
    }

    animate();

    // API functions
    async function callMCPTool(toolName, args) {
      const response = await fetch('/mcp/tools/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: toolName, arguments: args })
      });
      return await response.json();
    }

    // Refresh prices
    async function refreshPrices() {
      const el = document.getElementById('prices-content');
      el.innerHTML = '<div class="loading"><div class="spinner"></div><p style="margin-top: 0.5rem;">Loading...</p></div>';

      try {
        const result = await callMCPTool('get_latest_index_tick', {
          market: 'orderly',
          instruments: ['BTC-USD', 'ETH-USD', 'S-USD', 'SONIC-USD']
        });

        if (result.success && result.data) {
          let html = '';
          const data = result.data.data || [];
          const sources = result.data.sources_used || [];
          const errors = result.data.errors || [];

          // Display data source badges
          if (sources.length > 0) {
            html += '<div style="margin-bottom: 12px; font-size: 0.8125rem; color: var(--text-secondary);">';
            html += '<strong>Data Sources:</strong> ';
            sources.forEach(source => {
              const color = source === 'orderly' ? '#3B82F6' : 
                           source === 'dexscreener' ? '#10B981' : '#f97316';
              html += \`<span style="background: \${color}; color: white; padding: 2px 8px; border-radius: 4px; margin-right: 5px;">\${source.toUpperCase()}</span>\`;
            });
            html += '</div>';
          }

          data.forEach(item => {
            const price = item.VALUE?.PRICE || 0;
            const change = item.CURRENT_DAY?.CHANGE_PERCENTAGE || 0;
            const changeClass = change >= 0 ? 'positive' : 'negative';
            const changeSymbol = change >= 0 ? '↑' : '↓';
            const source = item.SOURCE || 'unknown';
            const sourceEmoji = source === 'orderly' ? '🔷' : 
                               source === 'dexscreener' ? '💎' : '🏦';

            html += \`
              <div class="price-item">
                <div class="price-label">\${sourceEmoji} \${item.INSTRUMENT || 'Unknown'}</div>
                <div class="price-value">$\${typeof price === 'number' ? price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 8}) : 'N/A'}</div>
                <div class="price-change \${changeClass}">
                  \${changeSymbol} \${Math.abs(change).toFixed(2)}%
                </div>
              </div>
            \`;
          });

          // Show errors if any
          if (errors.length > 0) {
            html += '<div style="margin-top: 12px; font-size: 0.8125rem; color: var(--text-secondary);">';
            html += '<details><summary style="cursor: pointer;">⚠️ Some errors occurred</summary>';
            html += '<ul style="margin: 8px 0 0 20px;">';
            errors.forEach(err => html += \`<li>\${err}</li>\`);
            html += '</ul></details></div>';
          }

          el.innerHTML = html || '<p style="color: var(--text-secondary);">No price data available</p>';
        } else {
          throw new Error(result.error || 'Invalid response');
        }
      } catch (error) {
        el.innerHTML = \`<div class="error">❌ Error: \${error.message}<br><br>Try refreshing or check <a href="/api/docs" style="color: var(--accent-orange);">API docs</a></div>\`;
      }
    }

    // Refresh sentiment
    async function refreshSentiment() {
      const el = document.getElementById('sentiment-content');
      el.innerHTML = '<div class="loading"><div class="spinner"></div><p style="margin-top: 0.5rem;">Analyzing...</p></div>';

      try {
        const result = await callMCPTool('analyze_sonic_market_sentiment', {
          sentiment_sources: ['price_action', 'volume_analysis'],
          timeframe: '1d',
          instruments: ['S-USD', 'BTC-USD', 'ETH-USD']
        });

        if (result.success) {
          const sentiment = result.data.sentiment;
          el.innerHTML = \`
            <div class="sentiment-box">
              <strong>Overall:</strong> \${sentiment.overall_sentiment || 'neutral'}<br>
              <strong>Confidence:</strong> \${sentiment.confidence || 0}%<br><br>
              <strong>Observations:</strong>
              <ul style="margin: 10px 0 10px 20px;">
                \${(sentiment.key_observations || []).map(obs => \`<li>\${obs}</li>\`).join('')}
              </ul>
              <br><strong>Recommendation:</strong> \${sentiment.recommendation || 'Monitor markets'}
            </div>
          \`;
        } else {
          throw new Error('Failed to analyze');
        }
      } catch (error) {
        el.innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
      }
    }

    // Refresh news
    async function refreshNews() {
      const el = document.getElementById('news-content');
      el.innerHTML = '<div class="loading"><div class="spinner"></div><p style="margin-top: 0.5rem;">Fetching...</p></div>';

      try {
        const result = await callMCPTool('search_crypto_news', {
          query: 'Sonic blockchain cryptocurrency',
          tokens: ['Sonic', 'S-USD'],
          max_results: 5
        });

        if (result.success) {
          const news = result.data.news_items || [];
          let html = '';

          if (news.length === 0) {
            html = '<div style="padding: 12px; background: rgba(249, 115, 22, 0.1); border-radius: 8px; color: var(--text-secondary);">';
            html += '⚠️ <strong>News search requires BRAVE_API_KEY</strong><br><br>';
            html += 'To enable news: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">wrangler secret put BRAVE_API_KEY</code><br>';
            html += 'Get your API key at: <a href="https://brave.com/search/api/" target="_blank" style="color: var(--accent-orange);">brave.com/search/api</a>';
            html += '</div>';
          } else {
            news.forEach(item => {
              const sentimentColor = item.sentiment === 'positive' ? 'var(--success)' :
                                    item.sentiment === 'negative' ? 'var(--error)' : 'var(--accent-orange)';
              html += \`
                <div style="margin: 10px 0; padding: 12px; background: rgba(0, 0, 0, 0.2); border-left: 3px solid \${sentimentColor}; border-radius: 8px;">
                  <div style="font-weight: 600; margin-bottom: 5px;">\${item.title}</div>
                  <div style="font-size: 0.875rem; color: var(--text-secondary);">\${item.description || item.summary || ''}</div>
                  <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 5px;">
                    <a href="\${item.url}" target="_blank" style="color: var(--accent-orange);">\${item.source}</a> • \${item.date}
                  </div>
                </div>
              \`;
            });
          }

          el.innerHTML = html || '<p style="color: var(--text-secondary);">No news available</p>';
        } else {
          // Check if it's an API key issue
          if (result.error && result.error.includes('401')) {
            throw new Error('BRAVE_API_KEY not configured. Set with: wrangler secret put BRAVE_API_KEY');
          }
          throw new Error(result.error || 'Failed to fetch news');
        }
      } catch (error) {
        el.innerHTML = \`<div class="error">❌ \${error.message}</div>\`;
      }
    }

    // Send chat message with agentic tool calling
    async function sendMessage() {
      const input = document.getElementById('chat-input');
      const messages = document.getElementById('chat-messages');
      const userMessage = input.value.trim();

      if (!userMessage) return;

      // Add user message
      messages.innerHTML += \`<div class="message user">\${userMessage}</div>\`;
      input.value = '';
      messages.scrollTop = messages.scrollHeight;

      // Show thinking indicator
      const thinkingMsg = document.createElement('div');
      thinkingMsg.className = 'message assistant thinking';
      thinkingMsg.innerHTML = '🤔 Analyzing your request...';
      messages.appendChild(thinkingMsg);
      messages.scrollTop = messages.scrollHeight;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: userMessage,
            history: getChatHistory()
          })
        });

        if (!response.ok) throw new Error('Failed to get response');

        const data = await response.json();
        
        // Remove thinking indicator
        thinkingMsg.remove();
        
        // Add assistant message
        const assistantMsg = document.createElement('div');
        assistantMsg.className = 'message assistant';
        
        let html = \`<div class="message-content">\${data.message}</div>\`;
        
        // Show which tools were used
        if (data.tools_used && data.tools_used.length > 0) {
          html += \`<div class="tools-used">
            <span class="tools-label">📊 Data sources:</span>
            \${data.tools_used.map(tool => {
              const icon = getToolIcon(tool);
              const name = formatToolName(tool);
              return \`<span class="tool-badge">\${icon} \${name}</span>\`;
            }).join('')}
          </div>\`;
        }
        
        // Show citations (collapsible)
        if (data.citations && data.citations.length > 0) {
          html += \`<div class="citations">
            <details>
              <summary>📚 View sources (\${data.citations.length})</summary>
              <div class="citation-list">
                \${data.citations.map(citation => 
                  \`<div class="citation">
                    <strong>\${citation.source}</strong>
                    <span class="timestamp">\${new Date(citation.timestamp).toLocaleTimeString()}</span>
                  </div>\`
                ).join('')}
              </div>
            </details>
          </div>\`;
        }
        
        assistantMsg.innerHTML = html;
        messages.appendChild(assistantMsg);
        messages.scrollTop = messages.scrollHeight;

      } catch (error) {
        thinkingMsg.className = 'message assistant error';
        thinkingMsg.innerHTML = \`<span class="error">❌ Error: \${error.message}</span>\`;
      }
    }

    // Helper functions
    function getToolIcon(toolName) {
      const icons = {
        'get_latest_index_tick': '💹',
        'analyze_sonic_market_sentiment': '🧠',
        'search_crypto_news': '📰',
        'get_trending_crypto': '🔥',
        'search_knowledge_base': '📚',
        'get_historical_ohlcv_daily': '📈',
        'get_historical_ohlcv_hourly': '⏰',
        'get_historical_ohlcv_minutes': '⚡'
      };
      return icons[toolName] || '🔧';
    }

    function formatToolName(toolName) {
      return toolName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    }

    function getChatHistory() {
      const messageElements = document.querySelectorAll('.message');
      const history = [];
      
      // Get last 8 messages (4 exchanges) for context
      const start = Math.max(0, messageElements.length - 8);
      for (let i = start; i < messageElements.length; i++) {
        const msg = messageElements[i];
        if (!msg.classList.contains('thinking')) {
          const content = msg.querySelector('.message-content')?.textContent || msg.textContent;
          history.push({
            role: msg.classList.contains('user') ? 'user' : 'assistant',
            content: content.trim()
          });
        }
      }
      
      return history;
    }

    // Suggested prompts to guide users
    function addSuggestedPrompts() {
      const container = document.getElementById('chat-messages');
      const suggestions = [
        "What's the price of BTC right now?",
        "Should I buy S token?",
        "What's the sentiment on ETH?",
        "Compare BTC and ETH prices",
        "What's trending in crypto today?"
      ];
      
      const suggestionsHTML = \`
        <div class="suggested-prompts">
          <div class="suggestions-label">💡 Try asking:</div>
          \${suggestions.map(prompt => 
            \`<button class="suggestion-btn" onclick="askQuestion('\${prompt}')">
              \${prompt}
            </button>\`
          ).join('')}
        </div>
      \`;
      
      // Prepend to chat (shows at top)
      container.innerHTML = suggestionsHTML + container.innerHTML;
    }

    function askQuestion(question) {
      document.getElementById('chat-input').value = question;
      sendMessage();
    }

    // Auto-load data
    refreshPrices();
    refreshSentiment();
    refreshNews();
    
    // Initialize suggested prompts in chat
    addSuggestedPrompts();

    // Auto-refresh prices every 3 minutes
    setInterval(() => {
      if (!document.hidden) refreshPrices();
    }, 180000);
  </script>
</body>
</html>`;
}
