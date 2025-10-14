// VibeSDK-styled dashboard with working agent connections
export function getVibeSDKDashboard(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sonic Crypto MCP - AI Agents</title>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* VibeSDK Color Scheme */
    :root {
      --bg-1: #e7e7e7;
      --bg-2: #f6f6f6;
      --bg-3: #fbfbfc;
      --bg-4: #ffffff;
      --text-primary: #0a0a0a;
      --text-secondary: #171717;
      --text-tertiary: #21212199;
      --accent: #f6821f;
      --accent-heavy: #f6821f;
      --border-primary: #e5e5e5;
    }

    .dark {
      --bg-1: #151515;
      --bg-2: #1f2020;
      --bg-3: #292929;
      --bg-4: #3c3c3c;
      --text-primary: #ffffff;
      --text-secondary: #cdcaca;
      --text-tertiary: #bcb9b9;
      --accent: #f6821f;
      --accent-heavy: #f6821f;
      --border-primary: #393939;
    }

    /* Glow animations */
    @keyframes glow-shift {
      0%, 100% {
        filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.3)) drop-shadow(0 0 16px rgba(59, 130, 246, 0.15));
      }
      25% {
        filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.3)) drop-shadow(0 0 16px rgba(168, 85, 247, 0.15));
      }
      50% {
        filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.3)) drop-shadow(0 0 16px rgba(6, 182, 212, 0.15));
      }
      75% {
        filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.3)) drop-shadow(0 0 16px rgba(236, 72, 153, 0.15));
      }
    }

    @keyframes border-glow-shift {
      0%, 100% {
        box-shadow: 0 0 12px rgba(59, 130, 246, 0.2), 0 0 24px rgba(59, 130, 246, 0.1), inset 0 0 12px rgba(59, 130, 246, 0.05);
      }
      25% {
        box-shadow: 0 0 12px rgba(168, 85, 247, 0.2), 0 0 24px rgba(168, 85, 247, 0.1), inset 0 0 12px rgba(168, 85, 247, 0.05);
      }
      50% {
        box-shadow: 0 0 12px rgba(6, 182, 212, 0.2), 0 0 24px rgba(6, 182, 212, 0.1), inset 0 0 12px rgba(6, 182, 212, 0.05);
      }
      75% {
        box-shadow: 0 0 12px rgba(236, 72, 153, 0.2), 0 0 24px rgba(236, 72, 153, 0.1), inset 0 0 12px rgba(236, 72, 153, 0.05);
      }
    }

    @keyframes chat-edge-throb {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(246, 130, 31, 0.10), inset 0 0 0 1px rgba(246, 130, 31, 0.16);
      }
      50% {
        box-shadow: 0 0 0 6px rgba(255, 61, 0, 0.08), inset 0 0 0 2px rgba(255, 61, 0, 0.22);
      }
    }

    .text-glow {
      color: var(--text-primary);
      animation: glow-shift 8s ease-in-out infinite;
    }

    .line-glow {
      border: 1px solid rgba(57, 57, 57, 0.5);
      animation: border-glow-shift 8s ease-in-out infinite;
    }

    .chat-edge-throb {
      animation: chat-edge-throb 1.6s ease-in-out infinite;
      border-radius: 0.75rem;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg-1);
      color: var(--text-primary);
      min-height: 100vh;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3Cpath d='M6 5V0H5v5H0v1h5v94h1V6h94V5H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .header h1 {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .header-subtitle {
      font-size: 1.25rem;
      color: var(--text-secondary);
    }

    .agent-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
    }

    .agent-card {
      background: var(--bg-2);
      padding: 2rem;
      border-radius: 1rem;
      transition: transform 0.2s;
    }

    .agent-card:hover {
      transform: translateY(-4px);
    }

    .agent-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .agent-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .agent-description {
      color: var(--text-secondary);
      margin-bottom: 1rem;
      line-height: 1.6;
    }

    .agent-status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(16, 185, 129, 0.2);
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: #10b981;
    }

    .agent-status.offline {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .chat-container {
      background: var(--bg-2);
      border-radius: 1rem;
      padding: 2rem;
      max-width: 900px;
      margin: 0 auto;
    }

    .chat-messages {
      height: 500px;
      overflow-y: auto;
      margin-bottom: 1rem;
      padding: 1rem;
      background: var(--bg-3);
      border-radius: 0.75rem;
    }

    .message {
      margin-bottom: 1rem;
      padding: 1rem;
      border-radius: 0.75rem;
    }

    .message.user {
      background: rgba(246, 130, 31, 0.2);
      border-left: 3px solid var(--accent);
    }

    .message.assistant {
      background: rgba(59, 130, 246, 0.2);
      border-left: 3px solid #3b82f6;
    }

    .message-role {
      font-weight: 600;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    .message-content {
      line-height: 1.6;
      white-space: pre-wrap;
    }

    .chat-input-container {
      display: flex;
      gap: 1rem;
    }

    .chat-input {
      flex: 1;
      padding: 1rem;
      background: var(--bg-3);
      border: 1px solid var(--border-primary);
      border-radius: 0.75rem;
      color: var(--text-primary);
      font-size: 1rem;
    }

    .chat-input:focus {
      outline: none;
      border-color: var(--accent);
    }

    .send-button {
      padding: 1rem 2rem;
      background: var(--accent);
      border: none;
      border-radius: 0.75rem;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .send-button:hover {
      transform: scale(1.05);
    }

    .send-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loading {
      display: inline-block;
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(246, 130, 31, 0.2);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .test-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .test-button {
      padding: 0.5rem 1rem;
      background: var(--bg-4);
      border: 1px solid var(--border-primary);
      border-radius: 0.5rem;
      color: var(--text-primary);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .test-button:hover {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="text-glow">🚀 Sonic Crypto AI Agents</h1>
      <p class="header-subtitle">Multi-Agent Intelligence Platform</p>
    </div>

    <!-- Agent Status Cards -->
    <div class="agent-grid">
      <div class="agent-card line-glow">
        <div class="agent-icon">📊</div>
        <div class="agent-title">Overview Agent</div>
        <div class="agent-description">Market overview, trending tokens, and price monitoring across multiple sources</div>
        <div class="agent-status" id="status-overview">
          <span class="loading"></span> Checking...
        </div>
      </div>

      <div class="agent-card line-glow">
        <div class="agent-icon">📈</div>
        <div class="agent-title">Charts Agent</div>
        <div class="agent-description">Technical analysis, pattern detection, and indicator calculations</div>
        <div class="agent-status" id="status-charts">
          <span class="loading"></span> Checking...
        </div>
      </div>

      <div class="agent-card line-glow">
        <div class="agent-icon">💱</div>
        <div class="agent-title">Trading Agent</div>
        <div class="agent-description">Order book analysis, trade signals, and position tracking on Orderly DEX</div>
        <div class="agent-status" id="status-trading">
          <span class="loading"></span> Checking...
        </div>
      </div>

      <div class="agent-card line-glow">
        <div class="agent-icon">🧠</div>
        <div class="agent-title">Intelligence Agent</div>
        <div class="agent-description">News aggregation, social sentiment, and automated market reports</div>
        <div class="agent-status" id="status-intelligence">
          <span class="loading"></span> Checking...
        </div>
      </div>

      <div class="agent-card line-glow">
        <div class="agent-icon">💬</div>
        <div class="agent-title">Chat Agent</div>
        <div class="agent-description">Multi-agent orchestration with natural language understanding</div>
        <div class="agent-status" id="status-chat">
          <span class="loading"></span> Checking...
        </div>
      </div>
    </div>

    <!-- AI Chat Interface -->
    <div class="chat-container line-glow chat-edge-throb">
      <h2 style="margin-bottom: 1rem;">💬 AI Chat Interface</h2>

      <div class="test-buttons">
        <button class="test-button" onclick="sendQuickMessage('What is the current price of BTC?')">💰 BTC Price</button>
        <button class="test-button" onclick="sendQuickMessage('What is the market sentiment?')">🧠 Sentiment</button>
        <button class="test-button" onclick="sendQuickMessage('Show me trading signals for SONIC')">📊 Signals</button>
        <button class="test-button" onclick="sendQuickMessage('Latest crypto news')">📰 News</button>
        <button class="test-button" onclick="sendQuickMessage('Analyze Sonic blockchain')">💧 Sonic Analysis</button>
      </div>

      <div class="chat-messages" id="chat-messages">
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          <p style="font-size: 1.5rem; margin-bottom: 1rem;">👋 Hello!</p>
          <p>I'm your multi-agent AI assistant. Ask me anything about crypto markets, prices, trading, or sentiment analysis.</p>
        </div>
      </div>

      <div class="chat-input-container">
        <input
          type="text"
          class="chat-input"
          id="chat-input"
          placeholder="Ask about prices, market trends, trading signals..."
          onkeypress="if(event.key==='Enter') sendMessage()"
        />
        <button class="send-button" id="send-button" onclick="sendMessage()">
          Send
        </button>
      </div>
    </div>
  </div>

  <script>
    // Check agent status
    async function checkAgentStatus() {
      const agents = ['overview', 'charts', 'trading', 'intelligence', 'chat'];

      for (const agent of agents) {
        const statusEl = document.getElementById(\`status-\${agent}\`);
        try {
          const response = await fetch('/health');
          const data = await response.json();

          if (data.status === 'healthy') {
            statusEl.innerHTML = '✅ Online';
            statusEl.classList.remove('offline');
          } else {
            statusEl.innerHTML = '❌ Offline';
            statusEl.classList.add('offline');
          }
        } catch (error) {
          statusEl.innerHTML = '❌ Offline';
          statusEl.classList.add('offline');
        }
      }
    }

    // Chat functionality
    let chatHistory = [];

    async function sendMessage() {
      const input = document.getElementById('chat-input');
      const message = input.value.trim();

      if (!message) return;

      addMessage('user', message);
      input.value = '';

      const sendButton = document.getElementById('send-button');
      sendButton.disabled = true;
      sendButton.innerHTML = '<span class="loading"></span>';

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, history: chatHistory })
        });

        const data = await response.json();

        if (data.message || data.response) {
          const aiMessage = data.message || data.response;
          addMessage('assistant', aiMessage);

          chatHistory.push({ role: 'user', content: message, timestamp: Date.now() });
          chatHistory.push({ role: 'assistant', content: aiMessage, timestamp: Date.now() });

          if (chatHistory.length > 20) {
            chatHistory = chatHistory.slice(-20);
          }
        } else {
          addMessage('assistant', '❌ Sorry, I received an invalid response: ' + JSON.stringify(data));
        }
      } catch (error) {
        addMessage('assistant', '❌ Failed to connect: ' + error.message);
      }

      sendButton.disabled = false;
      sendButton.innerHTML = 'Send';
    }

    function sendQuickMessage(message) {
      document.getElementById('chat-input').value = message;
      sendMessage();
    }

    function addMessage(role, content) {
      const messagesDiv = document.getElementById('chat-messages');

      // Remove welcome message if exists
      const welcome = messagesDiv.querySelector('[style*="text-align: center"]');
      if (welcome) welcome.remove();

      const messageDiv = document.createElement('div');
      messageDiv.className = 'message ' + role;

      const roleDiv = document.createElement('div');
      roleDiv.className = 'message-role';
      roleDiv.textContent = role === 'user' ? '👤 You' : '🤖 AI Assistant';

      const contentDiv = document.createElement('div');
      contentDiv.className = 'message-content';
      contentDiv.textContent = content;

      messageDiv.appendChild(roleDiv);
      messageDiv.appendChild(contentDiv);
      messagesDiv.appendChild(messageDiv);

      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Initialize
    window.addEventListener('DOMContentLoaded', () => {
      checkAgentStatus();
      setInterval(checkAgentStatus, 30000); // Check every 30s
    });
  </script>
</body>
</html>`;
}
