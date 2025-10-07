// Enhanced Sonic Crypto MCP Server with Sonic-themed dashboard, chat, and data seeding
// Integrates modular tools, workflows, and comprehensive features

import { Env, ALL_TOOLS, executeTool } from './tools/index';
import { seedHistoricalData, refreshRecentData, DEFAULT_SEEDING_CONFIG, initializeD1Schema } from './workflows/data-seeding';
import { DataUpdateWorkflow, DataSeedingWorkflow } from './workflows/data-workflow';

// Durable Objects (from original index.ts)
export class CryptoDataCache {
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

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (request.method === 'GET' && key) {
      const value = await this.get(key);
      return Response.json({ value });
    }

    if (request.method === 'POST' && key) {
      const { value, ttl } = await request.json() as any;
      await this.set(key, value, ttl);
      return Response.json({ success: true });
    }

    return new Response('Method not allowed', { status: 405 });
  }
}

export class MCPSessionManager {
  private state: DurableObjectState;
  private sessions: Map<string, any> = new Map();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return new Response('Session ID required', { status: 400 });
    }

    if (request.method === 'GET') {
      const session = await this.state.storage.get(sessionId);
      return Response.json({ session });
    }

    if (request.method === 'POST') {
      const data = await request.json();
      await this.state.storage.put(sessionId, data);
      return Response.json({ success: true });
    }

    return new Response('Method not allowed', { status: 405 });
  }
}

// Export Workflows
export { DataUpdateWorkflow, DataSeedingWorkflow };

// Enhanced Dashboard HTML with Sonic theme and chat
function getSonicDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sonic Crypto MCP Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #000011;
      color: #FFFFFF;
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Animated starfield background */
    #starfield {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
    }

    .star {
      position: absolute;
      width: 2px;
      height: 2px;
      background: white;
      border-radius: 50%;
      animation: twinkle 3s infinite ease-in-out;
    }

    @keyframes twinkle {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }

    /* Main content */
    .container {
      position: relative;
      z-index: 1;
      max-width: 1600px;
      margin: 0 auto;
      padding: 20px;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 153, 204, 0.1));
      border: 1px solid rgba(0, 212, 255, 0.3);
      padding: 30px;
      border-radius: 20px;
      margin-bottom: 30px;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 212, 255, 0.1);
    }

    h1 {
      color: #00D4FF;
      font-size: 2.5em;
      margin-bottom: 10px;
      text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
    }

    .subtitle {
      color: #99E6FF;
      font-size: 1.1em;
    }

    /* Grid layout */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    /* Cards */
    .card {
      background: rgba(0, 17, 34, 0.8);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 15px;
      padding: 25px;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 20px rgba(0, 212, 255, 0.1);
      transition: all 0.3s ease;
    }

    .card:hover {
      border-color: rgba(0, 212, 255, 0.6);
      box-shadow: 0 8px 32px rgba(0, 212, 255, 0.2);
      transform: translateY(-2px);
    }

    .card h2 {
      color: #00D4FF;
      margin-bottom: 15px;
      font-size: 1.4em;
    }

    /* Price display */
    .price-item {
      margin: 15px 0;
      padding: 15px;
      background: rgba(0, 212, 255, 0.05);
      border-left: 3px solid #00D4FF;
      border-radius: 8px;
    }

    .price-label {
      color: #99E6FF;
      font-size: 0.9em;
      margin-bottom: 5px;
    }

    .price-value {
      font-size: 1.8em;
      font-weight: bold;
      color: #00FFFF;
      text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
    }

    .price-change {
      font-size: 1em;
      font-weight: 600;
      margin-top: 5px;
    }

    .price-change.positive { color: #10b981; }
    .price-change.negative { color: #ef4444; }

    /* Chat component */
    .chat-container {
      grid-column: 1 / -1;
      background: rgba(0, 17, 34, 0.9);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 15px;
      padding: 25px;
      backdrop-filter: blur(10px);
      min-height: 500px;
      display: flex;
      flex-direction: column;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      margin-bottom: 20px;
      padding: 15px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 10px;
      max-height: 400px;
    }

    .message {
      margin: 10px 0;
      padding: 12px 16px;
      border-radius: 12px;
      max-width: 80%;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message.user {
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(0, 153, 204, 0.2));
      border: 1px solid rgba(0, 212, 255, 0.3);
      margin-left: auto;
      text-align: right;
    }

    .message.assistant {
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.2);
      margin-right: auto;
    }

    .chat-input-container {
      display: flex;
      gap: 10px;
    }

    .chat-input {
      flex: 1;
      padding: 15px;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 10px;
      color: #FFFFFF;
      font-size: 1em;
    }

    .chat-input:focus {
      outline: none;
      border-color: #00D4FF;
      box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
    }

    /* Buttons */
    button {
      background: linear-gradient(135deg, #00D4FF, #0099CC);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 1em;
      font-weight: 600;
      transition: all 0.3s;
      box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3);
    }

    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 212, 255, 0.5);
    }

    button:active {
      transform: translateY(0);
    }

    /* Loading spinner */
    .spinner {
      border: 3px solid rgba(0, 212, 255, 0.3);
      border-top: 3px solid #00D4FF;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading {
      text-align: center;
      padding: 20px;
      color: #99E6FF;
    }

    /* Error messages */
    .error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 15px;
      border-radius: 8px;
      color: #ff8888;
    }

    /* Sentiment box */
    .sentiment-box {
      background: rgba(0, 212, 255, 0.05);
      border-left: 4px solid #00D4FF;
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
      line-height: 1.6;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }
      h1 {
        font-size: 2em;
      }
    }
  </style>
</head>
<body>
  <!-- Animated starfield -->
  <canvas id="starfield"></canvas>

  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🚀 Sonic Crypto MCP Dashboard</h1>
      <p class="subtitle">Real-time cryptocurrency data powered by AI</p>
    </div>

    <!-- Data cards -->
    <div class="grid">
      <!-- Live Prices -->
      <div class="card">
        <h2>📊 Live Prices</h2>
        <div id="prices-content">
          <div class="loading">
            <div class="spinner"></div>
            Loading price data...
          </div>
        </div>
        <button onclick="refreshPrices()" style="margin-top: 15px; width: 100%;">🔄 Refresh Prices</button>
      </div>

      <!-- Market Sentiment -->
      <div class="card">
        <h2>🧠 Market Sentiment</h2>
        <div id="sentiment-content">
          <div class="loading">
            <div class="spinner"></div>
            Analyzing sentiment...
          </div>
        </div>
        <button onclick="refreshSentiment()" style="margin-top: 15px; width: 100%;">🔄 Analyze Sentiment</button>
      </div>

      <!-- News -->
      <div class="card">
        <h2>📰 Latest News</h2>
        <div id="news-content">
          <div class="loading">
            <div class="spinner"></div>
            Fetching news...
          </div>
        </div>
        <button onclick="refreshNews()" style="margin-top: 15px; width: 100%;">🔄 Refresh News</button>
      </div>
    </div>

    <!-- AI Chat -->
    <div class="chat-container">
      <h2>💬 AI Chat Assistant</h2>
      <p style="color: #99E6FF; margin-bottom: 15px;">Ask about Sonic ecosystem, market data, or crypto analysis</p>

      <div class="chat-messages" id="chat-messages">
        <div class="message assistant">
          👋 Hello! I'm your Sonic Crypto AI assistant. I can help you with:
          <br>• Live cryptocurrency prices
          <br>• Market sentiment analysis
          <br>• Crypto news and updates
          <br>• DeFi opportunities
          <br>• Technical analysis
          <br><br>What would you like to know?
        </div>
      </div>

      <div class="chat-input-container">
        <input
          type="text"
          class="chat-input"
          id="chat-input"
          placeholder="Ask about Sonic, prices, sentiment..."
          onkeypress="if(event.key==='Enter') sendMessage()"
        />
        <button onclick="sendMessage()">Send</button>
      </div>
    </div>
  </div>

  <script>
    // Animated starfield
    const canvas = document.getElementById('starfield');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2,
        speed: Math.random() * 0.5 + 0.1
      });
    }

    function drawStars() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';

      stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();

        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });

      requestAnimationFrame(drawStars);
    }

    drawStars();

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });

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
      el.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

      try {
        const result = await callMCPTool('get_latest_index_tick', {
          market: 'cadli',
          instruments: ['BTC-USD', 'ETH-USD', 'S-USD', 'SONIC-USD']
        });

        if (result.success && result.data) {
          let html = '';
          const data = result.data.data || [];

          data.forEach(item => {
            const price = item.VALUE?.PRICE || 'N/A';
            const change = item.CURRENT_DAY?.CHANGE_PERCENTAGE || 0;
            const changeClass = change >= 0 ? 'positive' : 'negative';
            const changeSymbol = change >= 0 ? '↑' : '↓';

            html += \`
              <div class="price-item">
                <div class="price-label">\${item.INSTRUMENT || 'Unknown'}</div>
                <div class="price-value">$\${typeof price === 'number' ? price.toFixed(2) : price}</div>
                <div class="price-change \${changeClass}">
                  \${changeSymbol} \${Math.abs(change).toFixed(2)}%
                </div>
              </div>
            \`;
          });

          el.innerHTML = html || '<p>No price data available</p>';
        } else {
          throw new Error('Invalid response');
        }
      } catch (error) {
        el.innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
      }
    }

    // Refresh sentiment
    async function refreshSentiment() {
      const el = document.getElementById('sentiment-content');
      el.innerHTML = '<div class="loading"><div class="spinner"></div>Analyzing...</div>';

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
              <strong>Overall Sentiment:</strong> \${sentiment.overall_sentiment || 'neutral'}
              <br><strong>Confidence:</strong> \${sentiment.confidence || 0}%
              <br><br>
              <strong>Key Observations:</strong>
              <ul style="margin: 10px 0 10px 20px;">
                \${(sentiment.key_observations || []).map(obs => \`<li>\${obs}</li>\`).join('')}
              </ul>
              <br>
              <strong>Recommendation:</strong> \${sentiment.recommendation || 'Monitor markets'}
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
      el.innerHTML = '<div class="loading"><div class="spinner"></div>Fetching...</div>';

      try {
        const result = await callMCPTool('search_crypto_news', {
          query: 'Sonic blockchain cryptocurrency',
          tokens: ['Sonic', 'S-USD'],
          max_results: 5
        });

        if (result.success) {
          const news = result.data.news_items || [];
          let html = '';

          news.forEach(item => {
            const sentimentColor = item.sentiment === 'positive' ? '#10b981' :
                                  item.sentiment === 'negative' ? '#ef4444' : '#99E6FF';
            html += \`
              <div style="margin: 10px 0; padding: 12px; background: rgba(0, 212, 255, 0.05); border-left: 3px solid \${sentimentColor}; border-radius: 8px;">
                <div style="font-weight: 600; color: #00D4FF; margin-bottom: 5px;">\${item.title}</div>
                <div style="font-size: 0.9em; color: #99E6FF;">\${item.summary}</div>
                <div style="font-size: 0.8em; color: #666; margin-top: 5px;">\${item.source} • \${item.date}</div>
              </div>
            \`;
          });

          el.innerHTML = html || '<p>No news available</p>';
        } else {
          throw new Error('Failed to fetch news');
        }
      } catch (error) {
        el.innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
      }
    }

    // Chat functionality
    async function sendMessage() {
      const input = document.getElementById('chat-input');
      const messages = document.getElementById('chat-messages');
      const userMessage = input.value.trim();

      if (!userMessage) return;

      // Add user message
      messages.innerHTML += \`
        <div class="message user">\${userMessage}</div>
      \`;
      input.value = '';
      messages.scrollTop = messages.scrollHeight;

      // Show loading
      messages.innerHTML += \`
        <div class="message assistant" id="temp-loading">
          <div class="spinner" style="width: 20px; height: 20px;"></div>
        </div>
      \`;
      messages.scrollTop = messages.scrollHeight;

      try {
        // Call chat endpoint with Hermes model
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage })
        });

        const result = await response.json();

        // Remove loading
        document.getElementById('temp-loading').remove();

        // Add assistant response
        messages.innerHTML += \`
          <div class="message assistant">\${result.response || 'Sorry, I couldn\\'t process that.'}</div>
        \`;
      } catch (error) {
        document.getElementById('temp-loading').remove();
        messages.innerHTML += \`
          <div class="message assistant error">Error: \${error.message}</div>
        \`;
      }

      messages.scrollTop = messages.scrollHeight;
    }

    // Auto-load data on page load
    refreshPrices();
    refreshSentiment();
    refreshNews();

    // Auto-refresh every 3 minutes
    setInterval(() => {
      if (!document.hidden) {
        refreshPrices();
      }
    }, 180000);
  </script>
</body>
</html>`;
}

// Main Worker Handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Dashboard
      if (path === '/' || path === '/dashboard') {
        return new Response(getSonicDashboardHTML(), {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' }
        });
      }

      // MCP Protocol: List tools
      if (path === '/mcp/tools/list') {
        return new Response(JSON.stringify(ALL_TOOLS, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // MCP Protocol: Call tool
      if (path === '/mcp/tools/call' && request.method === 'POST') {
        const body = await request.json() as any;
        const { name, arguments: args } = body;
        const result = await executeTool(name, args || {}, env);

        return new Response(JSON.stringify(result, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // AI Chat endpoint with Hermes-2-Pro-Mistral-7B
      if (path === '/api/chat' && request.method === 'POST') {
        const { message } = await request.json() as any;

        // Check if message requests specific data
        const lowerMessage = message.toLowerCase();
        let context = '';

        // Auto-fetch relevant data based on message
        if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
          const priceResult = await executeTool('get_latest_index_tick', {
            market: 'cadli',
            instruments: ['BTC-USD', 'ETH-USD', 'S-USD', 'SONIC-USD']
          }, env);
          context += \`\\nCurrent Prices: \${JSON.stringify(priceResult.data)}\`;
        }

        if (lowerMessage.includes('sentiment') || lowerMessage.includes('market')) {
          const sentimentResult = await executeTool('analyze_sonic_market_sentiment', {
            sentiment_sources: ['price_action', 'volume_analysis'],
            timeframe: '1d'
          }, env);
          context += \`\\nMarket Sentiment: \${JSON.stringify(sentimentResult.data)}\`;
        }

        // Use Hermes-2-Pro-Mistral-7B for chat
        const aiResponse = await env.AI.run('@cf/thebloke/hermes-2-pro-mistral-7b', {
          messages: [
            {
              role: 'system',
              content: \`You are a helpful cryptocurrency and DeFi assistant specializing in the Sonic blockchain ecosystem.
You have access to real-time market data and can provide insights on:
- Cryptocurrency prices and trends
- Market sentiment analysis
- DeFi opportunities
- Sonic ecosystem projects
- Trading strategies

Provide concise, accurate, and helpful responses. When discussing prices or data, use the context provided.

Context: \${context}\`
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 512,
          temperature: 0.7
        });

        return new Response(JSON.stringify({
          success: true,
          response: aiResponse.response || 'I apologize, but I couldn\\'t generate a response.',
          context_used: context ? true : false
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Direct API endpoints
      if (path === '/api/price') {
        const args = request.method === 'POST'
          ? await request.json()
          : { market: 'cadli', instruments: ['BTC-USD', 'ETH-USD', 'S-USD'] };

        const result = await executeTool('get_latest_index_tick', args, env);
        return new Response(JSON.stringify(result, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/sentiment') {
        const args = request.method === 'POST'
          ? await request.json()
          : { sentiment_sources: ['price_action', 'volume_analysis'], timeframe: '1d' };

        const result = await executeTool('analyze_sonic_market_sentiment', args, env);
        return new Response(JSON.stringify(result, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Data seeding endpoints
      if (path === '/api/seed-data' && request.method === 'POST') {
        const config = (await request.json() as any) || DEFAULT_SEEDING_CONFIG;
        const result = await seedHistoricalData(config, env);

        return new Response(JSON.stringify({
          success: result.success,
          message: \`Seeded \${result.recordsSeeded} records\`,
          errors: result.errors
        }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/refresh-data' && request.method === 'POST') {
        await refreshRecentData(env);

        return new Response(JSON.stringify({
          success: true,
          message: 'Data refreshed successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/init-db' && request.method === 'POST') {
        await initializeD1Schema(env);

        return new Response(JSON.stringify({
          success: true,
          message: 'Database initialized'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Health check
      if (path === '/health') {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            ai: !!env.AI,
            kv: !!env.SONIC_CACHE,
            r2: !!env.HISTORICAL_DATA,
            d1: !!env.CONFIG_DB,
            analytics: !!env.ANALYTICS
          }
        };

        return new Response(JSON.stringify(health, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // API documentation
      if (path === '/docs') {
        return new Response(JSON.stringify({
          name: "Sonic Crypto MCP Server",
          version: "2.0.0",
          endpoints: {
            "/": "Sonic-themed Dashboard with AI Chat",
            "/mcp/tools/list": "List MCP tools",
            "/mcp/tools/call": "Execute MCP tool",
            "/api/price": "Get latest prices",
            "/api/sentiment": "Market sentiment analysis",
            "/api/chat": "AI chat with Hermes model",
            "/api/seed-data": "Seed historical data (POST)",
            "/api/refresh-data": "Refresh recent data (POST)",
            "/api/init-db": "Initialize database (POST)",
            "/health": "Health check"
          },
          tools: ALL_TOOLS.map(t => ({
            name: t.name,
            description: t.description
          }))
        }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders
      });

    } catch (error: any) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },

  // Scheduled handler for cron triggers
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('Running scheduled task...');

    // Refresh recent data
    await refreshRecentData(env);

    console.log('Scheduled task completed');
  }
};
