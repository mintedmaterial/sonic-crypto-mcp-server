# 🧠 Crypto Intelligence Assistant - Implementation Plan

## 🎯 Vision
Transform the Sonic Crypto MCP Server into an intelligent assistant that helps users make better crypto investment decisions using:
- **Agentic AI Chat** - Can autonomously call tools/endpoints based on user requests
- Real-time market data (Orderly, DexScreener, CoinMarketCap)
- AI-powered analysis (Cloudflare AI + Workflows)
- Knowledge base (PDF reports in R2)
- Multi-source intelligence synthesis

---

## 🤖 Core Feature: Agentic AI Chat

### How It Works:
```
User: "What's the sentiment on BTC right now?"
  ↓
AI Agent analyzes intent → Needs sentiment data
  ↓
Agent calls: analyze_sonic_market_sentiment(["BTC-USD"])
  ↓
Agent synthesizes response with data
  ↓
"BTC sentiment is BULLISH (78% confidence). Price up 2.3% with strong buying pressure..."
```

### Chat Agent Architecture:
```typescript
// Agent Decision Flow
1. Parse user message → Extract intent
2. Determine required tools/data
3. Call tools in parallel (if possible)
4. Synthesize coherent response
5. Cite sources
```

---

## 📊 Current State Analysis

### ✅ What's Working:
- Multi-source price data (Orderly → DexScreener → CoinDesk)
- Basic sentiment analysis (Cloudflare AI)
- Dashboard UI with data source badges
- Cron jobs for data refresh
- R2 bucket: `financial-pdf-knowledge` (ready for PDFs)
- **Basic chat** - No tool calling yet ❌

### ⚠️ What Needs Enhancement:
- **AI Chat cannot call tools autonomously** ❌ PRIORITY FIX
- Sentiment analysis only uses price data (no CMC integration)
- No trending/gainers/losers data
- No PDF knowledge retrieval
- No comprehensive market reports
- No workflow orchestration

---

## 🗺️ Implementation Roadmap

### 🚀 Phase 0: Agentic Chat (Week 1 - PRIORITY)
**Goal:** Enable AI to autonomously call tools based on user requests

#### 0.1 Function Calling Service
**File:** `src/services/agent.ts`

```typescript
export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: any, env: Env) => Promise<any>;
}

export class AgentService {
  private tools: Map<string, AgentTool> = new Map();
  
  constructor(private env: Env) {
    this.registerTools();
  }
  
  private registerTools() {
    // Register all MCP tools as callable functions
    this.tools.set('get_latest_index_tick', {
      name: 'get_latest_index_tick',
      description: 'Get current cryptocurrency prices for specified instruments',
      parameters: {
        type: 'object',
        properties: {
          instruments: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of instruments like BTC-USD, ETH-USD, S-USD'
          }
        }
      },
      execute: async (args, env) => {
        const { executeGetLatestIndexTick } = await import('../tools/price-tool');
        return await executeGetLatestIndexTick(args, env);
      }
    });
    
    this.tools.set('analyze_sonic_market_sentiment', {
      name: 'analyze_sonic_market_sentiment',
      description: 'Analyze market sentiment for crypto assets',
      parameters: {
        type: 'object',
        properties: {
          instruments: {
            type: 'array',
            items: { type: 'string' },
            description: 'Assets to analyze'
          },
          timeframe: {
            type: 'string',
            enum: ['1h', '4h', '1d', '7d']
          }
        }
      },
      execute: async (args, env) => {
        const { executeAnalyzeSentiment } = await import('../tools/sentiment-tool');
        return await executeAnalyzeSentiment(args, env);
      }
    });
    
    this.tools.set('search_crypto_news', {
      name: 'search_crypto_news',
      description: 'Search for latest cryptocurrency news',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          max_results: { type: 'number', default: 5 }
        }
      },
      execute: async (args, env) => {
        const { executeWebSearch } = await import('../tools/web-search-tool');
        return await executeWebSearch(args, env);
      }
    });
    
    this.tools.set('get_trending_crypto', {
      name: 'get_trending_crypto',
      description: 'Get trending cryptocurrencies (gainers/losers)',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 10 }
        }
      },
      execute: async (args, env) => {
        // Will implement with CMC integration
        const cmc = new (await import('./coinmarketcap')).CoinMarketCapService(env);
        return await cmc.getTrendingGainersLosers(args.limit);
      }
    });
    
    this.tools.set('search_knowledge_base', {
      name: 'search_knowledge_base',
      description: 'Search PDF reports and research for insights',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to search for' },
          assets: { type: 'array', items: { type: 'string' }, description: 'Specific assets' }
        }
      },
      execute: async (args, env) => {
        // Will implement with knowledge retrieval
        const kb = new (await import('./knowledge-retrieval')).KnowledgeRetrievalService(env);
        return await kb.search(args.query, args.assets);
      }
    });
  }
  
  /**
   * Main chat endpoint with tool calling
   */
  async chat(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<AgentResponse> {
    // Step 1: Analyze intent with AI
    const intent = await this.analyzeIntent(userMessage);
    
    // Step 2: Determine required tools
    const requiredTools = await this.selectTools(userMessage, intent);
    
    // Step 3: Call tools in parallel if possible
    const toolResults = await this.executeTools(requiredTools);
    
    // Step 4: Generate response with tool results as context
    const response = await this.generateResponse(userMessage, toolResults, conversationHistory);
    
    return {
      message: response,
      tools_used: requiredTools.map(t => t.name),
      data: toolResults,
      citations: this.extractCitations(toolResults)
    };
  }
  
  /**
   * Analyze user intent and determine what data is needed
   */
  private async analyzeIntent(message: string): Promise<UserIntent> {
    const systemPrompt = `Analyze the user's message and determine their intent.
    
Available intents:
- price_query: User wants current prices
- sentiment_analysis: User wants market sentiment
- news_search: User wants latest news
- trending_query: User wants to know what's trending
- knowledge_query: User wants insights from research reports
- general_question: General crypto question
- comparison: Compare multiple assets
- prediction: Ask for price predictions

Respond with JSON: {"intent": "intent_name", "entities": ["BTC", "ETH"], "timeframe": "1d"}`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      response_format: { type: 'json_object' }
    });
    
    return JSON.parse(response.response as string);
  }
  
  /**
   * Select appropriate tools based on intent
   */
  private async selectTools(message: string, intent: UserIntent): Promise<ToolCall[]> {
    const toolsArray = Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));
    
    const systemPrompt = `You are a function calling AI. Given the user's message and intent, select which tools to call.
    
Available tools:
${JSON.stringify(toolsArray, null, 2)}

User intent: ${JSON.stringify(intent)}

Respond with JSON array of tool calls:
[
  {
    "name": "tool_name",
    "arguments": { "param": "value" }
  }
]

Call multiple tools if needed (e.g., prices + sentiment for comprehensive analysis).`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      response_format: { type: 'json_object' }
    });
    
    const parsed = JSON.parse(response.response as string);
    return parsed.tool_calls || [];
  }
  
  /**
   * Execute selected tools
   */
  private async executeTools(toolCalls: ToolCall[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    // Execute in parallel
    await Promise.all(
      toolCalls.map(async (call) => {
        const tool = this.tools.get(call.name);
        if (tool) {
          try {
            results[call.name] = await tool.execute(call.arguments, this.env);
          } catch (error: any) {
            results[call.name] = { error: error.message };
          }
        }
      })
    );
    
    return results;
  }
  
  /**
   * Generate final response with tool results
   */
  private async generateResponse(
    userMessage: string,
    toolResults: Record<string, any>,
    history: ChatMessage[]
  ): Promise<string> {
    const systemPrompt = `You are an expert cryptocurrency market analyst and advisor.

Your role:
- Provide accurate, data-driven insights
- Cite your sources (mention which tools/data you used)
- Be concise but thorough
- Warn about risks when appropriate
- Explain technical concepts in simple terms

Tool results available:
${JSON.stringify(toolResults, null, 2)}

Use this data to answer the user's question. Reference specific numbers and sources.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage }
    ];
    
    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages,
      max_tokens: 1024,
      temperature: 0.7
    });
    
    return response.response as string;
  }
  
  private extractCitations(toolResults: Record<string, any>): Citation[] {
    const citations: Citation[] = [];
    
    for (const [tool, result] of Object.entries(toolResults)) {
      if (result.success && result.data) {
        citations.push({
          source: tool,
          data: result.data,
          timestamp: result.timestamp
        });
      }
    }
    
    return citations;
  }
}
```

#### 0.2 Update Chat Endpoint
**File:** `src/index.ts` (Update existing `/api/chat`)

```typescript
// ===== AI Chat Endpoint with Tool Calling =====
if (path === '/api/chat' && request.method === 'POST') {
  const { message, history = [] } = await request.json() as any;

  if (!message) {
    return new Response(JSON.stringify({ error: 'Message required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Use agent service for intelligent tool calling
    const agent = new (await import('./services/agent')).AgentService(env);
    const response = await agent.chat(message, history);

    // Log to analytics
    if (env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['agent_chat', ...response.tools_used],
        doubles: [response.tools_used.length],
        indexes: ['chat']
      });
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Agent chat error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      fallback: 'Sorry, I encountered an error. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ===== Streaming chat (for real-time responses) =====
if (path === '/api/chat/stream' && request.method === 'POST') {
  const { message, history = [] } = await request.json() as any;

  // Step 1: Get tool results (non-streaming)
  const agent = new (await import('./services/agent')).AgentService(env);
  const intent = await agent.analyzeIntent(message);
  const tools = await agent.selectTools(message, intent);
  const toolResults = await agent.executeTools(tools);

  // Step 2: Stream AI response with tool context
  const systemPrompt = `You are an expert crypto analyst.
  
Tool results:
${JSON.stringify(toolResults, null, 2)}

Use this data to answer the user's question.`;

  const stream = await env.AI.run('@hf/nousresearch/hermes-2-pro-mistral-7b', {
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ],
    stream: true
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Tools-Used': tools.map(t => t.name).join(',')
    }
  });
}
```

#### 0.3 Update Dashboard Chat UI
**File:** `src/ui/dashboard.ts`

```javascript
// Enhanced chat with tool calling awareness
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const messages = document.getElementById('chat-messages');
  const userMessage = input.value.trim();

  if (!userMessage) return;

  // Add user message
  messages.innerHTML += `<div class="message user">${userMessage}</div>`;
  input.value = '';
  messages.scrollTop = messages.scrollHeight;

  // Show loading with "thinking" indicator
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
        history: getChatHistory() // Last 5 messages
      })
    });

    if (!response.ok) throw new Error('Failed to get response');

    const data = await response.json();
    
    // Remove thinking indicator
    thinkingMsg.remove();
    
    // Add assistant message
    const assistantMsg = document.createElement('div');
    assistantMsg.className = 'message assistant';
    
    let html = `<div class="message-content">${data.message}</div>`;
    
    // Show which tools were used
    if (data.tools_used && data.tools_used.length > 0) {
      html += `<div class="tools-used">
        <span class="tools-label">📊 Data sources:</span>
        ${data.tools_used.map(tool => {
          const icon = getToolIcon(tool);
          return `<span class="tool-badge">${icon} ${formatToolName(tool)}</span>`;
        }).join('')}
      </div>`;
    }
    
    // Show citations
    if (data.citations && data.citations.length > 0) {
      html += `<div class="citations">
        <details>
          <summary>📚 View sources</summary>
          <div class="citation-list">
            ${data.citations.map(citation => 
              `<div class="citation">
                <strong>${citation.source}</strong>
                <span class="timestamp">${new Date(citation.timestamp).toLocaleTimeString()}</span>
              </div>`
            ).join('')}
          </div>
        </details>
      </div>`;
    }
    
    assistantMsg.innerHTML = html;
    messages.appendChild(assistantMsg);
    messages.scrollTop = messages.scrollHeight;

  } catch (error) {
    thinkingMsg.innerHTML = `<span class="error">❌ Error: ${error.message}</span>`;
  }
}

// Helper functions
function getToolIcon(toolName) {
  const icons = {
    'get_latest_index_tick': '💹',
    'analyze_sonic_market_sentiment': '🧠',
    'search_crypto_news': '📰',
    'get_trending_crypto': '🔥',
    'search_knowledge_base': '📚'
  };
  return icons[toolName] || '🔧';
}

function formatToolName(toolName) {
  return toolName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function getChatHistory() {
  const messages = document.querySelectorAll('.message');
  const history = [];
  
  // Get last 10 messages (5 exchanges)
  for (let i = Math.max(0, messages.length - 10); i < messages.length; i++) {
    const msg = messages[i];
    history.push({
      role: msg.classList.contains('user') ? 'user' : 'assistant',
      content: msg.textContent
    });
  }
  
  return history;
}

// Add suggested prompts
function addSuggestedPrompts() {
  const container = document.getElementById('chat-messages');
  const suggestions = [
    "What's the sentiment on BTC right now?",
    "Show me trending cryptocurrencies",
    "Analyze S-USD price movements",
    "What do the research reports say about 2025?",
    "Compare BTC and ETH sentiment"
  ];
  
  const suggestionsHTML = `
    <div class="suggested-prompts">
      <div class="suggestions-label">💡 Try asking:</div>
      ${suggestions.map(prompt => 
        `<button class="suggestion-btn" onclick="askQuestion('${prompt}')">
          ${prompt}
        </button>`
      ).join('')}
    </div>
  `;
  
  container.innerHTML = suggestionsHTML + container.innerHTML;
}

function askQuestion(question) {
  document.getElementById('chat-input').value = question;
  sendMessage();
}

// Initialize suggestions on load
addSuggestedPrompts();
```

#### 0.4 Add CSS for Tool Indicators
**File:** `src/ui/dashboard.ts` (Add to `<style>` section)

```css
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
}

.citations summary:hover {
  color: var(--accent-orange);
}

.citation-list {
  margin-top: 8px;
  padding-left: 16px;
}

.citation {
  padding: 4px 0;
  display: flex;
  justify-content: space-between;
}

.suggested-prompts {
  margin-bottom: 20px;
  padding: 12px;
  background: rgba(39, 39, 42, 0.6);
  border-radius: 8px;
}

.suggestions-label {
  font-size: 0.875rem;
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
```

---

### Example User Interactions:

#### Example 1: Price Query
```
User: "What's the price of BTC and ETH?"
  ↓
Agent calls: get_latest_index_tick(["BTC-USD", "ETH-USD"])
  ↓
Response: "BTC is currently at $121,661 (↑2.3%) and ETH is at $3,456 (↑1.8%). 
Both showing bullish momentum. 📊 Data from Orderly DEX"
```

#### Example 2: Sentiment Analysis
```
User: "Should I buy S token right now?"
  ↓
Agent calls in parallel:
  - get_latest_index_tick(["S-USD"])
  - analyze_sonic_market_sentiment(["S-USD"])
  - search_crypto_news("S token Sonic")
  ↓
Response: "S-USD is at $0.956 with BULLISH sentiment (82% confidence).
Price is up 5.2% today with strong volume. Recent news shows increased 
adoption in DeFi protocols. However, be aware of market volatility.

Consider: Dollar-cost averaging over time rather than lump sum investment.

📊 Sources: Orderly DEX, AI Sentiment Analysis, Brave News"
```

#### Example 3: Knowledge Base Query
```
User: "What do the research reports say about DeFi in 2025?"
  ↓
Agent calls: search_knowledge_base("DeFi 2025 predictions")
  ↓
Response: "According to the Sygnum 2025 Crypto Market Outlook:

'DeFi protocols on L2 networks are expected to see 3x growth in 2025, 
driven by improved UX and lower fees.'

Key predictions:
- Total Value Locked (TVL) to reach $200B
- L2 adoption to accelerate
- Real-world asset tokenization to expand

📚 Source: Sygnum Crypto Market Outlook 2025 Annual Report"
```

#### Example 4: Trending Query
```
User: "What's trending in crypto today?"
  ↓
Agent calls: get_trending_crypto(limit: 10)
  ↓
Response: "🔥 Top trending today:

Gainers:
1. SONIC: +45.2% ($0.00008488)
2. ARB: +23.1% ($1.23)
3. OP: +18.4% ($2.34)

Losers:
1. DOGE: -8.3% ($0.12)
2. SHIB: -6.1% ($0.000015)

Volume leaders: BTC, ETH, SONIC

📊 Data from CoinMarketCap"
```

---

## 🎯 Implementation Priority (UPDATED)

### 🚀 Phase 0 (Days 1-3): Agentic Chat ⭐ NEW PRIORITY
1. **Agent Service** - Tool selection and execution
2. **Update Chat Endpoint** - Use agent service
3. **Enhanced Chat UI** - Show tool usage and citations
4. **Test Flow** - Verify autonomous tool calling

**Deliverable:** AI can call price/sentiment/news tools autonomously

### 📈 Phase 1 (Week 1): Core Intelligence
1. **CoinMarketCap Service** - Get trending/quotes/global data
2. **Trending Tool** - Register with agent
3. **Enhanced Sentiment Tool** - Integrate CMC data
4. **Update Dashboard** - Show trending + CMC metrics

**Deliverable:** Dashboard shows trending gainers/losers + enriched sentiment

### 📊 Phase 2 (Week 2): Knowledge Base
1. **PDF Processing** - Extract text from existing PDFs
2. **D1 Schema** - Create knowledge tables
3. **Knowledge Retrieval** - Search by keywords
4. **Knowledge Tool** - Register with agent

**Deliverable:** AI assistant references PDF reports in analysis

### 🧠 Phase 3 (Week 2-3): Advanced Workflows
1. **Multi-Agent Analysis** - Technical + Sentiment + Risk
2. **Daily Report Workflow** - Automated morning/evening reports
3. **PDF Ingestion Workflow** - Auto-process new PDFs from email
4. **Report Storage** - Save to R2 with versioning

**Deliverable:** Comprehensive daily market reports

### ✨ Phase 4 (Week 3-4): Polish & Optimization
1. **Enhanced UI** - Rich sentiment dashboard
2. **Streaming Responses** - Real-time chat updates
3. **Credit Optimization** - Smart caching and rate limiting
4. **Vector Search** - Better PDF retrieval (optional)

**Deliverable:** Production-ready crypto intelligence assistant

---

## 📝 Next Immediate Steps

### 1. Create Agent Service
```bash
# Create the agentic AI service
touch src/services/agent.ts
```

### 2. Update Chat Endpoint
Modify `/api/chat` to use AgentService

### 3. Test Autonomous Tool Calling
```bash
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is the current price of BTC?"}'

# Should automatically call get_latest_index_tick
```

### 4. Update Dashboard
Add tool usage indicators and suggested prompts

### 5. Deploy and Test
```bash
npm run build
npm run deploy
```

---

## 🎉 Key Benefits

### For Users:
- ✅ **Natural conversation** - Ask questions naturally
- ✅ **Autonomous data fetching** - AI gets data automatically
- ✅ **Source transparency** - See which tools were used
- ✅ **Comprehensive answers** - AI combines multiple data sources
- ✅ **Knowledge integration** - References research reports

### For You:
- ✅ **Extensible** - Easy to add new tools
- ✅ **Observable** - Track which tools are used
- ✅ **Efficient** - Parallel tool execution
- ✅ **Smart caching** - Reuse recent data
- ✅ **Error resilient** - Continues even if one tool fails

---

**Ready to implement Phase 0?** This gives you the agentic chat foundation, then we can add CMC, knowledge base, and workflows on top!
