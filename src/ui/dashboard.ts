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
    // Logo rainfall animation
    const canvas = document.getElementById('logo-rain');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const logos = [];
    const logoCount = 30;

    for (let i = 0; i < logoCount; i++) {
      logos.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        speed: Math.random() * 2 + 1,
        size: Math.random() * 30 + 15,
        opacity: Math.random() * 0.3 + 0.1
      });
    }

    function drawLogos() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      logos.forEach(logo => {
        ctx.globalAlpha = logo.opacity;
        ctx.fillStyle = '#f97316';
        ctx.font = \`\${logo.size}px Arial\`;
        ctx.fillText('S', logo.x, logo.y);

        logo.y += logo.speed;

        if (logo.y > canvas.height + logo.size) {
          logo.y = -logo.size;
          logo.x = Math.random() * canvas.width;
        }
      });

      ctx.globalAlpha = 1;
      requestAnimationFrame(drawLogos);
    }

    drawLogos();

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

          el.innerHTML = html || '<p style="color: var(--text-secondary);">No price data available</p>';
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

          news.forEach(item => {
            const sentimentColor = item.sentiment === 'positive' ? 'var(--success)' :
                                  item.sentiment === 'negative' ? 'var(--error)' : 'var(--accent-orange)';
            html += \`
              <div style="margin: 10px 0; padding: 12px; background: rgba(0, 0, 0, 0.2); border-left: 3px solid \${sentimentColor}; border-radius: 8px;">
                <div style="font-weight: 600; margin-bottom: 5px;">\${item.title}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">\${item.summary}</div>
                <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 5px;">\${item.source} • \${item.date}</div>
              </div>
            \`;
          });

          el.innerHTML = html || '<p style="color: var(--text-secondary);">No news available</p>';
        } else {
          throw new Error('Failed to fetch news');
        }
      } catch (error) {
        el.innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
      }
    }

    // Send chat message with streaming
    async function sendMessage() {
      const input = document.getElementById('chat-input');
      const messages = document.getElementById('chat-messages');
      const userMessage = input.value.trim();

      if (!userMessage) return;

      messages.innerHTML += \`<div class="message user">\${userMessage}</div>\`;
      input.value = '';
      messages.scrollTop = messages.scrollHeight;

      const assistantMsg = document.createElement('div');
      assistantMsg.className = 'message assistant';
      assistantMsg.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; display: inline-block;"></div>';
      messages.appendChild(assistantMsg);
      messages.scrollTop = messages.scrollHeight;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage })
        });

        if (!response.ok) throw new Error('Failed to get response');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        assistantMsg.innerHTML = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.response) {
                  fullText += parsed.response;
                  assistantMsg.textContent = fullText;
                  messages.scrollTop = messages.scrollHeight;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }

        if (!fullText) {
          assistantMsg.textContent = 'Sorry, I couldn\\'t process that.';
        }

      } catch (error) {
        assistantMsg.innerHTML = \`<span class="error">Error: \${error.message}</span>\`;
      }

      messages.scrollTop = messages.scrollHeight;
    }

    // Auto-load data
    refreshPrices();
    refreshSentiment();
    refreshNews();

    // Auto-refresh prices every 3 minutes
    setInterval(() => {
      if (!document.hidden) refreshPrices();
    }, 180000);
  </script>
</body>
</html>`;
}
